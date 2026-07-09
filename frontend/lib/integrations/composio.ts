import "server-only"

import { createHmac, timingSafeEqual } from "crypto"

import { Composio } from "@composio/core"

const DEFAULT_COMPOSIO_BASE_URL = "https://backend.composio.dev/api/v3.1"

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

export function getComposioClient() {
  return new Composio({
    apiKey: getComposioApiKey(),
    baseURL: process.env.COMPOSIO_BASE_URL ?? DEFAULT_COMPOSIO_BASE_URL,
    allowTracking: false,
  })
}

export function normalizeComposioToolkit(toolkit: string) {
  return toolkit.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "_")
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

  const request = input.authConfigId
    ? await composio.toolkits.authorize(composioUserId, toolkit, input.authConfigId)
    : await composio.toolkits.authorize(composioUserId, toolkit)

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
