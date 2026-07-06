import { type NextRequest } from "next/server"

import { getUser } from "@/lib/api/auth"
import { ok, Errors } from "@/lib/api/response"
import { getIntegrationSecretPayload } from "@/lib/integrations/connections"
import {
  getTelegramWebhookInfo,
  setTelegramWebhook,
} from "@/lib/integrations/telegram"
import { buildPublicUrl } from "@/lib/public-url"

type TelegramAgentBlueprint = {
  kind?: string
  channel?: {
    workspaceIntegrationId?: string
    webhookSecret?: string
    webhookUrl?: string
    webhookPath?: string
    bot?: string | null
  }
}

type ParsedTelegramAgentBlueprint = TelegramAgentBlueprint & {
  channel: {
    workspaceIntegrationId: string
    webhookSecret: string
    webhookUrl?: string
    webhookPath?: string
    bot?: string | null
  }
}

function parseTelegramAgentBlueprint(value: string | null): ParsedTelegramAgentBlueprint | null {
  if (!value) return null

  try {
    const parsed = JSON.parse(value) as TelegramAgentBlueprint
    if (parsed.kind !== "telegram-agent") return null
    if (!parsed.channel?.workspaceIntegrationId || !parsed.channel.webhookSecret) return null
    return parsed as ParsedTelegramAgentBlueprint
  } catch {
    return null
  }
}

function getBotLink(bot: string | null | undefined, startPayload?: string) {
  if (!bot) return null
  const username = bot.replace(/^@/, "").trim()
  if (!username) return null
  return startPayload
    ? `https://t.me/${username}?start=${encodeURIComponent(startPayload)}`
    : `https://t.me/${username}`
}

function buildWebhookUrl(request: NextRequest, automationId: string, secret: string) {
  const path = `/api/telegram/webhook/${automationId}/${secret}`
  return {
    path,
    url: buildPublicUrl(path, request),
  }
}

async function getTelegramStatus(input: {
  botToken: string
  expectedWebhookUrl: string
  bot: string | null | undefined
  automationId: string
}) {
  const webhook = await getTelegramWebhookInfo(input.botToken)
  return {
    bot: input.bot ?? null,
    botLink: getBotLink(input.bot, input.automationId),
    expectedWebhookUrl: input.expectedWebhookUrl,
    currentWebhookUrl: webhook.url || null,
    webhookConfigured: webhook.url === input.expectedWebhookUrl,
    pendingUpdateCount: webhook.pending_update_count,
    lastErrorMessage: webhook.last_error_message ?? null,
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getUser()
  if (!auth.ok) return auth.response

  const { supabase } = auth
  const { id } = await params

  const { data: automation, error } = await supabase
    .from("automation")
    .select("id, script_key")
    .eq("id", id)
    .maybeSingle()

  if (error || !automation) return Errors.notFound("Automation")

  const blueprint = parseTelegramAgentBlueprint(automation.script_key)
  if (!blueprint) return Errors.badRequest("This automation is not a Telegram agent.")

  const { url } = buildWebhookUrl(request, automation.id, blueprint.channel.webhookSecret)
  const secret = await getIntegrationSecretPayload<{ api_key?: string }>(
    blueprint.channel.workspaceIntegrationId,
    "api_key"
  )
  if (!secret.api_key) return Errors.badRequest("Telegram bot token is missing.")

  const status = await getTelegramStatus({
    botToken: secret.api_key,
    expectedWebhookUrl: url,
    bot: blueprint.channel.bot,
    automationId: automation.id,
  })

  return ok(status)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getUser()
  if (!auth.ok) return auth.response

  const { supabase } = auth
  const { id } = await params

  const { data: automation, error } = await supabase
    .from("automation")
    .select("id, script_key")
    .eq("id", id)
    .maybeSingle()

  if (error || !automation) return Errors.notFound("Automation")

  const blueprint = parseTelegramAgentBlueprint(automation.script_key)
  if (!blueprint) return Errors.badRequest("This automation is not a Telegram agent.")

  const { path, url } = buildWebhookUrl(request, automation.id, blueprint.channel.webhookSecret)
  if (!url.startsWith("https://")) {
    return Errors.badRequest("Telegram webhooks require an HTTPS domain.")
  }

  const secret = await getIntegrationSecretPayload<{ api_key?: string }>(
    blueprint.channel.workspaceIntegrationId,
    "api_key"
  )
  if (!secret.api_key) return Errors.badRequest("Telegram bot token is missing.")

  await setTelegramWebhook(secret.api_key, url)

  const nextBlueprint = {
    ...blueprint,
    channel: {
      ...blueprint.channel,
      webhookPath: path,
      webhookUrl: url,
      webhookConfiguredAt: new Date().toISOString(),
    },
  }

  const { error: updateError } = await supabase
    .from("automation")
    .update({ script_key: JSON.stringify(nextBlueprint), status: "active" })
    .eq("id", automation.id)

  if (updateError) return Errors.internal()

  const status = await getTelegramStatus({
    botToken: secret.api_key,
    expectedWebhookUrl: url,
    bot: blueprint.channel.bot,
    automationId: automation.id,
  })

  return ok(status)
}
