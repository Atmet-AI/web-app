import "server-only"

import {
  getComposioClient,
  getComposioUserId,
  listComposioConnectedAccounts,
} from "@/lib/integrations/composio"
import { getOpenAIClient } from "@/lib/openai"

type ConnectedAppProvider =
  | "gmail"
  | "google-contacts"
  | "telegram"
  | "github"
  | "instagram"
  | "google-calendar"
  | "google-drive"
  | "google-sheets"
  | "google-docs"
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
  provider: ConnectedAppProvider
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

type ContextMessage = {
  role: "system" | "user" | "assistant"
  content: string
}

const COMPOSIO_TOOL_SEARCH_QUERY_MAX_LENGTH = 900
const DEFAULT_TIME_ZONE = process.env.ATMET_DEFAULT_TIME_ZONE ?? "Asia/Amman"

const GENERIC_CONNECTED_APPS: GenericConnectedApp[] = [
  {
    provider: "google-contacts",
    toolkit: "googlecontacts",
    label: "Google Contacts",
    aliases: [
      /\bgoogle\s*contacts?\b/i,
      /\bgmail\s*contacts?\b/i,
      /\bcontacts?\b/i,
      /\baddress\s*book\b/i,
    ],
  },
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
    provider: "github",
    toolkit: "github",
    label: "GitHub",
    aliases: [
      /\bgithub\b/i,
      /\bpull\s*request(s)?\b/i,
      /\bPRs?\b/,
      /\bissues?\b/i,
      /\brepositor(y|ies)\b/i,
      /\bbranches?\b/i,
      /\bcommits?\b/i,
      /\bworkflow\s*runs?\b/i,
      /\bgit\b/i,
    ],
  },
  {
    provider: "instagram",
    toolkit: "instagram",
    label: "Instagram",
    aliases: [
      /\binstagram\b/i,
      /\big\b/i,
      /\breels?\b/i,
      /\bstor(y|ies)\b/i,
      /\bIG\s*comments?\b/i,
      /\binstagram\s*messages?\b/i,
    ],
  },
  {
    provider: "google-calendar",
    toolkit: "googlecalendar",
    label: "Google Calendar",
    aliases: [
      /\bgoogle\s*calendar\b/i,
      /\bcalendar\b/i,
      /\bevents?\b/i,
      /\bmeetings?\b/i,
    ],
  },
  {
    provider: "google-sheets",
    toolkit: "googlesheets",
    label: "Google Sheets",
    aliases: [
      /\bgoogle\s*sheets?\b/i,
      /\bsheets?\b/i,
      /\bspreadsheet(s)?\b/i,
      /\bworksheet(s)?\b/i,
    ],
  },
  {
    provider: "google-drive",
    toolkit: "googledrive",
    label: "Google Drive",
    aliases: [/\bgoogle\s*drive\b/i, /\bgdrive\b/i, /\bdrive\s+file(s)?\b/i],
  },
  {
    provider: "google-docs",
    toolkit: "googledocs",
    label: "Google Docs",
    aliases: [/\bgoogle\s*doc(s)?\b/i, /\bdoc(s|ument|uments)?\b/i],
  },
  {
    provider: "chatgpt",
    toolkit: "openai",
    label: "ChatGPT/OpenAI",
    aliases: [
      /\bchatgpt\b/i,
      /\bopenai\b/i,
      /\bgpt\b/i,
      /\bvector\s*store(s)?\b/i,
    ],
  },
]

function mentionsGoogleSheets(content: string) {
  return /\b(google\s*sheets?|sheets?|spreadsheet|spreadsheets|worksheet)\b/i.test(
    content
  )
}

function asksToSearchOrList(content: string) {
  return /\b(search|find|list|show|get|last|recent|used|opened|modified)\b/i.test(
    content
  )
}

function asksToAppendRow(content: string) {
  return (
    /\b(add|append|insert|create|write)\b/i.test(content) &&
    /\b(record|row|entry|line|data)\b/i.test(content)
  )
}

