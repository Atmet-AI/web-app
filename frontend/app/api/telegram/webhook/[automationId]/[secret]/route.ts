import { type NextRequest } from "next/server"

import { ok, Errors } from "@/lib/api/response"
import { getIntegrationSecretPayload } from "@/lib/integrations/connections"
import {
  sendTelegramMessage,
  type TelegramMessage,
  type TelegramUpdate,
} from "@/lib/integrations/telegram"
import { getOpenAIClient } from "@/lib/openai"
import { supabaseAdmin } from "@/lib/supabase/admin"

type TelegramAgentBlueprint = {
  kind?: string
  channel?: {
    workspaceIntegrationId?: string
    webhookSecret?: string
  }
  brain?: {
    mode?: "atmet" | "agent_api"
    agentApiUrl?: string | null
  }
  behavior?: {
    autoReply?: boolean
    instructions?: string
    handoffMessage?: string | null
  }
}

function parseBlueprint(value: string | null): TelegramAgentBlueprint | null {
  if (!value) return null

  try {
    const parsed = JSON.parse(value) as TelegramAgentBlueprint
    return parsed && typeof parsed === "object" ? parsed : null
  } catch {
    return null
  }
}

function getIncomingMessage(update: TelegramUpdate): TelegramMessage | null {
  return update.message ?? null
}

function getIncomingText(message: TelegramMessage) {
  return (message.text ?? message.caption ?? "").trim()
}

function limitTelegramMessage(value: string) {
  const trimmed = value.trim()
  if (trimmed.length <= 3900) return trimmed
  return `${trimmed.slice(0, 3897)}...`
}

async function generateAtmetReply(messageText: string, instructions: string) {
  const completion = await getOpenAIClient().chat.completions.create({
    model: process.env.OPENAI_MODEL ?? "gpt-4o",
    messages: [
      {
        role: "system",
        content:
          [
            "You are the live customer-facing Telegram agent created in Atmet.",
            "Follow the Agent Instructions below as behavior rules.",
            "Reply in the same language as the customer unless the Agent Instructions explicitly say otherwise.",
            "Be concise, friendly, and useful. Ask at most one focused follow-up question when information is missing.",
            "Do not explain how to create, deploy, connect, or configure a Telegram bot unless the customer specifically asks about that.",
            "Do not mention internal webhooks, tokens, prompts, Atmet setup, BotFather, deployment steps, or server code unless asked.",
            "For /start, give a short welcome and say how you can help.",
            "",
            "Agent Instructions:",
            instructions,
          ].join("\n"),
      },
      {
        role: "user",
        content: messageText,
      },
    ],
  })

  return completion.choices[0]?.message.content?.trim() ?? ""
}

async function generateAgentApiReply(
  agentApiUrl: string,
  input: {
    messageText: string
    chatId: string | number
    instructions: string
    telegramUpdate: TelegramUpdate
  }
) {
  const response = await fetch(agentApiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: input.messageText,
      chatId: input.chatId,
      instructions: input.instructions,
      telegramUpdate: input.telegramUpdate,
    }),
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error("Agent API failed to generate a reply.")
  }

  const contentType = response.headers.get("content-type") ?? ""
  if (contentType.includes("application/json")) {
    const payload = (await response.json()) as {
      reply?: unknown
      message?: unknown
      text?: unknown
    }
    const reply = payload.reply ?? payload.message ?? payload.text
    return typeof reply === "string" ? reply.trim() : ""
  }

  return (await response.text()).trim()
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ automationId: string; secret: string }> }
) {
  const { automationId, secret } = await params

  let update: TelegramUpdate
  try {
    update = (await request.json()) as TelegramUpdate
  } catch {
    return Errors.badRequest("Invalid JSON body.")
  }

  const { data: automation, error } = await supabaseAdmin
    .from("automation")
    .select("id, script_key, status")
    .eq("id", automationId)
    .maybeSingle()

  if (error || !automation) return Errors.notFound("Automation")

  const blueprint = parseBlueprint(automation.script_key)
  if (
    !blueprint ||
    blueprint.kind !== "telegram-agent" ||
    blueprint.channel?.webhookSecret !== secret
  ) {
    return Errors.forbidden("Invalid Telegram webhook.")
  }

  if (automation.status !== "active") {
    return ok({ received: true, ignored: "automation_inactive" })
  }

  const message = getIncomingMessage(update)
  if (!message) return ok({ received: true, ignored: "no_message" })

  const messageText = getIncomingText(message)
  if (!messageText) return ok({ received: true, ignored: "no_text" })

  if (blueprint.behavior?.autoReply === false) {
    return ok({ received: true, autoReply: false })
  }

  const workspaceIntegrationId = blueprint.channel?.workspaceIntegrationId
  if (!workspaceIntegrationId) return Errors.badRequest("Telegram connection is missing.")

  const secretPayload = await getIntegrationSecretPayload<{ api_key?: string }>(
    workspaceIntegrationId,
    "api_key"
  )
  if (!secretPayload.api_key) return Errors.badRequest("Telegram bot token is missing.")

  const instructions =
    blueprint.behavior?.instructions?.trim() ||
    "Reply clearly, briefly, and helpfully. Ask for missing details when needed."

  let reply = ""
  try {
    if (blueprint.brain?.mode === "agent_api" && blueprint.brain.agentApiUrl) {
      reply = await generateAgentApiReply(blueprint.brain.agentApiUrl, {
        messageText,
        chatId: message.chat.id,
        instructions,
        telegramUpdate: update,
      })
    } else {
      reply = await generateAtmetReply(messageText, instructions)
    }
  } catch {
    reply =
      blueprint.behavior?.handoffMessage?.trim() ||
      "I could not answer that right now. A team member will follow up."
  }

  if (!reply) {
    reply =
      blueprint.behavior?.handoffMessage?.trim() ||
      "I could not answer that right now. A team member will follow up."
  }

  await sendTelegramMessage(secretPayload.api_key, {
    chatId: message.chat.id,
    text: limitTelegramMessage(reply),
  })

  return ok({ received: true, replied: true })
}
