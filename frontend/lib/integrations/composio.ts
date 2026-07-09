import "server-only"

import { createHmac, timingSafeEqual } from "crypto"

import { Composio } from "@composio/core"

type JsonRecord = Record<string, unknown>

export type ComposioConnectLink = {
  requestId: string
  redirectUrl: string
  status?: string
}

export type ComposioMcpSession = {
  sessionId: string
  mcp: {
    type: string
    url: string
    headers?: Record<string, string>
  }
}

export type ComposioConnectedAccount = {
  id: string
  toolkit: string
  status: string
  statusReason: string | null
  authConfigId: string | null
  alias: string | null
  wordId: string | null
  isDisabled: boolean
  createdAt: string
  updatedAt: string
}

function getComposioApiKey() {
  const apiKey = process.env.COMPOSIO_API_KEY
  if (!apiKey) {
    throw new Error("COMPOSIO_API_KEY is required to use Composio integrations.")
  }

  return apiKey
}

export function getComposioUserId(workspaceId: string, userId: string) {
  return `workspace:${workspaceId}:user:${userId}`
}

function getComposioBaseUrl() {
  const value = process.env.COMPOSIO_BASE_URL?.trim().replace(/\/+$/, "")
  if (!value) return undefined

  try {
    const url = new URL(value)
    if (url.hostname === "backend.composio.dev" && url.pathname.startsWith("/api/")) {
      return url.origin
    }
    return value
  } catch {
    return undefined
  }
}

export function getComposioClient() {
  return new Composio({
    apiKey: getComposioApiKey(),
    baseURL: getComposioBaseUrl(),
    allowTracking: false,
  })
}

export function normalizeComposioToolkit(toolkit: string) {
  return toolkit.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "_")
}

export function toWorkspaceIntegrationStatus(status: string) {
  switch (status) {
    case "ACTIVE":
      return "active"
    case "EXPIRED":
    case "REVOKED":
    case "INACTIVE":
      return "expired"
    case "FAILED":
      return "error"
    default:
      return "pending"
  }
}

export async function listComposioConnectedAccounts(input: {
  workspaceId: string
  userId: string
  toolkit: string
}): Promise<ComposioConnectedAccount[]> {
  const composio = getComposioClient()
  const toolkit = normalizeComposioToolkit(input.toolkit)
  const composioUserId = getComposioUserId(input.workspaceId, input.userId)
  const accounts = await composio.connectedAccounts.list({
    userIds: [composioUserId],
    toolkitSlugs: [toolkit],
    accountType: "ALL",
    limit: 100,
  })

  return accounts.items.map((account) => ({
    id: account.id,
    toolkit: account.toolkit.slug,
    status: account.status,
    statusReason: account.statusReason,
    authConfigId: account.authConfig?.id ?? null,
    alias: account.alias ?? null,
    wordId: account.wordId ?? null,
    isDisabled: account.isDisabled,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
  }))
}

async function getOrCreateManagedAuthConfig(toolkit: string) {
  const composio = getComposioClient()
  const existing = await composio.authConfigs.list({
    toolkit,
    limit: 10,
  })

  const existingConfig =
    existing.items.find((config) => config.status === "ENABLED") ?? existing.items[0]
  if (existingConfig?.id) return existingConfig.id

  const name = toolkit
    .split(/[_-]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")

  const created = await composio.authConfigs.create(toolkit, {
    type: "use_composio_managed_auth",
    name: `${name} Auth Config`,
  })

  return created.id
}

export async function createComposioConnectLink(input: {
  workspaceId: string
  userId: string
  toolkit: string
  callbackUrl?: string
  alias?: string
  authConfigId?: string
}): Promise<ComposioConnectLink> {
  const composio = getComposioClient()
  const composioUserId = getComposioUserId(input.workspaceId, input.userId)
  const toolkit = normalizeComposioToolkit(input.toolkit)
  const authConfigId = input.authConfigId ?? (await getOrCreateManagedAuthConfig(toolkit))

  const request = await composio.connectedAccounts.link(composioUserId, authConfigId, {
    callbackUrl: input.callbackUrl,
    alias: input.alias,
    allowMultiple: true,
  })

  if (!request.redirectUrl) {
    throw new Error("Composio did not return a connect link.")
  }

  return {
    requestId: request.id,
    redirectUrl: request.redirectUrl,
    status: request.status,
  }
}

export async function createComposioMcpSession(input: {
  workspaceId: string
  userId: string
  toolkits?: string[]
  callbackUrl?: string
}): Promise<ComposioMcpSession> {
  const composio = getComposioClient()
  const composioUserId = getComposioUserId(input.workspaceId, input.userId)
  const toolkits = input.toolkits?.map(normalizeComposioToolkit).filter(Boolean)

  const session = await composio.sessions.create(composioUserId, {
    mcp: true,
    ...(toolkits?.length ? { toolkits } : {}),
    manageConnections: input.callbackUrl
      ? { callbackUrl: input.callbackUrl }
      : true,
  })

  return {
    sessionId: session.sessionId,
    mcp: session.mcp,
  }
}

export function verifyComposioWebhookSignature(rawBody: string, headers: Headers) {
  const secret = process.env.COMPOSIO_WEBHOOK_SECRET
  if (!secret) return true

  const signature =
    headers.get("x-composio-signature") ??
    headers.get("composio-signature") ??
    headers.get("x-webhook-signature")

  if (!signature) return false

  const expected = createHmac("sha256", secret).update(rawBody).digest("hex")
  const normalizedSignature = signature.replace(/^sha256=/, "")

  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(normalizedSignature))
  } catch {
    return false
  }
}

export function getComposioEventId(payload: JsonRecord) {
  const directId = payload.id ?? payload.event_id ?? payload.eventId
  if (typeof directId === "string" && directId.trim()) return directId

  const data = payload.data
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const nested = data as JsonRecord
    const nestedId = nested.id ?? nested.event_id ?? nested.eventId
    if (typeof nestedId === "string" && nestedId.trim()) return nestedId
  }

  return null
}

export function getComposioTriggerId(payload: JsonRecord) {
  const directId = payload.trigger_id ?? payload.triggerId ?? payload.trigger_instance_id ?? payload.triggerInstanceId
  if (typeof directId === "string" && directId.trim()) return directId

  const trigger = payload.trigger
  if (trigger && typeof trigger === "object" && !Array.isArray(trigger)) {
    const triggerRecord = trigger as JsonRecord
    const nestedId = triggerRecord.id ?? triggerRecord.trigger_id ?? triggerRecord.triggerId
    if (typeof nestedId === "string" && nestedId.trim()) return nestedId
  }

  return null
}
