import { randomBytes } from "crypto"
import { type NextRequest } from "next/server"
import type { SupabaseClient } from "@supabase/supabase-js"
import { z } from "zod"

import { getUser } from "@/lib/api/auth"
import { ok, Errors } from "@/lib/api/response"
import { getCatalogIntegration } from "@/lib/integrations-catalog"
import { ensureIntegrationProvider } from "@/lib/integrations/providers"
import { buildPublicUrl } from "@/lib/public-url"
import { assertPublicHttpsUrl } from "@/lib/security/outbound-url"

const telegramAgentSchema = z.object({
  name: z.string().min(1, "Agent name is required").max(100),
  instructions: z.string().min(10, "Instructions should explain how the agent should reply.").max(8000),
  modelMode: z.enum(["atmet", "agent_api"]),
  agentApiUrl: z.string().url("Agent API URL must be a valid URL.").optional().or(z.literal("")),
  autoReply: z.boolean().default(true),
  handoffMessage: z.string().max(500).optional(),
  workspaceIntegrationId: z.string().uuid().optional(),
})

function compactDescription(value: string) {
  const normalized = value.replace(/\s+/g, " ").trim()
  return normalized.length > 240 ? `${normalized.slice(0, 240)}...` : normalized
}

function getConnectionSetting(settings: unknown, key: string) {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) return null
  const value = (settings as Record<string, unknown>)[key]
  return typeof value === "string" && value.trim() ? value : null
}

async function isChatParticipant(
  supabase: SupabaseClient,
  chatId: string,
  userId: string
) {
  const { data, error } = await supabase
    .from("chats_users")
    .select("chat_id")
    .eq("chat_id", chatId)
    .eq("user_id", userId)
    .maybeSingle()

  if (error) return null
  return Boolean(data)
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

  if (parsed.data.modelMode === "agent_api" && parsed.data.agentApiUrl) {
    try {
      await assertPublicHttpsUrl(parsed.data.agentApiUrl)
    } catch (error) {
      return Errors.validationError(
        error instanceof Error ? error.message : "Agent API URL is not allowed."
      )
    }
  }

  const canAccessChat = await isChatParticipant(supabase, chatId, user.id)
  if (canAccessChat === null) return Errors.internal()
  if (!canAccessChat) return Errors.notFound("Chat")

  const { data: chat, error: chatError } = await supabase
    .from("chat")
    .select("id, workspace_id, title")
    .eq("id", chatId)
    .maybeSingle()

  if (chatError || !chat) return Errors.notFound("Chat")

  const telegramCatalog = getCatalogIntegration("telegram")
  if (!telegramCatalog) return Errors.notFound("Telegram integration")

  const telegramProvider = await ensureIntegrationProvider(telegramCatalog)

  let telegramConnectionQuery = supabase
    .from("workspace_integration")
    .select("id, connected_account, connection_name, settings")
    .eq("workspace_id", chat.workspace_id)
    .eq("provider_id", telegramProvider.id)
    .eq("created_by", user.id)
    .eq("status", "active")

  if (parsed.data.workspaceIntegrationId) {
    telegramConnectionQuery = telegramConnectionQuery.eq("id", parsed.data.workspaceIntegrationId)
  }

  const { data: telegramConnection, error: telegramError } = await telegramConnectionQuery
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle()

  if (telegramError) return Errors.internal()
  if (!telegramConnection) {
    return Errors.badRequest("Connect a Telegram bot before creating a Telegram agent.")
  }

  const webhookSecret = randomBytes(24).toString("hex")
  const webhookPath = `/api/telegram/webhook/pending/${webhookSecret}`
  const avatarUrl = getConnectionSetting(telegramConnection.settings, "avatar_url")
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
      connectionName: telegramConnection.connection_name ?? null,
      avatarUrl,
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
      status: "draft",
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
      webhookConfigured: false,
      webhookError: null,
    },
    201
  )
}
