import { getUser } from "@/lib/api/auth"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { ok, Errors } from "@/lib/api/response"

async function getAdminRole() {
  const auth = await getUser()
  if (!auth.ok) return { ok: false as const, response: auth.response }

  const { data: profile } = await auth.supabase
    .from("users")
    .select("platform_role")
    .eq("id", auth.user.id)
    .single()

  return {
    ok: true as const,
    role: profile?.platform_role ?? "",
  }
}

export async function GET() {
  const admin = await getAdminRole()
  if (!admin.ok) return admin.response

  if (!["super_admin", "admin"].includes(admin.role)) {
    return Errors.forbidden("Admin access required.")
  }

  const { data, error } = await supabaseAdmin
    .from("waitlist")
    .select("id, name, email, company, role, company_size, country, referral, notes, profile_type, status, reviewed_at, created_at")
    .order("created_at", { ascending: false })

  if (error) return Errors.internal()

  const emails = Array.from(new Set((data ?? []).map((request) => request.email).filter(Boolean)))
  const { data: profiles } = emails.length
    ? await supabaseAdmin
        .from("users")
        .select("email, status, phone_country, phone_country_code, phone_number, onboarding_completed")
        .in("email", emails)
    : { data: [] }

  const profileByEmail = new Map(
    (profiles ?? []).map((profile) => [profile.email.toLowerCase(), profile])
  )

  return ok({
    requests: (data ?? []).map((request) => {
      const profile = profileByEmail.get(request.email.toLowerCase())
      return {
        ...request,
        user_status: profile?.status ?? null,
        onboarding_completed: profile?.onboarding_completed ?? false,
        phone_country: profile?.phone_country ?? null,
        phone_country_code: profile?.phone_country_code ?? null,
        phone_number: profile?.phone_number ?? null,
      }
    }),
  })
}
