import { type NextRequest } from "next/server"
import { getUser } from "@/lib/api/auth"
import { getWorkspaceIdOrPlatformWorkspace } from "@/lib/api/workspace"
import { ok, Errors } from "@/lib/api/response"
import { createChatSchema } from "@/lib/validations/chat"

export async function GET(request: NextRequest) {
  const auth = await getUser()
  if (!auth.ok) return auth.response

  const ws = await getWorkspaceIdOrPlatformWorkspace(request, auth.user)
  if (!ws.ok) return ws.response

  const { supabase } = auth

  const { data: participations, error: participationsError } = await supabase
    .from("chats_users")
    .select("chat_id")
    .eq("user_id", auth.user.id)

  if (participationsError) return Errors.internal()

  const chatIds = (participations ?? []).map((row) => row.chat_id)
  if (chatIds.length === 0) return ok({ chats: [] })

  const { data, error } = await supabase
    .from("chat")
    .select("id, title, status, created_by, created_at, updated_at")
    .eq("workspace_id", ws.workspaceId)
    .in("id", chatIds)
    .order("updated_at", { ascending: false })

  if (error) return Errors.internal()

  return ok({ chats: data })
}

export async function POST(request: NextRequest) {
  const auth = await getUser()
  if (!auth.ok) return auth.response

  const ws = await getWorkspaceIdOrPlatformWorkspace(request, auth.user)
  if (!ws.ok) return ws.response

  const { supabase, user } = auth

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Errors.badRequest("Invalid JSON body.")
  }

  const parsed = createChatSchema.safeParse(body)
  if (!parsed.success) {
    return Errors.validationError(parsed.error.issues[0].message)
  }

  const { data: chat, error } = await supabase
    .from("chat")
    .insert({
      workspace_id: ws.workspaceId,
      created_by: user.id,
      title: parsed.data.title,
    })
    .select()
    .single()

  if (error) return Errors.internal()

  // Auto-add creator as a chat participant
  await supabase.from("chats_users").insert({
    chat_id: chat.id,
    user_id: user.id,
  })

  return ok({ chat }, 201)
}
