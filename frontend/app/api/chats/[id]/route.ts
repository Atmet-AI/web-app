import { type NextRequest } from "next/server"
import { getUser } from "@/lib/api/auth"
import { ok, Errors } from "@/lib/api/response"
import { updateChatSchema } from "@/lib/validations/chat"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getUser()
  if (!auth.ok) return auth.response

  const { supabase } = auth
  const { id } = await params

  const { data: chat, error } = await supabase
    .from("chat")
    .select("id, title, status, created_by, workspace_id, created_at, updated_at")
    .eq("id", id)
    .maybeSingle()

  if (error || !chat) return Errors.notFound("Chat")

  // Fetch linked resources
  const [usersRes, skillsRes, automationsRes, schedulesRes] = await Promise.all([
    supabase
      .from("chats_users")
      .select("user:user_id(id, email, full_name)")
      .eq("chat_id", id),
    supabase
      .from("chats_skill")
      .select("skill:skill_id(id, name, type, status)")
      .eq("chat_id", id),
    supabase
      .from("chats_automation")
      .select("automation:automation_id(id, name, status)")
      .eq("chat_id", id),
    supabase
      .from("chats_schedule")
      .select("schedule:schedule_id(id, name, cron_expression, status)")
      .eq("chat_id", id),
  ])

  return ok({
    chat,
    users: usersRes.data ?? [],
    skills: skillsRes.data ?? [],
    automations: automationsRes.data ?? [],
    schedules: schedulesRes.data ?? [],
  })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getUser()
  if (!auth.ok) return auth.response

  const { supabase } = auth
  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Errors.badRequest("Invalid JSON body.")
  }

  const parsed = updateChatSchema.safeParse(body)
  if (!parsed.success) {
    return Errors.validationError(parsed.error.issues[0].message)
  }

  const { data, error } = await supabase
    .from("chat")
    .update(parsed.data)
    .eq("id", id)
    .select()
    .single()

  if (error || !data) return Errors.notFound("Chat")

  return ok({ chat: data })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getUser()
  if (!auth.ok) return auth.response

  const { supabase } = auth
  const { id } = await params

  const { error } = await supabase.from("chat").delete().eq("id", id)

  if (error) return Errors.internal()

  return ok({ success: true })
}
