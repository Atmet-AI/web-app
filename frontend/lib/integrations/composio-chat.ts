import "server-only"

import {
  getComposioClient,
  getComposioUserId,
  listComposioConnectedAccounts,
} from "@/lib/integrations/composio"
import { getOpenAIClient } from "@/lib/openai"

type ConnectedAppProvider =
  | "gmail"
  | "telegram"
  | "google-drive"
  | "google-sheets"
  | "chatgpt"

type ComposioChatToolResult =
  | {
      ok: true
      provider: ConnectedAppProvider
      operation: string
      summary: string
      data: unknown
    }
  | {
      ok: false
      provider: ConnectedAppProvider
      operation: string
      summary: string
      error: string
    }

type SheetLookup = {
  id: string
  name?: string
  url?: string
}

type GenericConnectedApp = {
  provider: Exclude<ConnectedAppProvider, "google-sheets">
  toolkit: string
  label: string
  aliases: RegExp[]
}

type ToolSchema = {
  toolSlug?: string
  description?: string
  hasFullSchema?: boolean
  inputSchema?: unknown
}

type ToolPlan = {
  execute?: boolean
  toolSlug?: string
  arguments?: Record<string, unknown>
  reason?: string
  question?: string
}

const GENERIC_CONNECTED_APPS: GenericConnectedApp[] = [
  {
    provider: "gmail",
    toolkit: "gmail",
    label: "Gmail",
    aliases: [/\bgmail\b/i, /\bmailbox\b/i, /\bemail(s)?\b/i],
  },
  {
    provider: "telegram",
    toolkit: "telegram",
    label: "Telegram",
    aliases: [/\btelegram\b/i],
  },
  {
    provider: "google-drive",
    toolkit: "googledrive",
    label: "Google Drive",
    aliases: [/\bgoogle\s*drive\b/i, /\bgdrive\b/i, /\bdrive\s+file(s)?\b/i, /\bgoogle\s*doc(s)?\b/i],
  },
  {
    provider: "chatgpt",
    toolkit: "openai",
    label: "ChatGPT/OpenAI",
    aliases: [/\bchatgpt\b/i, /\bopenai\b/i, /\bgpt\b/i, /\bvector\s*store(s)?\b/i],
  },
]

function mentionsGoogleSheets(content: string) {
  return /\b(google\s*sheets?|sheets?|spreadsheet|spreadsheets|worksheet)\b/i.test(content)
}

function asksToSearchOrList(content: string) {
  return /\b(search|find|list|show|get|last|recent|used|opened|modified)\b/i.test(content)
}

function asksToAppendRow(content: string) {
  return /\b(add|append|insert|create|write)\b/i.test(content) && /\b(record|row|entry|line|data)\b/i.test(content)
}

function wantsRecentSheets(content: string) {
  return /\b(last|recent|used|opened|latest)\b/i.test(content)
}

function requestedLimit(content: string) {
  const digitMatch = content.match(/\b(\d{1,2})\b/)
  if (digitMatch) return Math.min(Math.max(Number(digitMatch[1]), 1), 25)

  if (/\bfive\b/i.test(content)) return 5
  if (/\bten\b/i.test(content)) return 10
  if (/\bthree\b/i.test(content)) return 3

  return 5
}

function buildSearchArgs(content: string) {
  const isRecent = wantsRecentSheets(content)

  return {
    query: "",
    max_results: requestedLimit(content),
    search_type: "both",
    order_by: isRecent ? "viewedByMeTime desc" : "modifiedTime desc",
    include_trashed: false,
    include_shared_drives: true,
  }
}

function buildNamedSearchArgs(query: string) {
  return {
    query,
    max_results: 5,
    search_type: "name",
    include_trashed: false,
    include_shared_drives: true,
  }
}

function stringifyForModel(value: unknown) {
  return JSON.stringify(value, null, 2).slice(0, 12000)
}

function recordValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function extractSpreadsheetId(content: string) {
  const urlMatch = content.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)
  if (urlMatch?.[1]) return urlMatch[1]

  const idMatch = content.match(/\b([a-zA-Z0-9_-]{30,})\b/)
  return idMatch?.[1] ?? null
}

function extractSpreadsheetName(content: string) {
  const quoted = content.match(/["“”']([^"“”']{3,})["“”']/)
  if (quoted?.[1]) return quoted[1].trim()

  const target = content.match(/\b(?:in|into|to|inside)\s+(.+?)\s*[\?.!]*$/i)
  return target?.[1]
    ?.replace(/\b(?:google\s*sheets?|spreadsheet|sheet)\b/gi, "")
    .trim()
}

function spreadsheetsFromSearch(value: unknown): SheetLookup[] {
  const data = recordValue(recordValue(value)?.data)
  const spreadsheets = data?.spreadsheets
  if (!Array.isArray(spreadsheets)) return []

  return spreadsheets.flatMap((item): SheetLookup[] => {
    const record = recordValue(item)
    if (!record) return []
    const id = record?.id
    if (typeof id !== "string") return []
    return [
      {
        id,
        name: typeof record.name === "string" ? record.name : undefined,
        url: typeof record.webViewLink === "string" ? record.webViewLink : undefined,
      },
    ]
  })
}

function sheetNamesFromResult(value: unknown) {
  const data = recordValue(recordValue(value)?.data)
  const sheetNames = data?.sheet_names ?? data?.sheets
  if (!Array.isArray(sheetNames)) return []
  return sheetNames.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
}

function firstHeaderRow(value: unknown) {
  const data = recordValue(recordValue(value)?.data)
  const values = data?.values
  if (!Array.isArray(values)) return []
  const firstRow = values[0]
  if (!Array.isArray(firstRow)) return []
  return firstRow.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
}

