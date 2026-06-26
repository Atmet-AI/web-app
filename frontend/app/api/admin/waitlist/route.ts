import { getUser } from "@/lib/api/auth"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { ok, Errors } from "@/lib/api/response"

export async function GET() {
  const auth = await getUser()
  if (!auth.ok) return auth.response

  // Only super admins can access this
  const { data: profile } = await auth.supabase
    .from("users")
    .select("platform_role")
    .eq("id", auth.user.id)
    .single()

  if (profile?.platform_role !== "super_admin") {
    return Errors.forbidden("Super admin access required.")
  }

  const { data, error } = await supabaseAdmin
    .from("waitlist")
    .select("id, name, email, company, role, company_size, country, referral, notes, profile_type, status, reviewed_at, created_at")
    .order("created_at", { ascending: false })

  if (error) return Errors.internal()

  return ok({ requests: data ?? [] })
}
