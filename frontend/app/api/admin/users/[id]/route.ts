import { type NextRequest } from "next/server"

import { getUser } from "@/lib/api/auth"
import { Errors, ok } from "@/lib/api/response"
import { supabaseAdmin } from "@/lib/supabase/admin"

async function assertSuperAdmin(userId: string) {
  const { data: profile } = await supabaseAdmin
    .from("users")
    .select("platform_role")
    .eq("id", userId)
    .maybeSingle()

  return profile?.platform_role === "super_admin"
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getUser()
  if (!auth.ok) return auth.response

  const isSuperAdmin = await assertSuperAdmin(auth.user.id)
  if (!isSuperAdmin) return Errors.forbidden("Super admin access required.")

  const { id: targetUserId } = await params
  if (targetUserId === auth.user.id) {
    return Errors.badRequest("You cannot remove your own admin account.")
  }

  const { data: targetUser } = await supabaseAdmin
    .from("users")
    .select("id, email, full_name, platform_role")
    .eq("id", targetUserId)
    .maybeSingle()

  if (!targetUser) return Errors.notFound("User")

  if (targetUser.platform_role === "super_admin") {
    const { count } = await supabaseAdmin
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("platform_role", "super_admin")

    if ((count ?? 0) <= 1) {
      return Errors.badRequest("Cannot remove the last super admin.")
    }
  }

  const { data: ownedWorkspaces, error: ownedError } = await supabaseAdmin
    .from("workspace")
    .select("id, name")
    .eq("owner_id", targetUserId)

  if (ownedError) return Errors.internal()

  const requiresWorkspaceDeletion = (ownedWorkspaces ?? []).length > 0
  const confirmedWorkspaceDeletion =
    request.nextUrl.searchParams.get("confirmWorkspaceDeletion") === "true"

  if (requiresWorkspaceDeletion && !confirmedWorkspaceDeletion) {
    return Errors.conflict("This user owns workspaces that must be deleted first.")
  }

  if (requiresWorkspaceDeletion) {
    const { error } = await supabaseAdmin
      .from("workspace")
      .delete()
      .eq("owner_id", targetUserId)

    if (error) return Errors.internal()
  }

  await supabaseAdmin
    .from("waitlist")
    .update({ reviewed_by: null })
    .eq("reviewed_by", targetUserId)

  if (targetUser.email) {
    await supabaseAdmin
      .from("waitlist")
      .delete()
      .eq("email", targetUser.email.toLowerCase())
  }

  await Promise.all([
    supabaseAdmin.from("invitation").update({ invited_by: auth.user.id }).eq("invited_by", targetUserId),
    supabaseAdmin.from("integration").update({ created_by: auth.user.id }).eq("created_by", targetUserId),
    supabaseAdmin.from("chat").update({ created_by: auth.user.id }).eq("created_by", targetUserId),
    supabaseAdmin.from("skill").update({ created_by: auth.user.id }).eq("created_by", targetUserId),
    supabaseAdmin.from("automation").update({ created_by: auth.user.id }).eq("created_by", targetUserId),
    supabaseAdmin.from("schedule").update({ created_by: auth.user.id }).eq("created_by", targetUserId),
    supabaseAdmin.from("api_key").update({ created_by: auth.user.id }).eq("created_by", targetUserId),
    supabaseAdmin.from("file").update({ uploaded_by: auth.user.id }).eq("uploaded_by", targetUserId),
  ])

  const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(targetUserId)
  if (authDeleteError) {
    const { error: profileDeleteError } = await supabaseAdmin
      .from("users")
      .delete()
      .eq("id", targetUserId)

    if (profileDeleteError) return Errors.badRequest(authDeleteError.message)
  }

  return ok({
    success: true,
    deletedWorkspaces: ownedWorkspaces ?? [],
  })
}
