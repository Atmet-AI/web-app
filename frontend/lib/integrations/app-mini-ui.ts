import { INTEGRATIONS_CATALOG } from "@/lib/integrations-catalog"
import {
  hasAppInConversation,
  hasExplicitAppMention,
} from "@/lib/integrations/app-approval"

export type AppMiniUiField = {
  id: string
  label: string
  type: "text" | "email" | "textarea" | "select" | "date" | "time" | "number"
  placeholder?: string
  value?: string
  required?: boolean
  options?: string[]
}

export type AppMiniUiRequest = {
  type: "app_mini_ui"
  appName: string
  appSlug: string
  variant:
    | "google-calendar-event"
    | "gmail-compose"
    | "google-sheets-create"
    | "google-drive-search"
    | "telegram-send-message"
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
  return content
    .replace(/\[[^\]]+\]\(app:\/\/[a-z0-9-]+\)/gi, " ")
    .replace(/(^|\s)@[A-Za-z][A-Za-z0-9 &_-]+(?=\s|$|[.,!?;:])/g, " ")
    .trim()
}

function normalizeEmailWhitespace(content: string) {
  return content.replace(
    /([A-Z0-9._%+-]+)\s*@\s*([A-Z0-9.-]+)\s*\.\s*([A-Z]{2,})/gi,
    "$1@$2.$3"
  )
}

