import { type NextRequest } from "next/server"
import { getUser } from "@/lib/api/auth"
import { ok, Errors } from "@/lib/api/response"
import { linkResourceSchema } from "@/lib/validations/chat"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getUser()
  if (!auth.ok) return auth.response

  const { supabase } = auth
  const { id: chatId } = await params

  const { data, error } = await supabase
    .from("chats_schedule")
    .select("schedule:schedule_id(id, name, cron_expression, timezone, status)")
    .eq("chat_id", chatId)

  if (error) return Errors.internal()

  return ok({ schedules: data })
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

  const parsed = linkResourceSchema.safeParse(body)
  if (!parsed.success) return Errors.validationError(parsed.error.issues[0].message)

  const { error } = await supabase.from("chats_schedule").insert({
    chat_id: chatId,
    schedule_id: parsed.data.id,
  })

  if (error) {
    if (error.code === "23505") return Errors.conflict("Schedule is already linked to this chat.")
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

  const parsed = linkResourceSchema.safeParse(body)
  if (!parsed.success) return Errors.validationError(parsed.error.issues[0].message)

  await supabase
    .from("chats_schedule")
    .delete()
    .eq("chat_id", chatId)
    .eq("schedule_id", parsed.data.id)

  return ok({ success: true })
}
