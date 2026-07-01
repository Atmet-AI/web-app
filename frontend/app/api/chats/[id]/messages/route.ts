import { type NextRequest } from "next/server"
import { getUser } from "@/lib/api/auth"
import { ok, Errors } from "@/lib/api/response"
import { sendMessageSchema } from "@/lib/validations/chat"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { runProjectSpecGraph } from "@/lib/agents/projectSpecGraph"

const FILE_BUCKET = "workspace-files"

type StoredAttachment = {
  id: string
  fileId?: string
  name: string
  kind: "image" | "excel" | "pdf" | "document" | "archive" | "text" | "other"
  previewUrl?: string
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

function streamAssistantReply(
  content: string,
  metadata?: Record<string, unknown>
) {
  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content, metadata })}\n\n`))
      controller.enqueue(encoder.encode("data: [DONE]\n\n"))
      controller.close()
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

async function ensureWorkspaceFilesBucket() {
  const { data: existingBuckets } = await supabaseAdmin.storage.listBuckets()
  if (existingBuckets?.some((bucket) => bucket.name === FILE_BUCKET)) return null

  const { error } = await supabaseAdmin.storage.createBucket(FILE_BUCKET, {
    public: false,
    fileSizeLimit: 250 * 1024 * 1024,
  })

  return error
}

function taskSpecPath(workspaceId: string, chatId: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
  return `${workspaceId}/task-specs/${chatId}-${timestamp}.txt`
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
  const { data: files } = messageIds.length > 0
    ? await supabaseAdmin
        .from("file")
        .select("id, message_id, storage_path")
        .in("message_id", messageIds)
    : { data: [] as Array<{ id: string; message_id: string; storage_path: string }> }

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
    const attachments = attachmentRecord(message.metadata).map((attachment) => ({
      ...attachment,
      previewUrl: attachment.fileId
        ? signedUrlsByFileId.get(attachment.fileId) ?? attachment.previewUrl
        : attachment.previewUrl,
    }))

    return {
      ...message,
      metadata: {
        ...(message.metadata && typeof message.metadata === "object" && !Array.isArray(message.metadata)
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
  const { data: chat, error: chatError } = await supabase
    .from("chat")
    .select("id, workspace_id, project_spec")
    .eq("id", chatId)
    .maybeSingle()

  if (chatError) {
    if (
      chatError.message.includes("project_spec") ||
      chatError.message.includes("schema cache")
    ) {
      return Errors.badRequest(
        "Database migration required: add the chat.project_spec jsonb column."
      )
    }
    return Errors.internal()
  }

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

  let graphResult
  try {
    graphResult = await runProjectSpecGraph(
      chat.project_spec,
      parsed.data.content.trim() || "Attached file(s)"
    )
  } catch (error) {
    if (error instanceof Error && error.message.includes("OPENAI_API_KEY")) {
      return Errors.badRequest("OPENAI_API_KEY is not configured.")
    }
    const message =
      error instanceof Error
        ? error.message
        : "Atmet failed to generate a response."
    return Errors.badRequest(message)
  }

  const assistantReply =
    graphResult.assistant_reply ?? "What should this automation do next?"
  const model = process.env.OPENAI_MODEL ?? "gpt-4o"
  const persistedProjectSpec = {
    goal: graphResult.goal,
    inputs: graphResult.inputs,
    constraints: graphResult.constraints,
    schedule: graphResult.schedule,
    outputs: graphResult.outputs,
    gaps: graphResult.gaps,
    conversation: graphResult.conversation,
    status: graphResult.status,
    final_description: graphResult.final_description,
  }

  if (graphResult.terminal_node === "finalize_task") {
    const bucketError = await ensureWorkspaceFilesBucket()
    if (bucketError) return Errors.internal()

    const storagePath = taskSpecPath(chat.workspace_id, chatId)
    const fileBody = new TextEncoder().encode(assistantReply)
    const { error: uploadError } = await supabaseAdmin.storage
      .from(FILE_BUCKET)
      .upload(storagePath, fileBody, {
        contentType: "text/plain",
        upsert: false,
      })

    if (uploadError) return Errors.internal()

    const { data: assistantMessage, error: assistantInsertError } = await supabase
      .from("message")
      .insert({
        chat_id: chatId,
        role: "assistant",
        content: assistantReply,
        // Frontend hook: render Accept/Reject controls when metadata.taskReview exists.
        metadata: {
          model,
          finish_reason: "task_ready_for_review",
          taskReview: {
            fileId: null,
            status: "pending",
            specSummary: assistantReply,
          },
        },
      })
      .select()
      .single()

    if (assistantInsertError || !assistantMessage) return Errors.internal()

    const { data: file, error: fileInsertError } = await supabaseAdmin
      .from("file")
      .insert({
        workspace_id: chat.workspace_id,
        uploaded_by: auth.user.id,
        message_id: assistantMessage.id,
        name: "automation-task-description.txt",
        mime_type: "text/plain",
        size_bytes: fileBody.byteLength,
        storage_path: storagePath,
      })
      .select()
      .single()

    if (fileInsertError || !file) return Errors.internal()

    const reviewMetadata = {
      model,
      finish_reason: "task_ready_for_review",
      taskReview: {
        fileId: file.id,
        status: "pending",
        specSummary: assistantReply,
      },
    }

    const { error: metadataUpdateError } = await supabase
      .from("message")
      .update({
        metadata: reviewMetadata,
      })
      .eq("id", assistantMessage.id)

    if (metadataUpdateError) return Errors.internal()

    const { error: chatUpdateError } = await supabase
      .from("chat")
      .update({
        project_spec: persistedProjectSpec,
        updated_at: new Date().toISOString(),
      })
      .eq("id", chatId)

    if (chatUpdateError) return Errors.internal()

    return streamAssistantReply(assistantReply, {
      messageId: assistantMessage.id,
      taskReview: reviewMetadata.taskReview,
      file,
      projectSpec: persistedProjectSpec,
    })
  }

  const { error: assistantInsertError } = await supabase.from("message").insert({
    chat_id: chatId,
    role: "assistant",
    content: assistantReply,
    metadata: {
      model,
      finish_reason: "clarification_requested",
    },
  })

  if (assistantInsertError) return Errors.internal()

  const { error: chatUpdateError } = await supabase
    .from("chat")
    .update({
      project_spec: persistedProjectSpec,
      updated_at: new Date().toISOString(),
    })
    .eq("id", chatId)

  if (chatUpdateError) return Errors.internal()

  return streamAssistantReply(assistantReply)
}
