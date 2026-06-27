import { type NextRequest } from "next/server"
import { getUser } from "@/lib/api/auth"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { ok, Errors } from "@/lib/api/response"
import { sendWaitlistApprovalEmail } from "@/lib/email/approval"
import { z } from "zod"

const actionSchema = z.object({
  action: z.enum(["approve", "reject"]),
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
  if (entry.status !== "pending") {
    return Errors.badRequest("This request has already been reviewed.")
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
    const existingUser = await findAuthUserByEmail(entry.email)
    if (existingUser && hasCompletedAccount(existingUser)) {
      return ok({
        success: true,
        status: newStatus,
        approvalEmailSent: false,
        approvalEmailWarning: "This email already belongs to an existing user, so no first-time approval email was sent.",
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