function asksToAddColumn(content: string) {
  return (
    /\b(column|columns)\b/i.test(content) &&
    /\b(add|append|insert|create|write|update|set|new|random)\b/i.test(content)
  )
}

function asksToEditSheetGrid(content: string) {
  return (
    /\b(column|columns|row|rows|cell|cells|range|header|heading)\b/i.test(
      content
    ) &&
    /\b(add|append|insert|create|write|update|set|new|called|named|change)\b/i.test(
      content
    )
  )
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

function compactForComposioLimit(
  value: string,
  maxLength = COMPOSIO_TOOL_SEARCH_QUERY_MAX_LENGTH
) {
  const compacted = value.replace(/\s+/g, " ").trim()
  if (compacted.length <= maxLength) return compacted

  return compacted.slice(0, maxLength - 3).trimEnd() + "..."
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

function cleanSpreadsheetTargetName(value: string | null | undefined) {
  const cleaned = (value ?? "")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[*`]/g, "")
    .replace(/^[\s"'.,:;-]+|[\s"'.,:;-]+$/g, "")
    .replace(
      /^(?:try\s+(?:for\s+)?|for\s+)?(?:this\s+)?(?:one|sheet|spreadsheet)\s+/i,
      ""
    )
    .replace(/^(?:the|a|an)\s+/i, "")
    .replace(/\s+(?:google\s*)?(?:sheet|spreadsheet)$/i, "")
    .trim()

  return cleaned.length >= 2 ? cleaned : null
}

function extractSpreadsheetName(content: string) {
  const explicitQuoted = content.match(
    /\b(?:try\s+for|in|into|to|inside|for)\s+(?:this\s+)?(?:one|sheet|spreadsheet)?\s*["“”']([^"“”']{2,})["“”']/i
  )
  if (explicitQuoted?.[1]) return cleanSpreadsheetTargetName(explicitQuoted[1])

  const quotedMatches = Array.from(
    content.matchAll(/["“”']([^"“”']{2,})["“”']/g)
  ).filter(
    (match) =>
      !/\b(?:called|named|name)\s*$/i.test(
        content.slice(0, match.index).slice(-24)
      )
  )
  const quoted = quotedMatches[0]
  if (quoted?.[1]) return cleanSpreadsheetTargetName(quoted[1])

  const explicitTarget = content.match(
    /\b(?:try\s+for|in|into|to|inside|for)\s+(?:this\s+)?(?:one|sheet|spreadsheet)?\s*([^?.!\n]+?)(?:\s+(?:can|please|add|append|insert|create|write|update|set)\b|$|[?.!])/i
  )
  if (explicitTarget?.[1]) return cleanSpreadsheetTargetName(explicitTarget[1])

  return null
}

function extractRequestedColumnName(content: string) {
  const named = content.match(
    /\b(?:called|named|name(?:d)?\s+as|column\s+called|column\s+named)\s+["“”']?([^"“”'?.!\n]+)["“”']?/i
  )
  if (named?.[1]) return cleanSpreadsheetTargetName(named[1])

  const column = content.match(
    /\bcolumn\s+["“”']?([A-Za-z0-9 _-]{2,})["“”']?\s*$/i
  )
  return column?.[1] ? cleanSpreadsheetTargetName(column[1]) : null
}

function extractRequestedColumnLetter(content: string) {
  const letter = content.match(/\bcolumn\s+([a-z]{1,3})\b/i)?.[1]
  return letter ? letter.toUpperCase() : null
}

function asksToSetColumnHeader(content: string) {
  return /\b(header|heading)\b/i.test(content) && /\bcolumn\b/i.test(content)
}

function looksLikeSheetsFollowUp(content: string) {
  return (
    /\b(try|same|this\s+one|that\s+one|for\s+["“”']?|go\s+ahead|yes)\b/i.test(
      content
    ) || asksToEditSheetGrid(content)
  )
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
        url:
          typeof record.webViewLink === "string"
            ? record.webViewLink
            : undefined,
      },
    ]
  })
}

function sheetNamesFromResult(value: unknown) {
  const data = recordValue(recordValue(value)?.data)
  const sheetNames = data?.sheet_names ?? data?.sheets
  if (!Array.isArray(sheetNames)) return []
  return sheetNames.filter(
    (item): item is string => typeof item === "string" && item.trim().length > 0
  )
}

function firstHeaderRow(value: unknown) {
  const data = recordValue(recordValue(value)?.data)
  const values = data?.values
  if (!Array.isArray(values)) return []
  const firstRow = values[0]
  if (!Array.isArray(firstRow)) return []
  return firstRow.filter(
    (item): item is string => typeof item === "string" && item.trim().length > 0
  )
}

function valueRows(value: unknown) {
  const data = recordValue(recordValue(value)?.data)
  const values = data?.values
  if (!Array.isArray(values)) return []

  return values.filter((row): row is unknown[] => Array.isArray(row))
}

function randomSuffix() {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

function randomColumnValue(index: number) {
  const variants = [
    `Sample ${randomSuffix()}`,
    `Test ${index}`,
    String(Math.floor(Math.random() * 9000) + 1000),
    new Date().toISOString().slice(0, 10),
  ]
  return variants[index % variants.length]
}

function columnName(index: number) {
  let value = index
  let name = ""

  while (value > 0) {
    const remainder = (value - 1) % 26
    name = String.fromCharCode(65 + remainder) + name
    value = Math.floor((value - 1) / 26)
  }

  return name
}

function valueForHeader(header: string, index: number) {
  const normalized = header.toLowerCase()
  if (/\b(coupon|code|promo)\b/.test(normalized))
    return `ATMET-${randomSuffix()}`
  if (/\b(vendor|brand|company|store)\b/.test(normalized)) return "Atmet Test"
  if (/\b(type|category|status)\b/.test(normalized)) return "Test"
  if (/\b(name|person|influencer|owner)\b/.test(normalized)) return "Atmet"
  if (/\b(email)\b/.test(normalized)) return "test@atmet.local"
  if (/\b(date|time|created|updated)\b/.test(normalized))
    return new Date().toISOString()
  if (/\b(url|link|website)\b/.test(normalized)) return "https://atmetai.com"
  if (/\b(note|description|comment)\b/.test(normalized))
    return "Random test record created by Atmet"
  return index === 0 ? `Atmet test ${randomSuffix()}` : "Test"
}

function buildRandomRow(headers: string[]) {
  if (headers.length === 0) {
    return [
      `Atmet test ${randomSuffix()}`,
      "Random test record created by Atmet",
      new Date().toISOString(),
    ]
  }

  return headers.map((header, index) => valueForHeader(header, index))
}

function buildRandomColumn(
  existingRows: unknown[][],
  requestedHeader?: string | null
) {
  const maxUsedColumns = Math.max(0, ...existingRows.map((row) => row.length))
  const rowCount = Math.max(existingRows.length, 10)
  const nextColumnIndex = Math.max(maxUsedColumns + 1, 1)
  const nextColumn = columnName(nextColumnIndex)
  const header = requestedHeader?.trim() || `Atmet Random ${randomSuffix()}`
  const values = Array.from({ length: rowCount }, (_, index) => [
    index === 0 ? header : randomColumnValue(index),
  ])

  return {
    nextColumn,
    header,
    values,
  }
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
      error: statusList
        ? `Composio account status: ${statusList}`
        : "No active connection",
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
  return (
    GENERIC_CONNECTED_APPS.find((app) =>
      app.aliases.some((alias) => alias.test(content))
    ) ?? null
  )
}

function looksLikeConnectedAppFollowUp(content: string) {
  return (
    /\b(subject|body|to|recipient|message|send it|go ahead|yes|default|timezone|time\s*zone|chat id|chat_id|file|folder|label|thread|reply|duration|calendar|meeting|event|attendee|invitee|today|tomorrow)\b/i.test(
      content
    ) ||
    /^\s*(?:\d+\s*[-.)]\s*.+){2,}/m.test(content)
  )
}

function looksLikeTriggerAutomationRequest(content: string) {
  return (
    /\b(when|whenever|every\s+time|trigger|watch|listen|monitor|on\s+new|received|arrives?|incoming)\b/i.test(
      content
    ) &&
    /\b(workflow|automation|automate|agent|then|if|reply|send|label|add|create|notify|message|email)\b/i.test(
      content
    )
  )
}

function buildToolRequestContent(
  content: string,
  contextMessages?: ContextMessage[]
) {
  const recentContext = (contextMessages ?? [])
    .slice(-8)
    .map((message) => `${message.role}: ${message.content}`)
    .join("\n")

  const gmailIds = Array.from(
    new Set(
      Array.from(
        recentContext.matchAll(
          /mail\.google\.com\/mail\/[^\s)]*?#\w+\/([a-f0-9]{12,})/gi
        )
      )
        .map((match) => match[1])
        .filter((id): id is string => Boolean(id))
    )
  )

  if (!recentContext) {
    return [
      `Current date/time: ${new Date().toISOString()}`,
      `Default workspace timezone when the user does not specify one: ${DEFAULT_TIME_ZONE}`,
      "",
      "Latest user message:",
      content,
    ].join("\n")
  }

  return [
    `Current date/time: ${new Date().toISOString()}`,
    `Default workspace timezone when the user does not specify one: ${DEFAULT_TIME_ZONE}`,
    "",
    "Recent conversation context:",
    recentContext,
    ...(gmailIds.length > 0
      ? ["", `Detected recent Gmail message/thread ids: ${gmailIds.join(", ")}`]
      : []),
    "",
    "Latest user message:",
    content,
  ].join("\n")
}

function latestUserMessageFromToolRequest(content: string) {
  const latest = content
    .match(/Latest user message:\s*([\s\S]+)$/i)?.[1]
    ?.trim()
  return latest && latest.length > 0 ? latest : content
}

function buildComposioToolSearchQuery(
  content: string,
  app: GenericConnectedApp
) {
  const latestUserMessage = latestUserMessageFromToolRequest(content)
  const searchIntent = `${app.label}: ${latestUserMessage}`

  return compactForComposioLimit(searchIntent)
}

function sanitizeComposioToolArguments(args: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(args).map(([key, value]) => {
      const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, "")
      if (
        typeof value === "string" &&
        (normalizedKey === "usecase" ||
          normalizedKey === "query" ||
          normalizedKey === "searchquery")
      ) {
        return [key, compactForComposioLimit(value)]
      }

      return [key, value]
    })
  )
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

function rankToolSchemaForRequest(schema: ToolSchema, content: string) {
  const slug = schema.toolSlug ?? ""
  const text = `${slug} ${schema.description ?? ""}`.toLowerCase()
  const request = content.toLowerCase()
  let score = 0

  if (/\b(calendar|meeting|event|schedule|appointment)\b/.test(request)) {
    if (/googlecalendar/.test(text)) score += 3
    if (/\b(create|quick_add|insert)\b/.test(text)) score += 5
    if (/\b(list|find|search|get)\b/.test(text)) score += 4
    if (/\b(free|busy|slots)\b/.test(text)) score += 3
    if (/\bwatch|acl|delete|clear|remove\b/.test(text)) score -= 4
  }

  if (/\b(send|compose|reply|email)\b/.test(request) && /\bgmail\b/.test(text)) {
    if (/\b(send|reply|draft)\b/.test(text)) score += 5
    if (/\bdelete|trash\b/.test(text)) score -= 4
  }

  if (/\b(file|folder|drive|document)\b/.test(request)) {
    if (/\b(search|list|find|get)\b/.test(text)) score += 4
  }

  return score
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
          'Return only JSON with this shape: {"execute":boolean,"toolSlug":string|null,"arguments":object,"reason":string,"question":string|null}.',
          "Use only the provided tool schemas. Do not invent tool names or fields.",
          "If a required target is missing, set execute=false and put a short question in question.",
          "For destructive actions like delete, trash, revoke, remove, or permanent changes, execute only when the user explicitly names the target and asks for that destructive action.",
          "For send/post/create/update/read/search/list actions, execute when the request contains enough required fields.",
          "When the request contains labeled fields like To, Subject, Body, Recipient, Message, File, or Query, copy those values directly into the matching schema arguments.",
          "For Gmail send actions, normalize the recipient into a plain email address with no quotes, spaces, or trailing punctuation.",
          "Gmail is for email messages. Google Contacts is for saved contacts and address book requests.",
          "For Gmail follow-up requests like 'reply to this email', use the most recent Gmail message, thread, or mail.google.com URL identifier from the conversation context as the target when the schema needs a message or thread id.",
          "If the user asks to reply and the recent Gmail context contains an email subject, sender, Gmail URL, or message identifier, do not ask the user to provide the id again.",
          `For Google Calendar, use calendar_id or calendarId "primary" when the user says primary/default calendar. Use timezone "${DEFAULT_TIME_ZONE}" unless the user specifies another timezone.`,
          "For Google Calendar event creation, prefer QUICK_ADD when the schema is available and the user gave a natural-language meeting request. Include attendee email, date/time, duration, title, and timezone in the quick-add text.",
          "For Google Calendar list/search requests like today's meetings, use the current date/time from context to build time_min/time_max or timeMin/timeMax for that day.",
          "For Google Calendar follow-up answers with numbered fields, combine them with the earlier calendar request in the conversation context and execute when title, date/time, attendee, duration, and calendar are known.",
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

  const searchQuery = buildComposioToolSearchQuery(input.content, input.app)
  const search = await connected.session.search({
    query: searchQuery,
    toolkits: [input.app.toolkit],
  })
  const schemas = Object.values(
    (recordValue(search)?.toolSchemas ?? {}) as Record<string, ToolSchema>
  )
    .filter(
      (schema) =>
        schema?.toolSlug && schema.hasFullSchema !== false && schema.inputSchema
    )
    .sort(
      (left, right) =>
        rankToolSchemaForRequest(right, input.content) -
        rankToolSchemaForRequest(left, input.content)
    )
    .slice(0, 10)

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
      summary:
        plan.reason ??
        `Atmet needs more information before using ${input.app.label}.`,
      error:
        plan.question ??
        "The request did not include enough information to execute safely.",
    }
  }

  const planArguments = sanitizeComposioToolArguments(plan.arguments ?? {})
  const result = await connected.session.execute(plan.toolSlug, planArguments)

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
      args: planArguments,
      plannerReason: plan.reason ?? null,
      result: result.data,
    },
  }
}

export async function runComposioChatTool(input: {
  workspaceId: string
  userId: string
  content: string
  contextMessages?: ContextMessage[]
}): Promise<ComposioChatToolResult | null> {
  if (looksLikeTriggerAutomationRequest(input.content)) {
    return null
  }

  const toolRequestContent = buildToolRequestContent(
    input.content,
    input.contextMessages
  )
  const currentMentionsSheets = mentionsGoogleSheets(input.content)
  const sheetsFollowUp =
    !currentMentionsSheets &&
    looksLikeSheetsFollowUp(input.content) &&
    mentionsGoogleSheets(toolRequestContent)
  const sheetsIntentContent = currentMentionsSheets
    ? input.content
    : toolRequestContent
  const shouldSearch =
    currentMentionsSheets && asksToSearchOrList(input.content)
  const shouldAppend =
    (currentMentionsSheets && asksToAppendRow(input.content)) ||
    (sheetsFollowUp && asksToAppendRow(toolRequestContent))
  const shouldAddColumn =
    (currentMentionsSheets && asksToAddColumn(input.content)) ||
    (sheetsFollowUp && asksToAddColumn(toolRequestContent))
  const currentGenericApp = detectGenericConnectedApp(input.content)
  const genericApp =
    currentGenericApp ??
    (looksLikeConnectedAppFollowUp(input.content)
      ? detectGenericConnectedApp(toolRequestContent)
      : null)

  if (!shouldSearch && !shouldAppend && !shouldAddColumn && !genericApp) {
    return null
  }

  try {
    if (!shouldSearch && !shouldAppend && !shouldAddColumn && genericApp) {
      return await runGenericComposioAppTool({
        workspaceId: input.workspaceId,
        userId: input.userId,
        content: toolRequestContent,
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
        operation: shouldAddColumn
          ? "add-column"
          : shouldAppend
            ? "append-row"
            : "search",
        summary:
          "Google Sheets is mentioned, but Composio does not report an active Google Sheets connection for this workspace user yet.",
        error: sheets.error,
      }
    }

    if (shouldAddColumn) {
      const targetContent =
        extractSpreadsheetId(input.content) ||
        extractSpreadsheetName(input.content)
          ? input.content
          : sheetsIntentContent
      const spreadsheetId = extractSpreadsheetId(targetContent)
      const spreadsheetName = extractSpreadsheetName(targetContent)
      const requestedColumnName =
        extractRequestedColumnName(input.content) ??
        extractRequestedColumnName(sheetsIntentContent)
      const requestedColumnLetter =
        extractRequestedColumnLetter(input.content) ??
        extractRequestedColumnLetter(sheetsIntentContent)

      if (!spreadsheetId && !spreadsheetName) {
        return {
          ok: false,
          provider: "google-sheets",
          operation: "add-column",
          summary:
            "A Google Sheets column edit was requested, but no spreadsheet name or URL was provided.",
          error: "Ask the user for the spreadsheet name or URL before writing.",
        }
      }

      let target: SheetLookup | null = spreadsheetId
        ? { id: spreadsheetId }
        : null
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
          operation: "add-column",
          summary:
            "A Google Sheets column edit was requested, but the target spreadsheet could not be found.",
          error: spreadsheetName
            ? `No spreadsheet matched "${spreadsheetName}".`
            : "No spreadsheet matched the provided target.",
        }
      }

      const namesResult = await sheets.session.execute(
        "GOOGLESHEETS_GET_SHEET_NAMES",
        {
          spreadsheet_id: target.id,
          exclude_hidden: true,
        }
      )
      const sheetNames = sheetNamesFromResult(namesResult)
      const firstSheetName = sheetNames[0]

      if (!firstSheetName) {
        return {
          ok: false,
          provider: "google-sheets",
          operation: "add-column",
          summary:
            "The target spreadsheet was found, but no writable sheet tab was discovered.",
          error: "No sheet names were returned.",
        }
      }

      if (requestedColumnLetter && asksToSetColumnHeader(sheetsIntentContent)) {
        if (!requestedColumnName) {
          return {
            ok: false,
            provider: "google-sheets",
            operation: "set-column-header",
            summary:
              "A Google Sheets column header edit was requested, but no header name was provided.",
            error: "Ask the user what header name to write.",
          }
        }

        const range = `${firstSheetName}!${requestedColumnLetter}1:${requestedColumnLetter}1`
        const updateResult = await sheets.session.execute(
          "GOOGLESHEETS_UPDATE_VALUES_BATCH",
          {
            spreadsheet_id: target.id,
            valueInputOption: "USER_ENTERED",
            includeValuesInResponse: true,
            data: [
              {
                range,
                majorDimension: "ROWS",
                values: [[requestedColumnName]],
              },
            ],
          }
        )

        if (updateResult.error) {
          return {
            ok: false,
            provider: "google-sheets",
            operation: "set-column-header",
            summary:
              "Google Sheets header update ran but Composio returned an error.",
            error: updateResult.error,
          }
        }

        return {
          ok: true,
          provider: "google-sheets",
          operation: "set-column-header",
          summary: `Column ${requestedColumnLetter} header was set to "${requestedColumnName}" in the target Google Sheet through Composio.`,
          data: {
            tool: "GOOGLESHEETS_UPDATE_VALUES_BATCH",
            connectedAccountId: sheets.activeAccount.id,
            spreadsheet: target,
            sheetName: firstSheetName,
            range,
            header: requestedColumnName,
            searchResult,
            sheetNames,
            result: updateResult.data,
          },
        }
      }

      const existingValuesResult = await sheets.session.execute(
        "GOOGLESHEETS_VALUES_GET",
        {
          spreadsheet_id: target.id,
          range: `${firstSheetName}!A1:ZZ1000`,
        }
      )
      const existingRows = valueRows(existingValuesResult)
      const randomColumn = buildRandomColumn(existingRows, requestedColumnName)
      const range = `${firstSheetName}!${randomColumn.nextColumn}1:${randomColumn.nextColumn}${randomColumn.values.length}`
      const updateResult = await sheets.session.execute(
        "GOOGLESHEETS_UPDATE_VALUES_BATCH",
        {
          spreadsheet_id: target.id,
          valueInputOption: "USER_ENTERED",
          includeValuesInResponse: true,
          data: [
            {
              range,
              majorDimension: "ROWS",
              values: randomColumn.values,
            },
          ],
        }
      )

      if (updateResult.error) {
        return {
          ok: false,
          provider: "google-sheets",
          operation: "add-column",
          summary:
            "Google Sheets column update ran but Composio returned an error.",
          error: updateResult.error,
        }
      }

      return {
        ok: true,
        provider: "google-sheets",
        operation: "add-column",
        summary: requestedColumnName
          ? `A column named "${requestedColumnName}" was added to the target Google Sheet through Composio.`
          : "A random column was added to the target Google Sheet through Composio.",
        data: {
          tool: "GOOGLESHEETS_UPDATE_VALUES_BATCH",
          connectedAccountId: sheets.activeAccount.id,
          spreadsheet: target,
          sheetName: firstSheetName,
          range,
          header: randomColumn.header,
          values: randomColumn.values,
          searchResult,
          sheetNames,
          result: updateResult.data,
        },
      }
    }

    if (shouldAppend) {
      const targetContent =
        extractSpreadsheetId(input.content) ||
        extractSpreadsheetName(input.content)
          ? input.content
          : sheetsIntentContent
      const spreadsheetId = extractSpreadsheetId(targetContent)
      const spreadsheetName = extractSpreadsheetName(targetContent)

      if (!spreadsheetId && !spreadsheetName) {
        return {
          ok: false,
          provider: "google-sheets",
          operation: "append-row",
          summary:
            "A Google Sheets append was requested, but no spreadsheet name or URL was provided.",
          error: "Ask the user for the spreadsheet name or URL before writing.",
        }
      }

      let target: SheetLookup | null = spreadsheetId
        ? { id: spreadsheetId }
        : null
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
          summary:
            "A Google Sheets append was requested, but the target spreadsheet could not be found.",
          error: spreadsheetName
            ? `No spreadsheet matched "${spreadsheetName}".`
            : "No spreadsheet matched the provided target.",
        }
      }

      const namesResult = await sheets.session.execute(
        "GOOGLESHEETS_GET_SHEET_NAMES",
        {
          spreadsheet_id: target.id,
          exclude_hidden: true,
        }
      )
      const sheetNames = sheetNamesFromResult(namesResult)
      const firstSheetName = sheetNames[0]

      if (!firstSheetName) {
        return {
          ok: false,
          provider: "google-sheets",
          operation: "append-row",
          summary:
            "The target spreadsheet was found, but no writable sheet tab was discovered.",
          error: "No sheet names were returned.",
        }
      }

      const headersResult = await sheets.session.execute(
        "GOOGLESHEETS_VALUES_GET",
        {
          spreadsheet_id: target.id,
          range: `${firstSheetName}!A1:Z1`,
        }
      )
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
        summary:
          "A row was appended to the target Google Sheet through Composio.",
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

    const args = buildSearchArgs(sheetsIntentContent)
    const result = await sheets.session.execute(
      "GOOGLESHEETS_SEARCH_SPREADSHEETS",
      args
    )

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
    const provider = genericApp?.provider ?? "google-sheets"
    return {
      ok: false,
      provider,
      operation: genericApp
        ? "connected-app"
        : asksToAddColumn(input.content)
          ? "add-column"
          : asksToAppendRow(input.content)
            ? "append-row"
            : "search",
      summary: genericApp
        ? `${genericApp.label} request could not be completed through Composio.`
        : "Google Sheets request could not be completed through Composio.",
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
