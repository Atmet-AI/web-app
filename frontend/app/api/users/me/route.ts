import { type NextRequest } from "next/server"
import { getUser } from "@/lib/api/auth"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { ok, Errors } from "@/lib/api/response"

function isSuperAdminIdentity(user: { email?: string | null; app_metadata?: Record<string, unknown>; user_metadata?: Record<string, unknown> }) {
  const email = user.email?.toLowerCase()
  const allowedEmails = (process.env.SUPER_ADMIN_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)

  return (
    (email ? allowedEmails.includes(email) : false) ||
    user.app_metadata?.platform_role === "super_admin" ||
    user.app_metadata?.role === "super_admin" ||
    user.user_metadata?.platform_role === "super_admin"
  )
}

export async function GET() {
  const auth = await getUser()
  if (!auth.ok) return auth.response

  const { user } = auth
  const isSuperAdmin = isSuperAdminIdentity(user)

  // Use admin client to bypass RLS — user always reads their own profile
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id, public_user_id, email, full_name, avatar_url, job_role, phone_country, phone_country_code, phone_number, status, platform_role, onboarding_completed, created_at, updated_at")
    .eq("id", user.id)
    .maybeSingle()

  if (error || !data) {
    // Profile row may not exist yet for manually-created accounts — return a safe fallback
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(user.id)
    if (!authUser?.user) return Errors.notFound("User profile")

    // Auto-create profile row
    const { data: created } = await supabaseAdmin
      .from("users")
      .upsert({
        id: user.id,
        email: authUser.user.email ?? "",
        full_name: authUser.user.user_metadata?.full_name ?? null,
        avatar_url: authUser.user.user_metadata?.avatar_url ?? null,
        job_role: authUser.user.user_metadata?.job_role ?? null,
        phone_country: authUser.user.user_metadata?.phone_country ?? null,
        phone_country_code: authUser.user.user_metadata?.phone_country_code ?? null,
        phone_number: authUser.user.user_metadata?.phone_number ?? null,
        onboarding_completed: isSuperAdmin,
        platform_role: isSuperAdmin ? "super_admin" : "user",
        status: isSuperAdmin ? "active" : "inactive",
      }, { onConflict: "id" })
      .select("id, public_user_id, email, full_name, avatar_url, job_role, phone_country, phone_country_code, phone_number, status, platform_role, onboarding_completed, created_at, updated_at")
      .single()

    return ok({
      user:
        created ?? {
          id: user.id,
          email: authUser.user.email,
          full_name: null,
          avatar_url: null,
          job_role: null,
          phone_country: null,
          phone_country_code: null,
          phone_number: null,
          platform_role: isSuperAdmin ? "super_admin" : "user",
          onboarding_completed: isSuperAdmin,
          status: isSuperAdmin ? "active" : "inactive",
        },
    })
  }

  if (isSuperAdmin && data.platform_role !== "super_admin") {
    const { data: promoted } = await supabaseAdmin
      .from("users")
      .update({
        platform_role: "super_admin",
        onboarding_completed: true,
        status: "active",
      })
      .eq("id", user.id)
      .select("id, public_user_id, email, full_name, avatar_url, job_role, phone_country, phone_country_code, phone_number, status, platform_role, onboarding_completed, created_at, updated_at")
      .single()

    if (promoted) return ok({ user: promoted })
  }

  return ok({ user: data })
}

export async function PATCH(request: NextRequest) {
  const auth = await getUser()
  if (!auth.ok) return auth.response

  const { user } = auth

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Errors.badRequest("Invalid JSON body.")
  }

  const { full_name, avatar_url, job_role, status, onboarding_completed, phone_country, phone_country_code, phone_number } = body as {
    full_name?: string
    avatar_url?: string | null
    job_role?: string | null
    status?: string
    onboarding_completed?: boolean
    phone_country?: string | null
    phone_country_code?: string | null
    phone_number?: string | null
  }

  const coreUpdates: Record<string, unknown> = {}
  if (full_name !== undefined) coreUpdates.full_name = full_name
  if (avatar_url !== undefined) coreUpdates.avatar_url = avatar_url
  if (job_role !== undefined) coreUpdates.job_role = job_role
  if (status !== undefined) coreUpdates.status = status
  if (phone_country !== undefined) coreUpdates.phone_country = phone_country
  if (phone_country_code !== undefined) coreUpdates.phone_country_code = phone_country_code
  if (phone_number !== undefined) coreUpdates.phone_number = phone_number
  if (onboarding_completed === true) coreUpdates.status = "active"

  if (Object.keys(coreUpdates).length === 0 && onboarding_completed === undefined) {
    return Errors.badRequest("No fields to update.")
  }

  // Ensure the profile row exists before updating
  const { data: existing } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("id", user.id)
    .maybeSingle()

  if (!existing) {
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(user.id)
    await supabaseAdmin.from("users").upsert({
      id: user.id,
      email: authUser?.user?.email ?? "",
      full_name: authUser?.user?.user_metadata?.full_name ?? null,
      avatar_url: authUser?.user?.user_metadata?.avatar_url ?? null,
      job_role: authUser?.user?.user_metadata?.job_role ?? null,
      phone_country: authUser?.user?.user_metadata?.phone_country ?? null,
      phone_country_code: authUser?.user?.user_metadata?.phone_country_code ?? null,
      phone_number: authUser?.user?.user_metadata?.phone_number ?? null,
      onboarding_completed: false,
      platform_role: "user",
      status: "inactive",
    }, { onConflict: "id" })
  }

  // Update core fields
  if (Object.keys(coreUpdates).length > 0) {
    await supabaseAdmin
      .from("users")
      .update(coreUpdates)
      .eq("id", user.id)
  }

  // Update onboarding_completed separately — column may not exist in older DB schemas
  if (onboarding_completed !== undefined) {
    try {
      await supabaseAdmin
        .from("users")
        .update({ onboarding_completed })
        .eq("id", user.id)
    } catch {
      // Column not yet migrated — non-fatal, redirect still works
    }
  }

  const { data } = await supabaseAdmin
    .from("users")
    .select("id, public_user_id, email, full_name, avatar_url, job_role, phone_country, phone_country_code, phone_number, status, platform_role, onboarding_completed, created_at, updated_at")
    .eq("id", user.id)
    .single()

  return ok({ user: data })
}
