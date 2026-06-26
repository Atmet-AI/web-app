import { type NextRequest } from "next/server"
import { getUser } from "@/lib/api/auth"
import { ok, Errors } from "@/lib/api/response"
import { updateAutomationSchema } from "@/lib/validations/automation"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getUser()
  if (!auth.ok) return auth.response

  const { supabase } = auth
  const { id } = await params

  const { data, error } = await supabase
    .from("automation")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  if (error || !data) return Errors.notFound("Automation")

  return ok({ automation: data })
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

  const parsed = updateAutomationSchema.safeParse(body)
  if (!parsed.success) return Errors.validationError(parsed.error.issues[0].message)

  const { data, error } = await supabase
    .from("automation")
    .update(parsed.data)
    .eq("id", id)
    .select()
    .single()

  if (error || !data) return Errors.notFound("Automation")

  return ok({ automation: data })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getUser()
  if (!auth.ok) return auth.response

  const { supabase } = auth
  const { id } = await params

  const { error } = await supabase.from("automation").delete().eq("id", id)

  if (error) return Errors.internal()

  return ok({ success: true })
}
