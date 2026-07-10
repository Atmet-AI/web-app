import { INTEGRATIONS_CATALOG } from "@/lib/integrations-catalog"

export type AppApprovalRequest = {
  type: "app_approval"
  appName: string
  appSlug: string
  originalRequest: string
  reason: string
}

const APPROVAL_PREFIX = "::ATMET_APP_APPROVAL::"

const ACTION_INTENT =
  /\b(add|append|archive|check|create|delete|download|edit|fetch|find|forward|get|label|list|move|post|publish|read|reply|search|send|share|summari[sz]e|sync|update|upload|write)\b/i
const TRIGGER_INTENT =
  /\b(when|whenever|if|every\s+time|anyone|someone|trigger|watch|listen)\b/i

const APP_ALIASES: Record<string, RegExp[]> = {
  gmail: [/\bgmail\b/i, /\bemail(s)?\b/i, /\bmailbox\b/i, /\binbox\b/i],
  "google-contacts": [
    /\bgoogle\s*contacts?\b/i,
    /\bgmail\s*contacts?\b/i,
    /\bcontacts?\b/i,
    /\baddress\s*book\b/i,
  ],
  "google-sheets": [
    /\bgoogle\s*sheets?\b/i,
    /\bsheets?\b/i,
    /\bspreadsheet(s)?\b/i,
    /\bworksheet(s)?\b/i,
  ],
  "google-drive": [
    /\bgoogle\s*drive\b/i,
    /\bgdrive\b/i,
    /\bdrive\s+file(s)?\b/i,
    /\bgoogle\s*doc(s)?\b/i,
  ],
  chatgpt: [
    /\bchatgpt\b/i,
    /\bopenai\b/i,
    /\bgpt\b/i,
    /\bvector\s*store(s)?\b/i,
  ],
  telegram: [/\btelegram\b/i],
  instagram: [
    /\binstagram\b/i,
    /\big\b/i,
    /\breels?\b/i,
    /\bstor(y|ies)\b/i,
    /\binstagram\s*messages?\b/i,
  ],
  slack: [/\bslack\b/i],
  notion: [/\bnotion\b/i],
  hubspot: [/\bhubspot\b/i],
  github: [/\bgithub\b/i, /\bpull\s*request(s)?\b/i, /\brepositor(y|ies)\b/i],
  jira: [/\bjira\b/i],
  asana: [/\basana\b/i],
  salesforce: [/\bsalesforce\b/i],
  discord: [/\bdiscord\b/i],
  x: [/\b(?:twitter|tweet|tweets|x)\b/i],
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function hasActionIntent(content: string) {
  return ACTION_INTENT.test(content) || TRIGGER_INTENT.test(content)
}

function prioritizeCatalogForContent(content: string) {
  if (!/\b(contacts?|address\s*book)\b/i.test(content))
    return INTEGRATIONS_CATALOG

  const contacts = INTEGRATIONS_CATALOG.find(
    (integration) => integration.slug === "google-contacts"
  )
  if (!contacts) return INTEGRATIONS_CATALOG

  return [
    contacts,
    ...INTEGRATIONS_CATALOG.filter(
      (integration) => integration.slug !== contacts.slug
    ),
  ]
}

function appLinkPattern(appName: string) {
  return new RegExp(
    `\\[${escapeRegExp(appName)}\\]\\(app:\\/\\/[a-z0-9-]+\\)`,
    "i"
  )
}

export function hasExplicitAppMention(content: string, appName: string) {
  return appLinkPattern(appName).test(content)
}

export function hasAppInConversation(
  messages: Array<{ content: string }>,
  appName: string
) {
  return messages.some((message) =>
    hasExplicitAppMention(message.content, appName)
  )
}

export function serializeAppApprovalRequest(request: AppApprovalRequest) {
  return `${APPROVAL_PREFIX}${JSON.stringify(request)}`
}

export function parseAppApprovalRequest(
  content: string
): AppApprovalRequest | null {
  if (!content.startsWith(APPROVAL_PREFIX)) return null

  try {
    const parsed = JSON.parse(
      content.slice(APPROVAL_PREFIX.length)
    ) as Partial<AppApprovalRequest>
    if (
      parsed.type !== "app_approval" ||
      typeof parsed.appName !== "string" ||
      typeof parsed.appSlug !== "string" ||
      typeof parsed.originalRequest !== "string" ||
      typeof parsed.reason !== "string"
    ) {
      return null
    }

    return {
      type: "app_approval",
      appName: parsed.appName,
      appSlug: parsed.appSlug,
      originalRequest: parsed.originalRequest,
      reason: parsed.reason,
    }
  } catch {
    return null
  }
}

export function detectAppApprovalRequest(input: {
  content: string
  conversationMessages: Array<{ content: string }>
}): AppApprovalRequest | null {
  const content = input.content.trim()
  if (!content || !hasActionIntent(content)) return null

  for (const integration of prioritizeCatalogForContent(content)) {
    const aliases = APP_ALIASES[integration.slug] ?? [
      new RegExp(`\\b${escapeRegExp(integration.name)}\\b`, "i"),
    ]
    const isMentioned = aliases.some((alias) => alias.test(content))

    if (!isMentioned) continue
    if (hasExplicitAppMention(content, integration.name)) continue
    if (hasAppInConversation(input.conversationMessages, integration.name))
      continue

    return {
      type: "app_approval",
      appName: integration.name,
      appSlug: integration.slug,
      originalRequest: content,
      reason: `This needs access to ${integration.name}.`,
    }
  }

  return null
}
