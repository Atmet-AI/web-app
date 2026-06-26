import { type NextRequest } from "next/server"
import { getUser } from "@/lib/api/auth"
import { assertWorkspaceAdmin } from "@/lib/api/workspace"
import { ok, Errors } from "@/lib/api/response"
import { updateMemberRoleSchema } from "@/lib/validations/workspace"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const auth = await getUser()
  if (!auth.ok) return auth.response

  const { supabase, user } = auth
  const { id: workspaceId, userId } = await params

  const isAdmin = await assertWorkspaceAdmin(supabase, workspaceId, user.id)
  if (!isAdmin) return Errors.forbidden()

  // Prevent demoting the workspace owner
  const { data: workspace } = await supabase
    .from("workspace")
    .select("owner_id")
    .eq("id", workspaceId)
    .maybeSingle()

  if (workspace?.owner_id === userId) {
    return Errors.badRequest("Cannot change the role of the workspace owner.")
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Errors.badRequest("Invalid JSON body.")
  }

  const parsed = updateMemberRoleSchema.safeParse(body)
  if (!parsed.success) {
    return Errors.validationError(parsed.error.issues[0].message)
  }

  const { data, error } = await supabase
    .from("workspace_member")
    .update({ role: parsed.data.role })
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .select()
    .single()

  if (error || !data) {
    return Errors.notFound("Member")
  }

  return ok({ member: data })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const auth = await getUser()
  if (!auth.ok) return auth.response

  const { supabase, user } = auth
  const { id: workspaceId, userId } = await params

  const isSelf = user.id === userId
  const isAdmin = await assertWorkspaceAdmin(supabase, workspaceId, user.id)

  if (!isSelf && !isAdmin) return Errors.forbidden()

  // Prevent removing the workspace owner
  const { data: workspace } = await supabase
    .from("workspace")
    .select("owner_id")
    .eq("id", workspaceId)
    .maybeSingle()

  if (workspace?.owner_id === userId) {
    return Errors.badRequest("Cannot remove the workspace owner.")
  }

  const { error } = await supabase
    .from("workspace_member")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)

  if (error) {
    return Errors.internal()
  }

  return ok({ success: true })
}
