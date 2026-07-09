import { INTEGRATIONS_CATALOG } from "@/lib/integrations-catalog"
import { hasAppInConversation, hasExplicitAppMention } from "@/lib/integrations/app-approval"

export type AppMiniUiField = {
  id: string
  label: string
  type: "text" | "textarea" | "select"
  placeholder?: string
  value?: string
  required?: boolean
  options?: string[]
}

export type AppMiniUiRequest = {
  type: "app_mini_ui"
  appName: string
  appSlug: string
  variant: "gmail-compose" | "google-sheets-create" | "google-drive-search"
  title: string
  description: string
  originalRequest: string
  submitLabel: string
  fields: AppMiniUiField[]
}

const MINI_UI_PREFIX = "::ATMET_APP_MINI_UI::"

function appEnabled(input: {
  content: string
  conversationMessages: Array<{ content: string }>
  appName: string
}) {
  return (
    hasExplicitAppMention(input.content, input.appName) ||
    hasAppInConversation(input.conversationMessages, input.appName)
  )
}

function stripAppMentions(content: string) {
  return content.replace(/(^|\s)@[A-Za-z][A-Za-z0-9 &_-]+(?=\s|$|[.,!?;:])/g, " ").trim()
}

function extractEmail(content: string) {
  return content.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? ""
}

function extractLabeledValue(content: string, label: string) {
  const match = content.match(
    new RegExp(`\\b${label}\\s*:\\s*([\\s\\S]+?)(?=\\n\\s*(?:subject|body|message|to)\\s*:|$)`, "i")
  )
  return match?.[1]?.trim() ?? ""
}

function extractQuotedAfter(content: string, words: string[]) {
  const pattern = new RegExp(`\\b(?:${words.join("|")})\\s+["“”']([^"“”']+)["“”']`, "i")
  return content.match(pattern)?.[1]?.trim() ?? ""
}

function extractHeaders(content: string) {
  const explicit = extractLabeledValue(content, "headers?")
  if (explicit) return explicit

  const match = content.match(/\b(?:with|contains?|including)\s+(?:these\s+)?headers?\s*:?\s*([\s\S]+)$/i)
  return match?.[1]?.trim() ?? ""
}

function connectedCatalogApp(slug: string) {
  return INTEGRATIONS_CATALOG.find((integration) => integration.slug === slug) ?? null
}

export function serializeAppMiniUiRequest(request: AppMiniUiRequest) {
  return `${MINI_UI_PREFIX}${JSON.stringify(request)}`
}

export function parseAppMiniUiRequest(content: string): AppMiniUiRequest | null {
  if (!content.startsWith(MINI_UI_PREFIX)) return null

  try {
    const parsed = JSON.parse(content.slice(MINI_UI_PREFIX.length)) as Partial<AppMiniUiRequest>
    if (
      parsed.type !== "app_mini_ui" ||
      typeof parsed.appName !== "string" ||
      typeof parsed.appSlug !== "string" ||
      typeof parsed.variant !== "string" ||
      typeof parsed.title !== "string" ||
      typeof parsed.description !== "string" ||
      typeof parsed.originalRequest !== "string" ||
      typeof parsed.submitLabel !== "string" ||
      !Array.isArray(parsed.fields)
    ) {
      return null
    }

    return parsed as AppMiniUiRequest
  } catch {
    return null
  }
}

export function detectAppMiniUiRequest(input: {
  content: string
  conversationMessages: Array<{ content: string }>
}): AppMiniUiRequest | null {
  const content = input.content.trim()
  const normalized = stripAppMentions(content)

  const gmail = connectedCatalogApp("gmail")
  if (
    gmail &&
    appEnabled({ ...input, appName: gmail.name }) &&
    /\b(send|compose|write)\b/i.test(normalized) &&
    /\b(email|mail|message)\b/i.test(normalized)
  ) {
    const to = extractLabeledValue(normalized, "to") || extractEmail(normalized)
    const subject = extractLabeledValue(normalized, "subject")
    const body = extractLabeledValue(normalized, "body") || extractLabeledValue(normalized, "message")

    if (!to || !subject || !body) {
      return {
        type: "app_mini_ui",
        appName: gmail.name,
        appSlug: gmail.slug,
        variant: "gmail-compose",
        title: "Complete email details",
        description: "Fill the missing fields before Atmet sends from Gmail.",
        originalRequest: content,
        submitLabel: "Send email",
        fields: [
          { id: "to", label: "To", type: "text", placeholder: "name@example.com", value: to, required: true },
          { id: "subject", label: "Subject", type: "text", placeholder: "Email subject", value: subject, required: true },
          { id: "body", label: "Body", type: "textarea", placeholder: "Write the email message", value: body, required: true },
        ],
      }
    }
  }

  const sheets = connectedCatalogApp("google-sheets")
  if (
    sheets &&
    appEnabled({ ...input, appName: sheets.name }) &&
    /\b(create|new|make)\b/i.test(normalized) &&
    /\b(sheet|spreadsheet)\b/i.test(normalized)
  ) {
    const title = extractQuotedAfter(normalized, ["called", "named", "titled"]) || extractLabeledValue(normalized, "title")
    const headers = extractHeaders(normalized)

    if (!title || !headers) {
      return {
        type: "app_mini_ui",
        appName: sheets.name,
        appSlug: sheets.slug,
        variant: "google-sheets-create",
        title: "Create Google Sheet",
        description: "Name the spreadsheet and add the headers Atmet should create.",
        originalRequest: content,
        submitLabel: "Create sheet",
        fields: [
          { id: "title", label: "Sheet name", type: "text", placeholder: "Leads tracker", value: title, required: true },
          { id: "headers", label: "Headers", type: "text", placeholder: "Name, Email, Status", value: headers, required: true },
        ],
      }
    }
  }

  const drive = connectedCatalogApp("google-drive")
  if (
    drive &&
    appEnabled({ ...input, appName: drive.name }) &&
    /\b(search|find|show|list|get)\b/i.test(normalized) &&
    /\b(file|files|folder|folders|drive)\b/i.test(normalized)
  ) {
    const query = extractLabeledValue(normalized, "query") || extractQuotedAfter(normalized, ["called", "named"])

    if (!query && !/\b(all|recent|latest)\b/i.test(normalized)) {
      return {
        type: "app_mini_ui",
        appName: drive.name,
        appSlug: drive.slug,
        variant: "google-drive-search",
        title: "Search Google Drive",
        description: "Choose what Atmet should look for in Drive.",
        originalRequest: content,
        submitLabel: "Search Drive",
        fields: [
          { id: "query", label: "Search", type: "text", placeholder: "Folder or file name", value: query, required: true },
          { id: "itemType", label: "Type", type: "select", value: "files and folders", options: ["files and folders", "files", "folders"] },
        ],
      }
    }
  }

  return null
}