export function cleanEmailAddress(value: string) {
  const compact = normalizeEmailWhitespace(value)
    .replace(/[<>"“”']/g, "")
    .trim()
  return compact.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? ""
}

function extractEmail(content: string) {
  return cleanEmailAddress(content)
}

function extractEmailRecipient(content: string) {
  const normalized = normalizeEmailWhitespace(content)
  return cleanEmailAddress(
    normalized.match(
      /\bto\s+["“”']?([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})["“”']?/i
    )?.[1] ?? extractEmail(normalized)
  )
}

function extractLabeledValue(content: string, label: string) {
  const match = content.match(
    new RegExp(
      `\\b${label}\\s*:\\s*([\\s\\S]+?)(?=\\n\\s*(?:subject|body|message|text|to|chat(?:_|\\s*)id|chat|channel|title|headers?|query)\\s*:|$)`,
      "i"
    )
  )
  return match?.[1]?.trim() ?? ""
}

function extractQuotedAfter(content: string, words: string[]) {
  const pattern = new RegExp(
    `\\b(?:${words.join("|")})\\s+["“”']([^"“”']+)["“”']`,
    "i"
  )
  return content.match(pattern)?.[1]?.trim() ?? ""
}

function extractNaturalEmailBody(content: string) {
  return (
    extractLabeledValue(content, "body") ||
    extractLabeledValue(content, "message") ||
    extractQuotedAfter(content, [
      "says",
      "say",
      "saying",
      "with\\s+message",
      "body",
    ]) ||
    content.match(/\b(?:says?|saying)\s+(.+?)\s*$/i)?.[1]?.trim() ||
    ""
  )
}

function extractTelegramChatId(content: string) {
  const labeled =
    extractLabeledValue(content, "chat(?:_|\\s*)id") ||
    extractLabeledValue(content, "chat") ||
    extractLabeledValue(content, "channel")
  if (labeled) return labeled.split(/\s+/)[0]?.replace(/[,.!?;:]$/, "") ?? ""

  const explicit = content.match(
    /\b(?:to|in|into)\s+(@[A-Za-z0-9_]+|-?\d{5,})\b/i
  )?.[1]
  if (explicit) return explicit

  return content.match(/\B@[A-Za-z0-9_]+\b/)?.[0] ?? ""
}

function extractTelegramMessageText(content: string) {
  return (
    extractLabeledValue(content, "text") ||
    extractLabeledValue(content, "message") ||
    extractQuotedAfter(content, ["says", "say", "saying", "text", "message"]) ||
    content
      .match(/\b(?:says?|saying|message|text)\s+(.+?)\s*$/i)?.[1]
      ?.trim() ||
    ""
  )
}

function extractNaturalEmailSubject(content: string) {
  return (
    extractLabeledValue(content, "subject") ||
    extractQuotedAfter(content, ["subject", "with\\s+subject"]) ||
    content
      .match(
        /\bsubject\s+(?:is\s+)?(.+?)(?=\s+(?:body|message|says?)\b|$)/i
      )?.[1]
      ?.trim() ||
    ""
  )
}

function extractAllEmails(content: string) {
  return Array.from(
    new Set(
      normalizeEmailWhitespace(content).match(
        /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi
      ) ?? []
    )
  ).join(", ")
}

function padTwo(value: number) {
  return String(value).padStart(2, "0")
}

function dateInputValueFor(content: string) {
  const explicit = content.match(/\b(\d{4}-\d{2}-\d{2})\b/)?.[1]
  if (explicit) return explicit

  const date = new Date()
  if (/\btomorrow\b/i.test(content)) {
    date.setDate(date.getDate() + 1)
  } else if (!/\btoday\b/i.test(content)) {
    return ""
  }

  return `${date.getFullYear()}-${padTwo(date.getMonth() + 1)}-${padTwo(date.getDate())}`
}

function timeInputValueFor(content: string) {
  const timeMatch = content.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i)
  if (!timeMatch) return ""

  let hour = Number(timeMatch[1])
  const minute = Number(timeMatch[2] ?? "0")
  const meridiem = timeMatch[3]?.toLowerCase()

  if (meridiem === "pm" && hour < 12) hour += 12
  if (meridiem === "am" && hour === 12) hour = 0
  if (hour > 23 || minute > 59) return ""

  return `${padTwo(hour)}:${padTwo(minute)}`
}

function extractDurationMinutes(content: string) {
  const minutes = content.match(/\b(\d{1,3})\s*(?:minutes?|mins?|min)\b/i)?.[1]
  if (minutes) return minutes

  const hours = content.match(/\b(\d{1,2})\s*(?:hours?|hrs?|hr)\b/i)?.[1]
  if (hours) return String(Number(hours) * 60)

  return "30"
}

function extractCalendarTitle(content: string) {
  return (
    extractLabeledValue(content, "title") ||
    extractLabeledValue(content, "summary") ||
    extractQuotedAfter(content, ["called", "named", "titled"]) ||
    (/\bmeeting\b/i.test(content) ? "Meeting" : "")
  )
}

function extractCalendarDescription(content: string) {
  return (
    extractLabeledValue(content, "description") ||
    extractLabeledValue(content, "agenda") ||
    extractQuotedAfter(content, ["description", "agenda"]) ||
    ""
  )
}

function extractCalendarTimezone(content: string) {
  if (/\b(amman|jordan)\b/i.test(content)) return "Asia/Amman"
  return ""
}

function extractHeaders(content: string) {
  const explicit = extractLabeledValue(content, "headers?")
  if (explicit) return explicit

  const match = content.match(
    /\b(?:with|contains?|including)\s+(?:these\s+)?headers?\s*:?\s*([\s\S]+)$/i
  )
  return match?.[1]?.trim() ?? ""
}

function connectedCatalogApp(slug: string) {
  return (
    INTEGRATIONS_CATALOG.find((integration) => integration.slug === slug) ??
    null
  )
}

export function serializeAppMiniUiRequest(request: AppMiniUiRequest) {
  return `${MINI_UI_PREFIX}${JSON.stringify(request)}`
}

export function parseAppMiniUiRequest(
  content: string
): AppMiniUiRequest | null {
  if (!content.startsWith(MINI_UI_PREFIX)) return null

  try {
    const parsed = JSON.parse(
      content.slice(MINI_UI_PREFIX.length)
    ) as Partial<AppMiniUiRequest>
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
  if (/\bwith\s+these\s+exact\s+fields\s*:/i.test(normalized)) return null

  const calendar = connectedCatalogApp("google-calendar")
  if (
    calendar &&
    appEnabled({ ...input, appName: calendar.name }) &&
    /\b(schedule|book|create|add|set\s+up|make)\b/i.test(normalized) &&
    /\b(meeting|event|appointment|calendar)\b/i.test(normalized)
  ) {
    return {
      type: "app_mini_ui",
      appName: calendar.name,
      appSlug: calendar.slug,
      variant: "google-calendar-event",
      title: "Schedule meeting",
      description: "Review the event details before Atmet creates it in Calendar.",
      originalRequest: content,
      submitLabel: "Create event",
      fields: [
        {
          id: "title",
          label: "Title",
          type: "text",
          placeholder: "Meeting title",
          value: extractCalendarTitle(normalized),
          required: true,
        },
        {
          id: "description",
          label: "Description",
          type: "textarea",
          placeholder: "Optional notes or agenda",
          value: extractCalendarDescription(normalized),
        },
        {
          id: "invitees",
          label: "Invited emails",
          type: "email",
          placeholder: "name@example.com, teammate@example.com",
          value: extractAllEmails(normalized),
          required: true,
        },
        {
          id: "date",
          label: "Date",
          type: "date",
          placeholder: "Select date",
          value: dateInputValueFor(normalized),
          required: true,
        },
        {
          id: "time",
          label: "Time",
          type: "time",
          placeholder: "Select time",
          value: timeInputValueFor(normalized),
          required: true,
        },
        {
          id: "duration",
          label: "Duration",
          type: "number",
          placeholder: "30",
          value: extractDurationMinutes(normalized),
          required: true,
        },
        {
          id: "timezone",
          label: "Timezone",
          type: "select",
          placeholder: "Select timezone",
          value: extractCalendarTimezone(normalized),
          options: [
            "Asia/Amman",
            "UTC",
            "America/New_York",
            "Europe/London",
            "Europe/Berlin",
            "Asia/Dubai",
            "Asia/Riyadh",
          ],
        },
      ],
    }
  }

  const gmail = connectedCatalogApp("gmail")
  if (
    gmail &&
    appEnabled({ ...input, appName: gmail.name }) &&
    /\b(send|compose|write)\b/i.test(normalized) &&
    /\b(email|mail|message)\b/i.test(normalized)
  ) {
    const to = cleanEmailAddress(
      extractLabeledValue(normalized, "to") || extractEmailRecipient(normalized)
    )
    const subject = extractNaturalEmailSubject(normalized)
    const body = extractNaturalEmailBody(normalized)

    return {
      type: "app_mini_ui",
      appName: gmail.name,
      appSlug: gmail.slug,
      variant: "gmail-compose",
      title: to && subject && body ? "Approve Gmail send" : "Complete email details",
      description:
        to && subject && body
          ? "Approve these details and Atmet will send from Gmail."
          : "Fill the missing fields before Atmet sends from Gmail.",
      originalRequest: content,
      submitLabel: "Approve and send",
      fields: [
        {
          id: "to",
          label: "To",
          type: "text",
          placeholder: "name@example.com",
          value: to,
          required: true,
        },
        {
          id: "subject",
          label: "Subject",
          type: "text",
          placeholder: "Email subject",
          value: subject,
          required: true,
        },
        {
          id: "body",
          label: "Body",
          type: "textarea",
          placeholder: "Write the email message",
          value: body,
          required: true,
        },
      ],
    }
  }

  const sheets = connectedCatalogApp("google-sheets")
  if (
    sheets &&
    appEnabled({ ...input, appName: sheets.name }) &&
    /\b(create|new|make)\b/i.test(normalized) &&
    /\b(sheet|spreadsheet)\b/i.test(normalized)
  ) {
    const title =
      extractQuotedAfter(normalized, ["called", "named", "titled"]) ||
      extractLabeledValue(normalized, "title")
    const headers = extractHeaders(normalized)

    if (!title || !headers) {
      return {
        type: "app_mini_ui",
        appName: sheets.name,
        appSlug: sheets.slug,
        variant: "google-sheets-create",
        title: "Create Google Sheet",
        description:
          "Name the spreadsheet and add the headers Atmet should create.",
        originalRequest: content,
        submitLabel: "Create sheet",
        fields: [
          {
            id: "title",
            label: "Sheet name",
            type: "text",
            placeholder: "Leads tracker",
            value: title,
            required: true,
          },
          {
            id: "headers",
            label: "Headers",
            type: "text",
            placeholder: "Name, Email, Status",
            value: headers,
            required: true,
          },
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
    const query =
      extractLabeledValue(normalized, "query") ||
      extractQuotedAfter(normalized, ["called", "named"])

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
          {
            id: "query",
            label: "Search",
            type: "text",
            placeholder: "Folder or file name",
            value: query,
            required: true,
          },
          {
            id: "itemType",
            label: "Type",
            type: "select",
            value: "files and folders",
            options: ["files and folders", "files", "folders"],
          },
        ],
      }
    }
  }

  const telegram = connectedCatalogApp("telegram")
  if (
    telegram &&
    appEnabled({ ...input, appName: telegram.name }) &&
    /\b(send|post|message|text|notify|alert)\b/i.test(normalized) &&
    /\b(telegram|chat|channel|group)\b/i.test(normalized)
  ) {
    const telegramRequest = content.replace(
      new RegExp(`(^|\\s)@${telegram.name}(?=\\s|$|[.,!?;:])`, "gi"),
      " "
    )
    const chatId = extractTelegramChatId(telegramRequest)
    const text = extractTelegramMessageText(normalized)

    return {
      type: "app_mini_ui",
      appName: telegram.name,
      appSlug: telegram.slug,
      variant: "telegram-send-message",
      title:
        chatId && text ? "Review Telegram message" : "Send Telegram message",
      description:
        chatId && text
          ? "Confirm the message before Atmet sends it."
          : "Choose the Telegram chat and message Atmet should send.",
      originalRequest: content,
      submitLabel: "Send message",
      fields: [
        {
          id: "chat_id",
          label: "Chat ID or @username",
          type: "text",
          placeholder: "@channelname or -1001234567890",
          value: chatId,
          required: true,
        },
        {
          id: "text",
          label: "Message",
          type: "textarea",
          placeholder: "Write the Telegram message",
          value: text,
          required: true,
        },
      ],
    }
  }

  return null
}
