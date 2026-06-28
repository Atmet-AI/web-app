import { type NextRequest } from "next/server"

import { getUser } from "@/lib/api/auth"
import { Errors, ok } from "@/lib/api/response"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { z } from "zod"

const updateUserSchema = z.object({
  full_name: z.string().min(1).max(120).nullable().optional(),
  avatar_url: z.string().nullable().optional(),
  phone_country: z.string().nullable().optional(),
  phone_country_code: z.string().nullable().optional(),
  phone_number: z.string().nullable().optional(),
  status: z.enum(["active", "inactive", "suspended"]).optional(),
  platform_role: z.enum(["user", "admin", "super_admin"]).optional(),
})

async function assertSuperAdmin(userId: string) {
  const { data: profile } = await supabaseAdmin
    .from("users")
    .select("platform_role")
    .eq("id", userId)
    .maybeSingle()

  return profile?.platform_role === "super_admin"
}

async function isLastSuperAdmin(targetUserId: string) {
  const { data: target } = await supabaseAdmin
    .from("users")
    .select("platform_role")
    .eq("id", targetUserId)
    .maybeSingle()

  if (target?.platform_role !== "super_admin") return false

  const { count } = await supabaseAdmin
    .from("users")
    .select("id", { count: "exact", head: true })
    .eq("platform_role", "super_admin")

  return (count ?? 0) <= 1
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getUser()
  if (!auth.ok) return auth.response

  const isSuperAdmin = await assertSuperAdmin(auth.user.id)
  if (!isSuperAdmin) return Errors.forbidden("Super admin access required.")

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Errors.badRequest("Invalid JSON body.")
  }

  const parsed = updateUserSchema.safeParse(body)
  if (!parsed.success) return Errors.validationError(parsed.error.issues[0].message)

  const updates = parsed.data
  if (Object.keys(updates).length === 0) return Errors.badRequest("No fields to update.")

  const { id: targetUserId } = await params
  if (
    targetUserId === auth.user.id &&
    (updates.status === "suspended" || updates.platform_role === "user" || updates.platform_role === "admin")
  ) {
    return Errors.badRequest("You cannot remove your own super admin access.")
  }

  if (
    (updates.platform_role && updates.platform_role !== "super_admin") ||
    updates.status === "suspended"
  ) {
    const lastSuperAdmin = await isLastSuperAdmin(targetUserId)
    if (lastSuperAdmin) return Errors.badRequest("Cannot modify the last super admin.")
  }

  const { data, error } = await supabaseAdmin
    .from("users")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", targetUserId)
    .select("id, email, full_name, avatar_url, phone_country, phone_country_code, phone_number, status, platform_role, created_at, updated_at")
    .single()

  if (error || !data) return Errors.notFound("User")

  if (updates.platform_role) {
    await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
      app_metadata: { platform_role: updates.platform_role },
    })
  }

  return ok({ user: data })
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
