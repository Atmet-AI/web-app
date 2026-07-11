import { type NextRequest } from "next/server"
import type { SupabaseClient } from "@supabase/supabase-js"
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
const SKILL_BUCKET = "skill-assets"
const CREATE_SKILL_COMMAND = "create skill"
const TEXT_SKILL_FILE_EXTENSIONS = new Set([
  "md",
  "mdx",
  "txt",
  "json",
  "yaml",
  "yml",
  "csv",
  "ts",
  "tsx",
  "js",
  "jsx",
])

type StoredAttachment = {
  id: string
  fileId?: string
  name: string
  kind: "image" | "excel" | "pdf" | "document" | "archive" | "text" | "other"
  previewUrl?: string
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

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function stripCreateSkillCommand(content: string) {
  return content.replace(new RegExp(`^\\s*\\/${escapeRegex(CREATE_SKILL_COMMAND)}\\s*`, "i"), "").trim()
}

function inferSkillName(content: string) {
  const cleaned = stripCreateSkillCommand(content)
    .replace(/\s+/g, " ")
    .replace(/^(build|create|make|draft|write)\s+(a\s+)?(new\s+)?skill\s+(that|to|for)?\s*/i, "")
    .trim()

  if (!cleaned) return "Untitled skill"
  const words = cleaned.split(/\s+/).slice(0, 6)
  return words
    .join(" ")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .slice(0, 100) || "Untitled skill"
}

function inferSkillCategory(content: string) {
  const lower = content.toLowerCase()
  if (/(write|draft|copy|email|post|blog|doc|document)/.test(lower)) return "Writing"
  if (/(research|find|source|cite|compare|market)/.test(lower)) return "Research"
  if (/(analyze|analysis|review|summarize|classify|decide|reason)/.test(lower)) return "Analysis"
  if (/(support|ticket|reply|customer|help|faq)/.test(lower)) return "Support"
  if (/(data|csv|sheet|spreadsheet|extract|parse|report|analytics)/.test(lower)) return "Data"
  if (/(sales|lead|deal|crm|prospect)/.test(lower)) return "Sales"
  if (/(marketing|seo|campaign|content|brand)/.test(lower)) return "Marketing"
  if (/(engineer|code|github|release|bug|deploy)/.test(lower)) return "Engineering"
  if (/(finance|invoice|budget|expense|revenue)/.test(lower)) return "Finance"
  if (/(legal|contract|policy|compliance|terms)/.test(lower)) return "Legal"
  if (/(hr|hiring|recruit|employee|people)/.test(lower)) return "HR"
  if (/(operations|ops|process|handoff)/.test(lower)) return "Operations"
  if (/(communicate|message|slack|meeting|follow up|follow-up)/.test(lower)) return "Communication"
  if (/(productivity|organize|plan|schedule|prioritize)/.test(lower)) return "Productivity"
  return "Automation"
}

async function createSkillFromChat(input: {
  chatId: string
  workspaceId: string
  userId: string
  messageId: string
  content: string
}) {
  const instructions = stripCreateSkillCommand(input.content)
  if (instructions.length < 8) {
    return {
      content: "Tell me what this skill should do after `/create skill`, and I will build it for this workspace.",
      skill: null,
    }
  }

  const name = inferSkillName(input.content)
  const category = inferSkillCategory(input.content)
  const description = instructions.length > 220 ? `${instructions.slice(0, 217)}...` : instructions

  const { data: skill, error } = await supabaseAdmin
    .from("skill")
    .insert({
      workspace_id: input.workspaceId,
      created_by: input.userId,
      scope: "workspace",
      name,
      description,
      type: "agent",
      status: "active",
      image_url: null,
      definition: {
        source: "atmet_chat",
        category,
        instructions,
        chat_id: input.chatId,
        message_id: input.messageId,
      },
    })
    .select("id, name, description, definition, type, scope, status")
    .single()

  if (error || !skill) return null

  return {
    skill,
    content: `Created skill: ${skill.name}\n\nIt is now available from the Skills page and can be used in chat with /${skill.name}.`,
  }
}

function isTextSkillFile(file: Record<string, unknown>) {
  const path = typeof file.path === "string" ? file.path : ""
  const mime = typeof file.mime_type === "string" ? file.mime_type : ""
  const extension = path.includes(".") ? path.split(".").pop()?.toLowerCase() ?? "" : ""
  return mime.startsWith("text/") || mime.includes("json") || TEXT_SKILL_FILE_EXTENSIONS.has(extension)
}

async function readSkillPackageFiles(definition: Record<string, unknown>) {
  const packageInfo = readRecord(definition.package)
  const rawFiles = Array.isArray(packageInfo.files) ? packageInfo.files : []
  const files = rawFiles.map(readRecord).filter(isTextSkillFile).slice(0, 6)
  const snippets: string[] = []
  let remainingChars = 12000

  for (const file of files) {
    const storagePath = typeof file.storage_path === "string" ? file.storage_path : ""
    const displayPath = typeof file.path === "string" ? file.path : storagePath
    if (!storagePath || remainingChars <= 0) continue

    const { data, error } = await supabaseAdmin.storage
      .from(SKILL_BUCKET)
      .download(storagePath)
    if (error || !data) continue

    const text = (await data.text()).slice(0, remainingChars)
    remainingChars -= text.length
    snippets.push(`File: ${displayPath}\n${text}`)
  }

  return snippets
}

async function buildMentionedSkillContexts(input: {
  workspaceId: string
  content: string
}) {
  const { data: skills } = await supabaseAdmin
    .from("skill")
    .select("id, name, description, definition, type, scope, status")
    .or(`workspace_id.eq.${input.workspaceId},scope.eq.system`)
    .eq("status", "active")

  const selected = (skills ?? []).filter((skill) => {
    const name = String(skill.name ?? "").trim()
    if (!name || name.toLowerCase() === CREATE_SKILL_COMMAND) return false
    return new RegExp(`(^|\\s)\\/${escapeRegex(name)}(?=\\s|$|[.,!?;:])`, "i").test(input.content)
  })

  const contexts: string[] = []
  for (const skill of selected) {
    const definition = readRecord(skill.definition)
    const fileSnippets = await readSkillPackageFiles(definition)
    contexts.push(
      [
        `Skill: ${skill.name}`,
        `Description: ${skill.description ?? "No description"}`,
        `Type: ${skill.type}`,
        `Source: ${typeof definition.source === "string" ? definition.source : skill.scope}`,
        `Definition: ${JSON.stringify(definition, null, 2)}`,
        fileSnippets.length > 0 ? `Skill files:\n${fileSnippets.join("\n\n---\n\n")}` : "",
      ].filter(Boolean).join("\n")
    )
  }

  return contexts
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getUser()
  if (!auth.ok) return auth.response

  const { supabase, user } = auth
  const { id: chatId } = await params

  const canAccessChat = await isChatParticipant(supabase, chatId, user.id)
  if (canAccessChat === null) return Errors.internal()
  if (!canAccessChat) return Errors.notFound("Chat")

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

  const { supabase, user } = auth
  const { id: chatId } = await params

  const canAccessChat = await isChatParticipant(supabase, chatId, user.id)
  if (canAccessChat === null) return Errors.internal()
  if (!canAccessChat) return Errors.notFound("Chat")

  // Verify chat exists and hydrate its workspace for file/tool scoping.
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

  const nextUserContent = parsed.data.content.trim() || "Attached file(s)"
  let userMessage: {
    id: string
    created_at: string
  } | null = null

  if (parsed.data.editMessageId) {
    const { data: editableMessage, error: editableError } = await supabaseAdmin
      .from("message")
      .select("id, role, created_at")
      .eq("id", parsed.data.editMessageId)
      .eq("chat_id", chatId)
      .maybeSingle()

    if (editableError) return Errors.internal()
    if (!editableMessage || editableMessage.role !== "user") {
      return Errors.notFound("Message")
    }

    const { error: deleteLaterError } = await supabaseAdmin
      .from("message")
      .delete()
      .eq("chat_id", chatId)
      .gt("created_at", editableMessage.created_at)

    if (deleteLaterError) return Errors.internal()

    const { data: updatedMessage, error: updateError } = await supabaseAdmin
      .from("message")
      .update({
        content: nextUserContent,
        metadata: { attachments: parsed.data.attachments },
      })
      .eq("id", editableMessage.id)
      .eq("chat_id", chatId)
      .select("id, created_at")
      .single()

    if (updateError || !updatedMessage) return Errors.internal()
    userMessage = updatedMessage
  } else {
    const { data: insertedMessage, error: insertError } = await supabase
      .from("message")
      .insert({
        chat_id: chatId,
        role: "user",
        content: nextUserContent,
        metadata: { attachments: parsed.data.attachments },
      })
      .select("id, created_at")
      .single()

    if (insertError || !insertedMessage) return Errors.internal()
    userMessage = insertedMessage
  }

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

  if (new RegExp(`^\\s*\\/${escapeRegex(CREATE_SKILL_COMMAND)}(?=\\s|$)`, "i").test(parsed.data.content)) {
    const created = await createSkillFromChat({
      chatId,
      workspaceId: chat.workspace_id,
      userId: auth.user.id,
      messageId: userMessage.id,
      content: parsed.data.content,
    })

    if (!created) return Errors.internal()

    return streamAssistantText({
      chatId,
      content: created.content,
      metadata: {
        model: "atmet-skill-builder",
        finish_reason: "skill_created",
        skill: created.skill,
      },
    })
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
  const mentionedSkillContexts = await buildMentionedSkillContexts({
    workspaceId: chat.workspace_id,
    content: parsed.data.content,
  })

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
        ...(mentionedSkillContexts.length > 0
          ? [
              {
                role: "system" as const,
                content: [
                  "The user mentioned one or more Atmet skills. Read and apply these skill definitions/files as execution instructions for this reply. Do not claim you cannot access the skill; the relevant content is provided here.",
                  mentionedSkillContexts.join("\n\n---\n\n"),
                ].join("\n\n"),
              },
            ]
          : []),
        ...messages,
      ],
      stream: true,
      stream_options: { include_usage: true },
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
            total_tokens: promptTokens + completionTokens,
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
