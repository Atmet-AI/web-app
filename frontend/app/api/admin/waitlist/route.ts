import { type NextRequest } from "next/server"
import { getUser } from "@/lib/api/auth"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { ok, Errors } from "@/lib/api/response"
import { z } from "zod"

const deleteSchema = z.object({
  scope: z.literal("reviewed").default("reviewed"),
})

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

  return ok({ requests: data ?? [] })
}

export async function DELETE(request: NextRequest) {
  const admin = await getAdminRole()
  if (!admin.ok) return admin.response

  if (admin.role !== "super_admin") {
    return Errors.forbidden("Only super admins can clean the waitlist.")
  }

  let body: unknown = {}
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const parsed = deleteSchema.safeParse(body)
  if (!parsed.success) {
    return Errors.validationError(parsed.error.issues[0].message)
  }

  const { error, count } = await supabaseAdmin
    .from("waitlist")
    .delete({ count: "exact" })
    .in("status", ["approved", "rejected"])

  if (error) return Errors.internal()

  return ok({ success: true, deletedCount: count ?? 0 })
}
