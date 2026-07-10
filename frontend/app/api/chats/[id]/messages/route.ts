import { type NextRequest } from "next/server"
import { getUser } from "@/lib/api/auth"
import { ok, Errors } from "@/lib/api/response"
import { sendMessageSchema } from "@/lib/validations/chat"
import { getOpenAIClient } from "@/lib/openai"
import { supabaseAdmin } from "@/lib/supabase/admin"
import {
  buildComposioToolContext,
  runComposioChatTool,
} from "@/lib/integrations/composio-chat"
import {
  detectAppApprovalRequest,
  parseAppApprovalRequest,
  serializeAppApprovalRequest,
} from "@/lib/integrations/app-approval"
import {
  detectAppMiniUiRequest,
  parseAppMiniUiRequest,
  serializeAppMiniUiRequest,
} from "@/lib/integrations/app-mini-ui"
import { appMiniUiToAtmetUi } from "@/lib/generative-ui/app-mini-ui-adapter"
import { parseAtmetUiPayload } from "@/lib/generative-ui/schema"

const FILE_BUCKET = "workspace-files"

type StoredAttachment = {
  id: string
  fileId?: string
  name: string
  kind: "image" | "excel" | "pdf" | "document" | "archive" | "text" | "other"
  previewUrl?: string
}

