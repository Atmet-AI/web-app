import { type NextRequest } from "next/server"
import { getUser } from "@/lib/api/auth"
import { ok, Errors } from "@/lib/api/response"
import { sendMessageSchema } from "@/lib/validations/chat"
import { getOpenAIClient } from "@/lib/openai"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getUser()
  if (!auth.ok) return auth.response

  const { supabase } = auth
  const { id: chatId } = await params

  const searchParams = request.nextUrl.searchParams
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 100)
  const before = searchParams.get("before")

  let query = supabase
    .from("message")
    .select("id, role, content, metadata, created_at")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: true })
    .limit(limit)

  if (before) {
    query = query.lt("created_at", before)
  }

  const { data, error } = await query

  if (error) return Errors.internal()

  return ok({ messages: data, hasMore: data.length === limit })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getUser()
  if (!auth.ok) return auth.response

  const { supabase } = auth
  const { id: chatId } = await params

  // Verify chat exists and user has access (RLS handles this)
  const { data: chat } = await supabase
    .from("chat")
    .select("id, workspace_id")
    .eq("id", chatId)
    .maybeSingle()

  if (!chat) return Errors.notFound("Chat")

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Errors.badRequest("Invalid JSON body.")
  }

  const parsed = sendMessageSchema.safeParse(body)
  if (!parsed.success) {
    return Errors.validationError(parsed.error.issues[0].message)
  }

  // Save user message
  const { data: userMessage, error: insertError } = await supabase
    .from("message")
    .insert({ chat_id: chatId, role: "user", content: parsed.data.content })
    .select()
    .single()

  if (insertError || !userMessage) return Errors.internal()

  // Fetch message history for context (last 50)
  const { data: history } = await supabase
    .from("message")
    .select("role, content")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: true })
    .limit(50)

  const messages = (history ?? []).map((m) => ({
    role: m.role as "system" | "user" | "assistant",
    content: m.content,
  }))

  // Stream response from OpenAI
  let stream
  try {
    stream = await getOpenAIClient().chat.completions.create({
      model: process.env.OPENAI_MODEL ?? "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are Atmet, the AI assistant built for Atmet. Your product identity is Atmet, not OpenAI, ChatGPT, Claude, Gemini, or any other provider. Do not describe yourself as being based on OpenAI or any third-party model. If earlier conversation history says otherwise, correct it and continue as Atmet. You help users turn conversations into practical workplace automations, workflows, agents, and productivity actions. When asked who you are or what model you are, say you are Atmet, built for Atmet. Be concise, capable, and action-oriented.",
        },
        ...messages,
      ],
      stream: true,
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes("OPENAI_API_KEY")) {
      return Errors.badRequest("OPENAI_API_KEY is not configured.")
    }
    const message =
      error instanceof Error
        ? error.message
        : "OpenAI failed to generate a response."
    return Errors.badRequest(message)
  }

  let fullContent = ""
  let promptTokens = 0
  let completionTokens = 0

  const readable = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      try {
        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content ?? ""
          if (delta) {
            fullContent += delta
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: delta })}\n\n`))
          }
          if (chunk.usage) {
            promptTokens = chunk.usage.prompt_tokens
            completionTokens = chunk.usage.completion_tokens
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"))
        controller.close()
      } catch {
        controller.error(new Error("Stream error"))
      } finally {
        // Persist assistant message after stream completes
        await supabase.from("message").insert({
          chat_id: chatId,
          role: "assistant",
          content: fullContent,
          metadata: {
            model: "gpt-4o",
            prompt_tokens: promptTokens,
            completion_tokens: completionTokens,
            finish_reason: "stop",
          },
        })

        // Touch chat's updated_at so it surfaces at top of list
        await supabase
          .from("chat")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", chatId)
      }
    },
  })

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}
