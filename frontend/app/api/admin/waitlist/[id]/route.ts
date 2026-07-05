import { type NextRequest } from "next/server"
import { getUser } from "@/lib/api/auth"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { ok, Errors } from "@/lib/api/response"
import { sendWaitlistApprovalEmail } from "@/lib/email/approval"
import { z } from "zod"

const actionSchema = z.object({
  action: z.enum(["approve", "reject", "resend"]),
})

type AuthListUser = Awaited<
  ReturnType<typeof supabaseAdmin.auth.admin.listUsers>
>["data"]["users"][number]

async function findAuthUserByEmail(email: string): Promise<AuthListUser | null> {
  const normalizedEmail = email.toLowerCase()

  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage: 100,
    })

    if (error) return null

    const user = data.users.find(
      (candidate) => candidate.email?.toLowerCase() === normalizedEmail
    )
    if (user) return user
    if (data.users.length < 100) return null
  }

  return null
}

function hasCompletedAccount(user: AuthListUser) {
  return user.user_metadata?.password_set === true
}

async function ensureApprovedUserProfile(email: string, fullName: string) {
  const existingUser = await findAuthUserByEmail(email)

  if (existingUser) {
    if (!hasCompletedAccount(existingUser)) {
      await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
        email_confirm: true,
        user_metadata: {
          ...existingUser.user_metadata,
          full_name: existingUser.user_metadata?.full_name ?? fullName,
          password_set: false,
        },
      })
    }

    await supabaseAdmin.from("users").upsert(
      {
        id: existingUser.id,
        email: existingUser.email ?? email,
        full_name: existingUser.user_metadata?.full_name ?? fullName,
        platform_role: "user",
        onboarding_completed: hasCompletedAccount(existingUser),
        status: hasCompletedAccount(existingUser) ? "active" : "inactive",
      },
      { onConflict: "id" }
    )

    return { ok: true as const, completed: hasCompletedAccount(existingUser) }
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      password_set: false,
    },
  })

  if (error || !data.user) {
    return {
      ok: false as const,
      reason: error?.message ?? "Unable to create the approved user account.",
    }
  }

  await supabaseAdmin.from("users").upsert(
    {
      id: data.user.id,
      email: data.user.email ?? email,
      full_name: fullName,
      platform_role: "user",
      onboarding_completed: false,
      status: "inactive",
    },
    { onConflict: "id" }
  )

  return { ok: true as const, completed: false }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getUser()
  if (!auth.ok) return auth.response

  const { data: profile } = await auth.supabase
    .from("users")
    .select("platform_role")
    .eq("id", auth.user.id)
    .single()

  if (!["super_admin", "admin"].includes(profile?.platform_role ?? "")) {
    return Errors.forbidden("Admin access required.")
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Errors.badRequest("Invalid JSON body.")
  }

  const parsed = actionSchema.safeParse(body)
  if (!parsed.success) {
    return Errors.validationError(parsed.error.issues[0].message)
  }

  const { id } = await params
  const { action } = parsed.data

  const { data: entry } = await supabaseAdmin
    .from("waitlist")
    .select("id, email, name, status")
    .eq("id", id)
    .maybeSingle()

  if (!entry) return Errors.notFound("Waitlist entry")
  if (action !== "resend" && entry.status !== "pending") {
    return Errors.badRequest("This request has already been reviewed.")
  }
  if (action === "resend" && entry.status !== "approved") {
    return Errors.badRequest("Only approved requests can receive another approval email.")
  }

  if (action === "resend") {
    const ensured = await ensureApprovedUserProfile(entry.email, entry.name)
    if (!ensured.ok) {
      return ok({
        success: true,
        status: entry.status,
        approvalEmailSent: false,
        approvalEmailWarning: ensured.reason,
      })
    }

    const emailResult = await sendWaitlistApprovalEmail({
      email: entry.email,
      name: entry.name,
    })

    if (!emailResult.ok) {
      return ok({
        success: true,
        status: entry.status,
        approvalEmailSent: false,
        approvalEmailWarning: emailResult.reason,
      })
    }

    return ok({
      success: true,
      status: entry.status,
      approvalEmailSent: true,
    })
  }

  const newStatus = action === "approve" ? "approved" : "rejected"

  const { error: updateError } = await supabaseAdmin
    .from("waitlist")
    .update({
      status: newStatus,
      reviewed_by: auth.user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id)

  if (updateError) return Errors.internal()

  if (action === "approve") {
    const ensured = await ensureApprovedUserProfile(entry.email, entry.name)
    if (!ensured.ok) {
      return ok({
        success: true,
        status: newStatus,
        approvalEmailSent: false,
        approvalEmailWarning: ensured.reason,
      })
    }

    const emailResult = await sendWaitlistApprovalEmail({
      email: entry.email,
      name: entry.name,
    })

    if (!emailResult.ok) {
      return ok({
        success: true,
        status: newStatus,
        approvalEmailSent: false,
        approvalEmailWarning: emailResult.reason,
      })
    }

    return ok({
      success: true,
      status: newStatus,
      approvalEmailSent: true,
    })
  }

  return ok({ success: true, status: newStatus })
}
