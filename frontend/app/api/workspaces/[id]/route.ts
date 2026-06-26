import { type NextRequest } from "next/server"
import { getUser } from "@/lib/api/auth"
import { assertWorkspaceAdmin } from "@/lib/api/workspace"
import { ok, Errors } from "@/lib/api/response"
import { updateWorkspaceSchema } from "@/lib/validations/workspace"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getUser()
  if (!auth.ok) return auth.response

  const { supabase } = auth
  const { id } = await params

  const { data, error } = await supabase
    .from("workspace")
    .select("id, name, plan, status, owner_id, avatar_url, created_at, updated_at")
    .eq("id", id)
    .maybeSingle()

  if (error || !data) {
    return Errors.notFound("Workspace")
  }

  return ok({ workspace: data })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getUser()
  if (!auth.ok) return auth.response

  const { supabase, user } = auth
  const { id } = await params

  const isAdmin = await assertWorkspaceAdmin(supabase, id, user.id)
  if (!isAdmin) return Errors.forbidden()

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Errors.badRequest("Invalid JSON body.")
  }

  const parsed = updateWorkspaceSchema.safeParse(body)
  if (!parsed.success) {
    return Errors.validationError(parsed.error.issues[0].message)
  }

  const { data, error } = await supabase
    .from("workspace")
    .update(parsed.data)
    .eq("id", id)
    .select()
    .single()

  if (error) {
    return Errors.internal()
  }

  return ok({ workspace: data })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getUser()
  if (!auth.ok) return auth.response

  const { supabase, user } = auth
  const { id } = await params

  const { data: workspace } = await supabase
    .from("workspace")
    .select("owner_id")
    .eq("id", id)
    .maybeSingle()

  if (!workspace) return Errors.notFound("Workspace")
  if (workspace.owner_id !== user.id) return Errors.forbidden()

  const { error } = await supabase.from("workspace").delete().eq("id", id)

  if (error) {
    return Errors.internal()
  }

  return ok({ success: true })
}
