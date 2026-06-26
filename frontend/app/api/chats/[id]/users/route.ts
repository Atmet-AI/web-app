import { type NextRequest } from "next/server"
import { getUser } from "@/lib/api/auth"
import { ok, Errors } from "@/lib/api/response"
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
    .select("user:user_id(id, email, full_name, status)")
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

  const { error } = await supabase.from("chats_users").insert({
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

  await supabase
    .from("chats_users")
    .delete()
    .eq("chat_id", chatId)
    .eq("user_id", parsed.data.user_id)

  return ok({ success: true })
}
