import "server-only"

import {
  getComposioClient,
  getComposioUserId,
  listComposioConnectedAccounts,
} from "@/lib/integrations/composio"

type ComposioChatToolResult =
  | {
      ok: true
      provider: "google-sheets"
      operation: "search" | "append-row"
      summary: string
      data: unknown
    }
  | {
      ok: false
      provider: "google-sheets"
      operation: "search" | "append-row"
      summary: string
      error: string
    }

type SheetLookup = {
  id: string
  name?: string
  url?: string
}

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
  const composio = getComposioClient()
  const composioUserId = getComposioUserId(input.workspaceId, input.userId)
  const connectedAccounts = await listComposioConnectedAccounts({
    workspaceId: input.workspaceId,
    userId: input.userId,
    toolkit: "googlesheets",
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
    toolkits: ["googlesheets"],
    connectedAccounts: {
      googlesheets: activeAccount.id,
    },
    manageConnections: false,
  })

  return {
    ok: true as const,
    session,
    activeAccount,
  }
}

export async function runComposioChatTool(input: {
  workspaceId: string
  userId: string
  content: string
}): Promise<ComposioChatToolResult | null> {
  const shouldSearch = mentionsGoogleSheets(input.content) && asksToSearchOrList(input.content)
  const shouldAppend = asksToAppendRow(input.content)

  if (!shouldSearch && !shouldAppend) {
    return null
  }

  try {
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
      "Tell the user the real issue briefly. Do not pretend you searched the app successfully.",
    ].join("\n")
  }

  return [
    "A connected app tool was executed successfully. Use this live result to answer the user.",
    `Provider: ${result.provider}`,
    `Operation: ${result.operation}`,
    `Summary: ${result.summary}`,
    "Raw tool result:",
    stringifyForModel(result.data),
    "Answer from the live tool result. Do not say you are unable to access Google Sheets.",
  ].join("\n")
}
