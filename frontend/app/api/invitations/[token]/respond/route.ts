import { type NextRequest } from "next/server"
import { z } from "zod"
import { getUser } from "@/lib/api/auth"
import { ok, Errors } from "@/lib/api/response"
import { supabaseAdmin } from "@/lib/supabase/admin"

const respondSchema = z.object({
  action: z.enum(["accept", "decline"]),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const auth = await getUser()
  if (!auth.ok) return auth.response

  const { token } = await params
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Errors.badRequest("Invalid JSON body.")
  }

  const parsed = respondSchema.safeParse(body)
  if (!parsed.success) {
    return Errors.validationError(parsed.error.issues[0].message)
  }

  const email = auth.user.email?.trim().toLowerCase()
  if (!email) return Errors.badRequest("Your account does not have an email address.")

  const { data: invitation, error } = await supabaseAdmin
    .from("invitation")
    .select("id, email, role, status, expires_at, workspace_id")
    .eq("token", token)
    .eq("status", "pending")
    .maybeSingle()

  if (error || !invitation) return Errors.notFound("Invitation")

  if (invitation.email.trim().toLowerCase() !== email) {
    return Errors.forbidden("This invitation belongs to another email address.")
  }

  if (new Date(invitation.expires_at) < new Date()) {
    await supabaseAdmin
      .from("invitation")
      .update({ status: "expired" })
      .eq("id", invitation.id)
    return Errors.notFound("Invitation")
  }

  if (parsed.data.action === "decline") {
    const { error: declineError } = await supabaseAdmin
      .from("invitation")
      .update({ status: "revoked" })
      .eq("id", invitation.id)

    if (declineError) return Errors.internal()
    return ok({ invitationStatus: "declined" })
  }

  const { data: existingMembership } = await supabaseAdmin
    .from("workspace_member")
    .select("user_id, status")
    .eq("workspace_id", invitation.workspace_id)
    .eq("user_id", auth.user.id)
    .maybeSingle()

  if (existingMembership) {
    if (existingMembership.status !== "active") {
      const { error: reactivateError } = await supabaseAdmin
        .from("workspace_member")
        .update({ role: invitation.role, status: "active" })
        .eq("workspace_id", invitation.workspace_id)
        .eq("user_id", auth.user.id)

      if (reactivateError) return Errors.internal()
    }
  } else {
    const { error: memberError } = await supabaseAdmin
      .from("workspace_member")
      .insert({
        workspace_id: invitation.workspace_id,
        user_id: auth.user.id,
        role: invitation.role,
        status: "active",
      })

    if (memberError) return Errors.internal()
  }

  const { error: acceptError } = await supabaseAdmin
    .from("invitation")
    .update({ status: "accepted" })
    .eq("id", invitation.id)

  if (acceptError) return Errors.internal()

  return ok({
    invitationStatus: "accepted",
    workspaceId: invitation.workspace_id,
  })
}
