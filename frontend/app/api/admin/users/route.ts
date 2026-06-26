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

  if (profile?.platform_role !== "super_admin") {
    return Errors.forbidden("Super admin access required.")
  }

  const [usersRes, membershipsRes] = await Promise.all([
    supabaseAdmin
      .from("users")
      .select("id, email, full_name, avatar_url, status, platform_role, created_at, updated_at")
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("workspace_member")
      .select("role, joined_at, user_id, workspace:workspace_id(id, name, plan, status)"),
  ])

  if (usersRes.error || membershipsRes.error) return Errors.internal()

  const membershipsByUser = new Map<string, unknown[]>()
  for (const membership of membershipsRes.data ?? []) {
    const userId = membership.user_id as string
    const existing = membershipsByUser.get(userId) ?? []
    existing.push(membership)
    membershipsByUser.set(userId, existing)
  }

  const users = (usersRes.data ?? []).map((user) => ({
    ...user,
    memberships: membershipsByUser.get(user.id) ?? [],
  }))

  return ok({ users })
}