function randomSuffix() {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

function valueForHeader(header: string, index: number) {
  const normalized = header.toLowerCase()
  if (/\b(coupon|code|promo)\b/.test(normalized)) return `ATMET-${randomSuffix()}`
  if (/\b(vendor|brand|company|store)\b/.test(normalized)) return "Atmet Test"
  if (/\b(type|category|status)\b/.test(normalized)) return "Test"
  if (/\b(name|person|influencer|owner)\b/.test(normalized)) return "Atmet"
  if (/\b(email)\b/.test(normalized)) return "test@atmet.local"
  if (/\b(date|time|created|updated)\b/.test(normalized)) return new Date().toISOString()
  if (/\b(url|link|website)\b/.test(normalized)) return "https://atmetai.com"
  if (/\b(note|description|comment)\b/.test(normalized)) return "Random test record created by Atmet"
  return index === 0 ? `Atmet test ${randomSuffix()}` : "Test"
}

function buildRandomRow(headers: string[]) {
  if (headers.length === 0) {
    return [`Atmet test ${randomSuffix()}`, "Random test record created by Atmet", new Date().toISOString()]
  }

  return headers.map((header, index) => valueForHeader(header, index))
}

async function getActiveSheetsSession(input: {
  workspaceId: string
  userId: string
}) {
  return getActiveComposioSession({
    ...input,
    toolkit: "googlesheets",
  })
}

async function getActiveComposioSession(input: {
  workspaceId: string
  userId: string
  toolkit: string
}) {
  const composio = getComposioClient()
  const composioUserId = getComposioUserId(input.workspaceId, input.userId)
  const connectedAccounts = await listComposioConnectedAccounts({
    workspaceId: input.workspaceId,
    userId: input.userId,
    toolkit: input.toolkit,
  })
  const activeAccount = connectedAccounts.find(
    (account) => account.status === "ACTIVE" && !account.isDisabled
  )

  if (!activeAccount) {
    const statusList = connectedAccounts
      .map((account) => account.status)
      .filter(Boolean)
      .join(", ")

    return {
      ok: false as const,
      error: statusList ? `Composio account status: ${statusList}` : "No active connection",
    }
  }

  const session = await composio.sessions.create(composioUserId, {
    toolkits: [input.toolkit],
    connectedAccounts: {
      [input.toolkit]: activeAccount.id,
    },
    manageConnections: false,
  })

  return {
    ok: true as const,
    session,
    activeAccount,
  }
}

function detectGenericConnectedApp(content: string) {
  if (mentionsGoogleSheets(content)) return null
  return GENERIC_CONNECTED_APPS.find((app) =>
    app.aliases.some((alias) => alias.test(content))
  ) ?? null
}

function parseJsonObject(content: string): Record<string, unknown> | null {
  const cleaned = content
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim()

  try {
    return recordValue(JSON.parse(cleaned))
  } catch {
    return null
  }
}

function compactToolSchema(schema: ToolSchema) {
  return {
    toolSlug: schema.toolSlug,
    description: schema.description,
    inputSchema: schema.inputSchema,
  }
}

async function planComposioToolExecution(input: {
  userRequest: string
  app: GenericConnectedApp
  schemas: ToolSchema[]
}): Promise<ToolPlan> {
  const response = await getOpenAIClient().chat.completions.create({
    model: process.env.OPENAI_MODEL ?? "gpt-4o",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: [
          "You choose one connected-app tool and build JSON arguments from the user's request.",
          "Return only JSON with this shape: {\"execute\":boolean,\"toolSlug\":string|null,\"arguments\":object,\"reason\":string,\"question\":string|null}.",
          "Use only the provided tool schemas. Do not invent tool names or fields.",
          "If a required target is missing, set execute=false and put a short question in question.",
          "For destructive actions like delete, trash, revoke, remove, or permanent changes, execute only when the user explicitly names the target and asks for that destructive action.",
          "For send/post/create/update/read/search/list actions, execute when the request contains enough required fields.",
        ].join(" "),
      },
      {
        role: "user",
        content: JSON.stringify(
          {
            app: input.app.label,
            toolkit: input.app.toolkit,
            userRequest: input.userRequest,
            toolSchemas: input.schemas.map(compactToolSchema),
          },
          null,
          2
        ),
      },
    ],
  })

  const content = response.choices[0]?.message?.content ?? "{}"
  const parsed = parseJsonObject(content)
  if (!parsed) {
    return {
      execute: false,
      reason: "The tool planner returned invalid JSON.",
      question: "Can you restate what you want me to do with this app?",
    }
  }

  return {
    execute: parsed.execute === true,
    toolSlug: typeof parsed.toolSlug === "string" ? parsed.toolSlug : undefined,
    arguments: recordValue(parsed.arguments) ?? {},
    reason: typeof parsed.reason === "string" ? parsed.reason : undefined,
    question: typeof parsed.question === "string" ? parsed.question : undefined,
  }
}

