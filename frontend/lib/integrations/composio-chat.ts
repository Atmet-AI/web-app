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
      summary: string
      data: unknown
    }
  | {
      ok: false
      provider: "google-sheets"
      summary: string
      error: string
    }

function mentionsGoogleSheets(content: string) {
  return /\b(google\s*sheets?|sheets?|spreadsheet|spreadsheets|worksheet)\b/i.test(content)
}

function asksToSearchOrList(content: string) {
  return /\b(search|find|list|show|get|last|recent|used|opened|modified)\b/i.test(content)
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

function stringifyForModel(value: unknown) {
  return JSON.stringify(value, null, 2).slice(0, 12000)
}

export async function runComposioChatTool(input: {
  workspaceId: string
  userId: string
  content: string
}): Promise<ComposioChatToolResult | null> {
  if (!mentionsGoogleSheets(input.content) || !asksToSearchOrList(input.content)) {
    return null
  }

  try {
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
        ok: false,
        provider: "google-sheets",
        summary:
          "Google Sheets is mentioned, but Composio does not report an active Google Sheets connection for this workspace user yet.",
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

    const args = buildSearchArgs(input.content)
    const result = await session.execute("GOOGLESHEETS_SEARCH_SPREADSHEETS", args)

    if (result.error) {
      return {
        ok: false,
        provider: "google-sheets",
        summary: "Google Sheets search ran but Composio returned an error.",
        error: result.error,
      }
    }

    return {
      ok: true,
      provider: "google-sheets",
      summary:
        "Live Google Sheets search completed through the user's connected Composio account.",
      data: {
        tool: "GOOGLESHEETS_SEARCH_SPREADSHEETS",
        connectedAccountId: activeAccount.id,
        args,
        result: result.data,
      },
    }
  } catch (error) {
    return {
      ok: false,
      provider: "google-sheets",
      summary: "Google Sheets search could not be completed through Composio.",
      error: error instanceof Error ? error.message : "Unknown Composio error",
    }
  }
}

export function buildComposioToolContext(result: ComposioChatToolResult) {
  if (!result.ok) {
    return [
      "A connected app tool was attempted, but it failed.",
      `Provider: ${result.provider}`,
      `Summary: ${result.summary}`,
      `Error: ${result.error}`,
      "Tell the user the real issue briefly. Do not pretend you searched the app successfully.",
    ].join("\n")
  }

  return [
    "A connected app tool was executed successfully. Use this live result to answer the user.",
    `Provider: ${result.provider}`,
    `Summary: ${result.summary}`,
    "Raw tool result:",
    stringifyForModel(result.data),
    "Answer from the live tool result. Do not say you are unable to access Google Sheets.",
  ].join("\n")
}