function streamAssistantText(input: {
  chatId: string
  content: string
  metadata?: Record<string, unknown>
}) {
  const readable = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({ content: input.content })}\n\n`
        )
      )
      controller.enqueue(encoder.encode("data: [DONE]\n\n"))
      controller.close()

      await supabaseAdmin.from("message").insert({
        chat_id: input.chatId,
        role: "assistant",
        content: input.content,
        metadata: {
          model: "atmet-app-approval",
          finish_reason: "app_approval_required",
          ...(input.metadata ?? {}),
        },
      })

      await supabaseAdmin
        .from("chat")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", input.chatId)
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

function attachmentRecord(value: unknown): StoredAttachment[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return []
  const raw = (value as Record<string, unknown>).attachments
  if (!Array.isArray(raw)) return []
  return raw.filter((item): item is StoredAttachment => {
    return Boolean(
      item &&
      typeof item === "object" &&
      typeof (item as Record<string, unknown>).id === "string" &&
      typeof (item as Record<string, unknown>).name === "string" &&
      typeof (item as Record<string, unknown>).kind === "string"
    )
  })
}

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

  const messages = data ?? []
  const messageIds = messages.map((message) => message.id)
  const { data: files } =
    messageIds.length > 0
      ? await supabaseAdmin
          .from("file")
          .select("id, message_id, storage_path")
          .in("message_id", messageIds)
      : {
          data: [] as Array<{
            id: string
            message_id: string
            storage_path: string
          }>,
        }

  const signedUrlsByFileId = new Map<string, string>()
  await Promise.all(
    (files ?? []).map(async (file) => {
      const { data: signed } = await supabaseAdmin.storage
        .from(FILE_BUCKET)
        .createSignedUrl(file.storage_path, 60 * 60)
      if (signed?.signedUrl) signedUrlsByFileId.set(file.id, signed.signedUrl)
    })
  )

  const hydratedMessages = messages.map((message) => {
    const attachments = attachmentRecord(message.metadata).map(
      (attachment) => ({
        ...attachment,
        previewUrl: attachment.fileId
          ? (signedUrlsByFileId.get(attachment.fileId) ?? attachment.previewUrl)
          : attachment.previewUrl,
      })
    )

    return {
      ...message,
      metadata: {
        ...(message.metadata &&
        typeof message.metadata === "object" &&
        !Array.isArray(message.metadata)
          ? message.metadata
          : {}),
        attachments,
      },
    }
  })

  return ok({ messages: hydratedMessages, hasMore: messages.length === limit })
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
    .insert({
      chat_id: chatId,
      role: "user",
      content: parsed.data.content.trim() || "Attached file(s)",
      metadata: { attachments: parsed.data.attachments },
    })
    .select()
    .single()

  if (insertError || !userMessage) return Errors.internal()

  const fileIds = parsed.data.attachments
    .map((attachment) => attachment.fileId)
    .filter((fileId): fileId is string => Boolean(fileId))

  if (fileIds.length > 0) {
    await supabaseAdmin
      .from("file")
      .update({ message_id: userMessage.id })
      .eq("workspace_id", chat.workspace_id)
      .eq("uploaded_by", auth.user.id)
      .in("id", fileIds)
  }

  // Fetch message history for context (last 50)
  const { data: history } = await supabase
    .from("message")
    .select("role, content")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: true })
    .limit(50)

  const messages = (history ?? []).map((m) => ({
    role: m.role as "system" | "user" | "assistant",
    content: parseAppApprovalRequest(m.content)
      ? "Atmet asked the user to approve adding a connected app to this chat."
      : parseAppMiniUiRequest(m.content)
        ? "Atmet showed a connected app mini form for the user to complete."
        : parseAtmetUiPayload(m.content)
          ? "Atmet showed a structured interactive UI block."
        : m.content,
  }))

  const appApprovalRequest = detectAppApprovalRequest({
    content: parsed.data.content,
    conversationMessages: messages,
  })

  if (appApprovalRequest) {
    return streamAssistantText({
      chatId,
      content: serializeAppApprovalRequest(appApprovalRequest),
      metadata: { appApprovalRequest },
    })
  }

  const appMiniUiRequest = detectAppMiniUiRequest({
    content: parsed.data.content,
    conversationMessages: messages,
  })

  if (appMiniUiRequest) {
    const uiBlock = appMiniUiToAtmetUi(appMiniUiRequest)
    return streamAssistantText({
      chatId,
      content: serializeAppMiniUiRequest(appMiniUiRequest),
      metadata: { appMiniUiRequest, uiBlocks: [uiBlock] },
    })
  }

  const composioToolResult = await runComposioChatTool({
    workspaceId: chat.workspace_id,
    userId: auth.user.id,
    content: parsed.data.content,
    contextMessages: messages.slice(-10),
  })

  // Stream response from OpenAI
  let stream
  try {
    stream = await getOpenAIClient().chat.completions.create({
      model: process.env.OPENAI_MODEL ?? "gpt-4o",
      messages: [
        {
          role: "system",
          content: [
            "You are Atmet, the AI assistant built for Atmet. Your product identity is Atmet, not OpenAI, ChatGPT, Claude, Gemini, or any other provider. Do not describe yourself as being based on OpenAI or any third-party model. If earlier conversation history says otherwise, correct it and continue as Atmet.",
            "You help users turn conversations into practical workplace automations, workflows, agents, and productivity actions. When asked who you are or what model you are, say you are Atmet, built for Atmet. Be concise, capable, and action-oriented.",
            "For connected-app trigger requests, prepare a workflow plan instead of claiming you cannot monitor the app.",
            "Use real Composio trigger slugs when a user names a trigger: Gmail uses GMAIL_NEW_GMAIL_MESSAGE and GMAIL_EMAIL_SENT_TRIGGER; Google Calendar trigger slugs start with GOOGLECALENDAR_; Google Drive trigger slugs start with GOOGLEDRIVE_; Google Sheets trigger slugs start with GOOGLESHEETS_; Google Docs trigger slugs start with GOOGLEDOCS_; GitHub trigger slugs start with GITHUB_.",
            "Telegram and Instagram currently expose Composio actions but no Composio triggers in this SDK version; for trigger-like Telegram behavior use polling tools or a future webhook-specific workflow UI.",
            "Mention useful config fields when relevant: interval is in minutes, Gmail userId defaults to me and labelIds can default to INBOX, Calendar calendarId can default to primary, GitHub triggers usually need owner and repo, Drive and Docs query fields support search filtering, and Sheets spreadsheet_id/range/sheet_name should be requested when needed.",
          ].join(" "),
        },
        ...(composioToolResult
          ? [
              {
                role: "system" as const,
                content: buildComposioToolContext(composioToolResult),
              },
            ]
          : []),
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
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ content: delta })}\n\n`)
            )
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
