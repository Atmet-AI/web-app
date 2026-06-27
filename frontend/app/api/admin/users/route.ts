import { getUser } from "@/lib/api/auth"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { ok, Errors } from "@/lib/api/response"

export async function GET() {
  const auth = await getUser()
  if (!auth.ok) return auth.response

  const { data: profile } = await supabaseAdmin
    .from("users")
    .select("platform_role")
    .eq("id", auth.user.id)
    .maybeSingle()

  if (!["super_admin", "admin"].includes(profile?.platform_role ?? "")) {
    return Errors.forbidden("Admin access required.")
  }

  const [usersRes, membershipsRes, ownedWorkspacesRes] = await Promise.all([
    supabaseAdmin
      .from("users")
      .select("id, email, full_name, avatar_url, status, platform_role, created_at, updated_at")
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("workspace_member")
      .select("role, joined_at, user_id, workspace:workspace_id(id, name, plan, status)"),
    supabaseAdmin
      .from("workspace")
      .select("id, name, owner_id"),
  ])

  if (usersRes.error || membershipsRes.error || ownedWorkspacesRes.error) return Errors.internal()

  const membershipsByUser = new Map<string, unknown[]>()
  for (const membership of membershipsRes.data ?? []) {
    const userId = membership.user_id as string
    const existing = membershipsByUser.get(userId) ?? []
    existing.push(membership)
    membershipsByUser.set(userId, existing)
  }

  const ownedWorkspacesByUser = new Map<string, Array<{ id: string; name: string }>>()
  for (const workspace of ownedWorkspacesRes.data ?? []) {
    if (!workspace.owner_id) continue
    const existing = ownedWorkspacesByUser.get(workspace.owner_id) ?? []
    existing.push({ id: workspace.id, name: workspace.name })
    ownedWorkspacesByUser.set(workspace.owner_id, existing)
  }

  const users = (usersRes.data ?? []).map((user) => ({
    ...user,
    memberships: membershipsByUser.get(user.id) ?? [],
    owned_workspaces: ownedWorkspacesByUser.get(user.id) ?? [],
  }))

  return ok({ users })
}