async function runGenericComposioAppTool(input: {
  workspaceId: string
  userId: string
  content: string
  app: GenericConnectedApp
}): Promise<ComposioChatToolResult> {
  const connected = await getActiveComposioSession({
    workspaceId: input.workspaceId,
    userId: input.userId,
    toolkit: input.app.toolkit,
  })

  if (!connected.ok) {
    return {
      ok: false,
      provider: input.app.provider,
      operation: "connection",
      summary: `${input.app.label} was mentioned, but there is no active ${input.app.label} connection for this workspace user yet.`,
      error: connected.error,
    }
  }

  const search = await connected.session.search({
    query: input.content,
    toolkits: [input.app.toolkit],
  })
  const schemas = Object.values((recordValue(search)?.toolSchemas ?? {}) as Record<string, ToolSchema>)
    .filter((schema) => schema?.toolSlug && schema.hasFullSchema !== false && schema.inputSchema)
    .slice(0, 6)

  if (schemas.length === 0) {
    return {
      ok: false,
      provider: input.app.provider,
      operation: "tool-discovery",
      summary: `Composio did not return an executable ${input.app.label} tool schema for this request.`,
      error: "No full tool schemas were returned.",
    }
  }

  const plan = await planComposioToolExecution({
    userRequest: input.content,
    app: input.app,
    schemas,
  })
  const allowedToolSlugs = new Set(schemas.map((schema) => schema.toolSlug))

  if (!plan.execute || !plan.toolSlug || !allowedToolSlugs.has(plan.toolSlug)) {
    return {
      ok: false,
      provider: input.app.provider,
      operation: "tool-planning",
      summary: plan.reason ?? `Atmet needs more information before using ${input.app.label}.`,
      error: plan.question ?? "The request did not include enough information to execute safely.",
    }
  }

  const result = await connected.session.execute(plan.toolSlug, plan.arguments ?? {})

  if (result.error) {
    return {
      ok: false,
      provider: input.app.provider,
      operation: plan.toolSlug,
      summary: `${input.app.label} tool execution ran but Composio returned an error.`,
      error: result.error,
    }
  }

  return {
    ok: true,
    provider: input.app.provider,
    operation: plan.toolSlug,
    summary: `${input.app.label} tool execution completed through Composio.`,
    data: {
      tool: plan.toolSlug,
      connectedAccountId: connected.activeAccount.id,
      args: plan.arguments ?? {},
      plannerReason: plan.reason ?? null,
      result: result.data,
    },
  }
}

