import { type NextRequest } from "next/server"
import { z } from "zod"

import { getUser } from "@/lib/api/auth"
import { ok, Errors } from "@/lib/api/response"

const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(40000),
})

const createAgentSchema = z.object({
  sourceMessageId: z.number().optional(),
  messages: z.array(chatMessageSchema).min(1).max(80).optional(),
})

function compactTitle(value: string, fallback: string) {
  const normalized = value.replace(/\s+/g, " ").trim()
  if (!normalized) return fallback
  return normalized.length > 72 ? `${normalized.slice(0, 72)}...` : normalized
}

function buildNodeDescription(messages: Array<{ role: "user" | "assistant"; content: string }>) {
  const userMessages = messages.filter((m) => m.role === "user")
  const assistantMessages = messages.filter((m) => m.role === "assistant")
  const parts: string[] = []
  if (userMessages.length > 0) {
    const preview = userMessages[0].content.replace(/\s+/g, " ").trim()
    parts.push(preview.length > 120 ? `${preview.slice(0, 120)}...` : preview)
  }
  parts.push(`${messages.length} messages (${userMessages.length} user · ${assistantMessages.length} AI)`)
  return parts.join(" — ")
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

  const parsed = createAgentSchema.safeParse(body)
  if (!parsed.success) return Errors.validationError(parsed.error.issues[0].message)

  const { data: chat, error: chatError } = await supabase
    .from("chat")
    .select("id, workspace_id, title")
    .eq("id", chatId)
    .maybeSingle()

  if (chatError || !chat) return Errors.notFound("Chat")

  let sourceMessages = parsed.data.messages

  if (!sourceMessages || sourceMessages.length === 0) {
    const { data: dbMessages, error: messagesError } = await supabase
      .from("message")
      .select("role, content")
      .eq("chat_id", chatId)
      .in("role", ["user", "assistant"])
      .order("created_at", { ascending: true })
      .limit(40)

    if (messagesError) return Errors.internal()

    sourceMessages = (dbMessages ?? [])
      .filter((message) => message.role === "user" || message.role === "assistant")
      .map((message) => ({
        role: message.role as "user" | "assistant",
        content: message.content,
      }))
  }

  const cleanedMessages = (sourceMessages ?? []).filter((message) => message.content.trim())
  if (cleanedMessages.length === 0) {
    return Errors.badRequest("This chat does not have enough messages to create an agent.")
  }

  const firstUserMessage = cleanedMessages.find((message) => message.role === "user")
  const agentName = compactTitle(firstUserMessage?.content ?? chat.title, "AI agent")
  const totalTokens = cleanedMessages.reduce((sum, m) => sum + Math.max(1, Math.ceil(m.content.length / 4)), 0)

  // One node represents the entire chat conversation
  const steps = [
    {
      name: agentName,
      status: "In review" as const,
      owner: "Atmet AI",
      nodeType: "Action" as const,
      provider: "Atmet",
      model: "",
      prompt: buildNodeDescription(cleanedMessages),
      tokenCount: totalTokens,
      usedApps: [],
      usedSkills: [],
      files: [],
      chatId: chatId,
    },
  ]

  const blueprint = {
    version: 2,
    source: "chat-agent",
    sourceChatId: chat.id,
    sourceMessageId: parsed.data.sourceMessageId ?? null,
    createdAt: new Date().toISOString(),
    steps,
  }

  const { data: automation, error: automationError } = await supabase
    .from("automation")
    .insert({
      workspace_id: chat.workspace_id,
      created_by: user.id,
      name: agentName,
      description: buildNodeDescription(cleanedMessages),
      script_key: JSON.stringify(blueprint),
      status: "draft",
    })
    .select()
    .single()

  if (automationError || !automation) return Errors.internal()

  await supabase.from("chats_automation").insert({
    chat_id: chat.id,
    automation_id: automation.id,
  })

  return ok({ automation }, 201)
}
