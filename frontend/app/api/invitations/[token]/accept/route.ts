import { type NextRequest } from "next/server"
import { z } from "zod"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { ok, Errors } from "@/lib/api/response"

const acceptInvitationSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required.").max(80),
  lastName: z.string().trim().min(1, "Second name is required.").max(80),
  avatarUrl: z.string().url().nullable().optional(),
  phoneCountry: z.string().trim().min(2).max(2),
  phoneCountryCode: z.string().trim().min(1).max(8),
  phoneNumber: z.string().trim().min(4).max(32),
  jobRole: z.string().trim().min(1, "Role is required.").max(100),
  password: z.string().min(8, "Password must be at least 8 characters."),
})

type AuthListUser = Awaited<
  ReturnType<typeof supabaseAdmin.auth.admin.listUsers>
>["data"]["users"][number]

async function findAuthUserByEmail(email: string): Promise<AuthListUser | null> {
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage: 100,
    })
    if (error) return null
    const user = data.users.find(
      (candidate) => candidate.email?.toLowerCase() === email
    )
    if (user) return user
    if (data.users.length < 100) return null
  }

  return null
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Errors.badRequest("Invalid JSON body.")
  }

  const parsed = acceptInvitationSchema.safeParse(body)
  if (!parsed.success) {
    return Errors.validationError(parsed.error.issues[0].message)
  }

  const { data: invitation, error } = await supabaseAdmin
    .from("invitation")
    .select("id, email, role, status, expires_at, workspace_id")
    .eq("token", token)
    .eq("status", "pending")
    .maybeSingle()

  if (error || !invitation) {
    return Errors.notFound("Invitation")
  }

  if (new Date(invitation.expires_at) < new Date()) {
    await supabaseAdmin
      .from("invitation")
      .update({ status: "expired" })
      .eq("id", invitation.id)
    return Errors.notFound("Invitation")
  }

  const email = invitation.email.trim().toLowerCase()
  const fullName = `${parsed.data.firstName} ${parsed.data.lastName}`.trim()
  const existingAuthUser = await findAuthUserByEmail(email)
  const metadata = {
    ...(existingAuthUser?.user_metadata ?? {}),
    full_name: fullName,
    avatar_url: parsed.data.avatarUrl ?? null,
    job_role: parsed.data.jobRole,
    phone_country: parsed.data.phoneCountry,
    phone_country_code: parsed.data.phoneCountryCode,
    phone_number: parsed.data.phoneNumber,
    password_set: true,
  }

  const authUser = existingAuthUser
    ? (
        await supabaseAdmin.auth.admin.updateUserById(existingAuthUser.id, {
          email_confirm: true,
          password: parsed.data.password,
          user_metadata: metadata,
        })
      ).data.user
    : (
        await supabaseAdmin.auth.admin.createUser({
          email,
          password: parsed.data.password,
          email_confirm: true,
          user_metadata: metadata,
        })
      ).data.user

  if (!authUser) {
    return Errors.internal()
  }

  await supabaseAdmin.from("users").upsert(
    {
      id: authUser.id,
      email,
      full_name: fullName,
      avatar_url: parsed.data.avatarUrl ?? null,
      job_role: parsed.data.jobRole,
      phone_country: parsed.data.phoneCountry,
      phone_country_code: parsed.data.phoneCountryCode,
      phone_number: parsed.data.phoneNumber,
      platform_role: "user",
      onboarding_completed: true,
      status: "active",
    },
    { onConflict: "id" }
  )

  // Check not already a member
  const { data: existing } = await supabaseAdmin
    .from("workspace_member")
    .select("user_id")
    .eq("workspace_id", invitation.workspace_id)
    .eq("user_id", authUser.id)
    .maybeSingle()

  if (!existing) {
    await supabaseAdmin.from("workspace_member").insert({
      workspace_id: invitation.workspace_id,
      user_id: authUser.id,
      role: invitation.role,
      status: "active",
    })
  }

  await supabaseAdmin
    .from("invitation")
    .update({ status: "accepted" })
    .eq("id", invitation.id)

  return ok({
    workspace_id: invitation.workspace_id,
    signInUrl: `/sign-in?email=${encodeURIComponent(email)}`,
  })
}
