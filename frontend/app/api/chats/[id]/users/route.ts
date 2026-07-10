import { type NextRequest } from "next/server"
import { getUser } from "@/lib/api/auth"
import { ok, Errors } from "@/lib/api/response"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { addChatUserSchema, removeChatUserSchema } from "@/lib/validations/chat"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getUser()
  if (!auth.ok) return auth.response

  const { supabase } = auth
  const { id: chatId } = await params

  const { data, error } = await supabase
    .from("chats_users")
    .select("user:user_id(id, email, full_name, avatar_url, status)")
    .eq("chat_id", chatId)

  if (error) return Errors.internal()

  return ok({ users: data })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getUser()
  if (!auth.ok) return auth.response

  const { supabase } = auth
  const { id: chatId } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Errors.badRequest("Invalid JSON body.")
  }

  const parsed = addChatUserSchema.safeParse(body)
  if (!parsed.success) return Errors.validationError(parsed.error.issues[0].message)

  const { data: chat, error: chatError } = await supabase
    .from("chat")
    .select("id, workspace_id")
    .eq("id", chatId)
    .maybeSingle()

  if (chatError) return Errors.internal()
  if (!chat) return Errors.notFound("Chat")

  const [{ data: targetUser }, { data: targetMembership }] = await Promise.all([
    supabaseAdmin
      .from("users")
      .select("id, status")
      .eq("id", parsed.data.user_id)
      .maybeSingle(),
    supabaseAdmin
      .from("workspace_member")
      .select("user_id")
      .eq("workspace_id", chat.workspace_id)
      .eq("user_id", parsed.data.user_id)
      .eq("status", "active")
      .maybeSingle(),
  ])

  if (!targetUser || targetUser.status !== "active") {
    return Errors.badRequest("Only active Atmet users can be added to a chat.")
  }

  if (!targetMembership) {
    return Errors.badRequest("Only active members of this workspace can be added to this chat.")
  }

  const { error } = await supabaseAdmin.from("chats_users").insert({
    chat_id: chatId,
    user_id: parsed.data.user_id,
  })

  if (error) {
    if (error.code === "23505") return Errors.conflict("User is already in this chat.")
    return Errors.internal()
  }

  return ok({ success: true }, 201)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getUser()
  if (!auth.ok) return auth.response

  const { supabase } = auth
  const { id: chatId } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Errors.badRequest("Invalid JSON body.")
  }

  const parsed = removeChatUserSchema.safeParse(body)
  if (!parsed.success) return Errors.validationError(parsed.error.issues[0].message)

  const { data: chat, error: chatError } = await supabase
    .from("chat")
    .select("id")
    .eq("id", chatId)
    .maybeSingle()

  if (chatError) return Errors.internal()
  if (!chat) return Errors.notFound("Chat")

  await supabaseAdmin
    .from("chats_users")
    .delete()
    .eq("chat_id", chatId)
    .eq("user_id", parsed.data.user_id)

  return ok({ success: true })
}
