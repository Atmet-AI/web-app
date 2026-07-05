import { getUser } from "@/lib/api/auth"
import { Errors } from "@/lib/api/response"
import { supabaseAdmin } from "@/lib/supabase/admin"

type AdminRole = "super_admin" | "admin"

export async function getAdminUser(requiredRole?: AdminRole) {
  const auth = await getUser()
  if (!auth.ok) return { ok: false as const, response: auth.response }

  const { data: profile } = await supabaseAdmin
    .from("users")
    .select("platform_role")
    .eq("id", auth.user.id)
    .maybeSingle()

  const role = profile?.platform_role
  const allowed =
    requiredRole === "super_admin"
      ? role === "super_admin"
      : role === "super_admin" || role === "admin"

  if (!allowed) {
    return {
      ok: false as const,
      response: Errors.forbidden(
        requiredRole === "super_admin"
          ? "Super admin access required."
          : "Admin access required."
      ),
    }
  }

  return { ok: true as const, user: auth.user, role: role as AdminRole }
}
