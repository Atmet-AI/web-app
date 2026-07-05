import { randomBytes } from "crypto"
import { type NextRequest } from "next/server"
import { z } from "zod"

import { getUser } from "@/lib/api/auth"
import { ok, Errors } from "@/lib/api/response"
import { getCatalogIntegration } from "@/lib/integrations-catalog"
import { getIntegrationSecretPayload } from "@/lib/integrations/connections"
import { ensureIntegrationProvider } from "@/lib/integrations/providers"
import { setTelegramWebhook } from "@/lib/integrations/telegram"
import { buildPublicUrl } from "@/lib/public-url"

const telegramAgentSchema = z.object({
  name: z.string().min(1, "Agent name is required").max(100),
  instructions: z.string().min(10, "Instructions should explain how the agent should reply.").max(8000),
  modelMode: z.enum(["atmet", "agent_api"]),
  agentApiUrl: z.string().url("Agent API URL must be a valid URL.").optional().or(z.literal("")),
  autoReply: z.boolean().default(true),
  handoffMessage: z.string().max(500).optional(),
})

function compactDescription(value: string) {
  const normalized = value.replace(/\s+/g, " ").trim()
  return normalized.length > 240 ? `${normalized.slice(0, 240)}...` : normalized
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getUser()
  if (!auth.ok) return auth.response

  const { supabase, user } = auth
  const { id: chatId } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Errors.badRequest("Invalid JSON body.")
  }

  const parsed = telegramAgentSchema.safeParse(body)
  if (!parsed.success) return Errors.validationError(parsed.error.issues[0].message)

  if (parsed.data.modelMode === "agent_api" && !parsed.data.agentApiUrl) {
    return Errors.validationError("Agent API URL is required when using an external agent API.")
  }

  const { data: chat, error: chatError } = await supabase
    .from("chat")
    .select("id, workspace_id, title")
    .eq("id", chatId)
    .maybeSingle()

  if (chatError || !chat) return Errors.notFound("Chat")

  const telegramCatalog = getCatalogIntegration("telegram")
  if (!telegramCatalog) return Errors.notFound("Telegram integration")

  const telegramProvider = await ensureIntegrationProvider(telegramCatalog)

  const { data: telegramConnection, error: telegramError } = await supabase
    .from("workspace_integration")
    .select("id, connected_account, settings")
    .eq("workspace_id", chat.workspace_id)
    .eq("provider_id", telegramProvider.id)
    .eq("status", "active")
    .maybeSingle()

  if (telegramError) return Errors.internal()
  if (!telegramConnection) {
    return Errors.badRequest("Connect a Telegram bot before creating a Telegram agent.")
  }

  const webhookSecret = randomBytes(24).toString("hex")
  const webhookPath = `/api/telegram/webhook/pending/${webhookSecret}`
  const blueprint = {
    version: 1,
    kind: "telegram-agent",
    source: "chat-telegram-agent",
    agentName: parsed.data.name,
    sourceChatId: chat.id,
    createdAt: new Date().toISOString(),
    channel: {
      provider: "telegram",
      workspaceIntegrationId: telegramConnection.id,
      bot: telegramConnection.connected_account ?? null,
      webhookSecret,
      webhookPath,
    },
    brain: {
      mode: parsed.data.modelMode,
      agentApiUrl: parsed.data.modelMode === "agent_api" ? parsed.data.agentApiUrl : null,
    },
    behavior: {
      autoReply: parsed.data.autoReply,
      instructions: parsed.data.instructions,
      handoffMessage: parsed.data.handoffMessage?.trim() || null,
    },
  }

  const { data: automation, error: automationError } = await supabase
    .from("automation")
    .insert({
      workspace_id: chat.workspace_id,
      created_by: user.id,
      name: parsed.data.name,
      description: compactDescription(parsed.data.instructions),
      script_key: JSON.stringify(blueprint),
      status: "active",
    })
    .select()
    .single()

  if (automationError || !automation) return Errors.internal()

  const finalWebhookPath = `/api/telegram/webhook/${automation.id}/${webhookSecret}`
  const finalWebhookUrl = buildPublicUrl(finalWebhookPath, request)
  const finalBlueprint = {
    ...blueprint,
    channel: {
      ...blueprint.channel,
      webhookPath: finalWebhookPath,
      webhookUrl: finalWebhookUrl,
    },
  }

  const { error: blueprintUpdateError } = await supabase
    .from("automation")
    .update({ script_key: JSON.stringify(finalBlueprint) })
    .eq("id", automation.id)

  if (blueprintUpdateError) return Errors.internal()

  let webhookConfigured = false
  let webhookError: string | null = null

  if (finalWebhookUrl.startsWith("https://")) {
    try {
      const secret = await getIntegrationSecretPayload<{ api_key?: string }>(
        telegramConnection.id,
        "api_key"
      )
      if (!secret.api_key) throw new Error("Telegram bot token was not found.")
      await setTelegramWebhook(secret.api_key, finalWebhookUrl)
      webhookConfigured = true
    } catch (error) {
      webhookError =
        error instanceof Error ? error.message : "Telegram webhook setup failed."
    }
  }

  await supabase.from("chats_automation").insert({
    chat_id: chat.id,
    automation_id: automation.id,
  })

  return ok(
    {
      automation: {
        ...automation,
        script_key: JSON.stringify(finalBlueprint),
      },
      webhookPath: finalWebhookPath,
      webhookUrl: finalWebhookUrl,
      webhookConfigured,
      webhookError,
    },
    201
  )
}
