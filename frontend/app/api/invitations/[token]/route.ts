import { type NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { getUser } from "@/lib/api/auth"
import { assertWorkspaceAdmin } from "@/lib/api/workspace"
import { ok, Errors } from "@/lib/api/response"

// Public endpoint — no auth required (used to display invite landing page)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  const { data, error } = await supabaseAdmin
    .from("invitation")
    .select("id, email, role, status, expires_at, workspace:workspace_id(id, name, avatar_url), inviter:invited_by(full_name, email)")
    .eq("token", token)
    .eq("status", "pending")
    .maybeSingle()

  if (error || !data) {
    return Errors.notFound("Invitation")
  }

  if (new Date(data.expires_at) < new Date()) {
    await supabaseAdmin
      .from("invitation")
      .update({ status: "expired" })
      .eq("token", token)

    return Errors.notFound("Invitation")
  }

  return ok({ invitation: data })
}

// Admin-only: revoke an invitation by its token
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const auth = await getUser()
  if (!auth.ok) return auth.response

  const { supabase, user } = auth
  const { token } = await params

  const { data: invitation } = await supabase
    .from("invitation")
    .select("id, workspace_id")
    .eq("token", token)
    .maybeSingle()

  if (!invitation) return Errors.notFound("Invitation")

  const isAdmin = await assertWorkspaceAdmin(supabase, invitation.workspace_id, user.id)
  if (!isAdmin) return Errors.forbidden()

  const { error } = await supabase
    .from("invitation")
    .update({ status: "revoked" })
    .eq("id", invitation.id)

  if (error) return Errors.internal()

  return ok({ success: true })
}