export async function runComposioChatTool(input: {
  workspaceId: string
  userId: string
  content: string
}): Promise<ComposioChatToolResult | null> {
  const shouldSearch = mentionsGoogleSheets(input.content) && asksToSearchOrList(input.content)
  const shouldAppend = asksToAppendRow(input.content)
  const genericApp = detectGenericConnectedApp(input.content)

  if (!shouldSearch && !shouldAppend && !genericApp) {
    return null
  }

  try {
    if (!shouldSearch && !shouldAppend && genericApp) {
      return await runGenericComposioAppTool({
        workspaceId: input.workspaceId,
        userId: input.userId,
        content: input.content,
        app: genericApp,
      })
    }

    const sheets = await getActiveSheetsSession({
      workspaceId: input.workspaceId,
      userId: input.userId,
    })

    if (!sheets.ok) {
      return {
        ok: false,
        provider: "google-sheets",
        operation: shouldAppend ? "append-row" : "search",
        summary:
          "Google Sheets is mentioned, but Composio does not report an active Google Sheets connection for this workspace user yet.",
        error: sheets.error,
      }
    }

    if (shouldAppend) {
      const spreadsheetId = extractSpreadsheetId(input.content)
      const spreadsheetName = extractSpreadsheetName(input.content)

      if (!spreadsheetId && !spreadsheetName) {
        return {
          ok: false,
          provider: "google-sheets",
          operation: "append-row",
          summary: "A Google Sheets append was requested, but no spreadsheet name or URL was provided.",
          error: "Ask the user for the spreadsheet name or URL before writing.",
        }
      }

      let target: SheetLookup | null = spreadsheetId ? { id: spreadsheetId } : null
      let searchResult: unknown = null

      if (!target && spreadsheetName) {
        searchResult = await sheets.session.execute(
          "GOOGLESHEETS_SEARCH_SPREADSHEETS",
          buildNamedSearchArgs(spreadsheetName)
        )
        const matches = spreadsheetsFromSearch(searchResult)
        target = matches[0] ?? null
      }

      if (!target) {
        return {
          ok: false,
          provider: "google-sheets",
          operation: "append-row",
          summary: "A Google Sheets append was requested, but the target spreadsheet could not be found.",
          error: spreadsheetName
            ? `No spreadsheet matched "${spreadsheetName}".`
            : "No spreadsheet matched the provided target.",
        }
      }

      const namesResult = await sheets.session.execute("GOOGLESHEETS_GET_SHEET_NAMES", {
        spreadsheet_id: target.id,
        exclude_hidden: true,
      })
      const sheetNames = sheetNamesFromResult(namesResult)
      const firstSheetName = sheetNames[0]

      if (!firstSheetName) {
        return {
          ok: false,
          provider: "google-sheets",
          operation: "append-row",
          summary: "The target spreadsheet was found, but no writable sheet tab was discovered.",
          error: "No sheet names were returned.",
        }
      }

      const headersResult = await sheets.session.execute("GOOGLESHEETS_VALUES_GET", {
        spreadsheet_id: target.id,
        range: `${firstSheetName}!A1:Z1`,
      })
      const headers = firstHeaderRow(headersResult)
      const row = buildRandomRow(headers)
      const appendResult = await sheets.session.execute(
        "GOOGLESHEETS_SPREADSHEETS_VALUES_APPEND",
        {
          spreadsheetId: target.id,
          range: firstSheetName,
          valueInputOption: "USER_ENTERED",
          insertDataOption: "INSERT_ROWS",
          majorDimension: "ROWS",
          includeValuesInResponse: true,
          values: [row],
        }
      )

      if (appendResult.error) {
        return {
          ok: false,
          provider: "google-sheets",
          operation: "append-row",
          summary: "Google Sheets append ran but Composio returned an error.",
          error: appendResult.error,
        }
      }

      return {
        ok: true,
        provider: "google-sheets",
        operation: "append-row",
        summary: "A row was appended to the target Google Sheet through Composio.",
        data: {
          tool: "GOOGLESHEETS_SPREADSHEETS_VALUES_APPEND",
          connectedAccountId: sheets.activeAccount.id,
          spreadsheet: target,
          sheetName: firstSheetName,
          headers,
          appendedValues: row,
          searchResult,
          sheetNames,
          result: appendResult.data,
        },
      }
    }

    const args = buildSearchArgs(input.content)
    const result = await sheets.session.execute("GOOGLESHEETS_SEARCH_SPREADSHEETS", args)

    if (result.error) {
      return {
        ok: false,
        provider: "google-sheets",
        operation: "search",
        summary: "Google Sheets search ran but Composio returned an error.",
        error: result.error,
      }
    }

    return {
      ok: true,
      provider: "google-sheets",
      operation: "search",
      summary:
        "Live Google Sheets search completed through the user's connected Composio account.",
      data: {
        tool: "GOOGLESHEETS_SEARCH_SPREADSHEETS",
        connectedAccountId: sheets.activeAccount.id,
        args,
        result: result.data,
      },
    }
  } catch (error) {
    return {
      ok: false,
      provider: "google-sheets",
      operation: asksToAppendRow(input.content) ? "append-row" : "search",
      summary: "Google Sheets request could not be completed through Composio.",
      error: error instanceof Error ? error.message : "Unknown Composio error",
    }
  }
}

export function buildComposioToolContext(result: ComposioChatToolResult) {
  if (!result.ok) {
    return [
      "A connected app tool was attempted, but it failed.",
      `Provider: ${result.provider}`,
      `Operation: ${result.operation}`,
      `Summary: ${result.summary}`,
      `Error: ${result.error}`,
      "Tell the user the real issue briefly. If the error is a question or missing-information request, ask that question. Do not pretend the app action succeeded.",
    ].join("\n")
  }

  return [
    "A connected app tool was executed successfully. Use this live result to answer the user.",
    `Provider: ${result.provider}`,
    `Operation: ${result.operation}`,
    `Summary: ${result.summary}`,
    "Raw tool result:",
    stringifyForModel(result.data),
    "Answer from the live tool result. Do not say you are unable to access the connected app.",
  ].join("\n")
}
