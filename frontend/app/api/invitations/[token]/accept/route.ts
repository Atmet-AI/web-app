import { type NextRequest } from "next/server"
import { getUser } from "@/lib/api/auth"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { ok, Errors } from "@/lib/api/response"

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const auth = await getUser()
  if (!auth.ok) return auth.response

  const { user } = auth
  const { token } = await params

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

  if (invitation.email !== user.email) {
    return Errors.forbidden()
  }

  // Check not already a member
  const { data: existing } = await supabaseAdmin
    .from("workspace_member")
    .select("user_id")
    .eq("workspace_id", invitation.workspace_id)
    .eq("user_id", user.id)
    .maybeSingle()

  if (!existing) {
    await supabaseAdmin.from("workspace_member").insert({
      workspace_id: invitation.workspace_id,
      user_id: user.id,
      role: invitation.role,
    })
  }

  await supabaseAdmin
    .from("invitation")
    .update({ status: "accepted" })
    .eq("id", invitation.id)

  return ok({ workspace_id: invitation.workspace_id })
}
