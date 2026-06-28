import { type NextRequest } from "next/server"
import { getUser } from "@/lib/api/auth"
import { assertWorkspaceAdmin } from "@/lib/api/workspace"
import { ok, Errors } from "@/lib/api/response"
import { inviteMemberSchema } from "@/lib/validations/workspace"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { sendWorkspaceInvitationEmail } from "@/lib/email/invitation"

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0
}

async function getSeatLimit(workspaceId: string) {
  const [settingsRes, workspaceRes] = await Promise.all([
    supabaseAdmin.from("platform_setting").select("value").eq("key", "usage_limits").maybeSingle(),
    supabaseAdmin.from("workspace").select("seat_limit").eq("id", workspaceId).maybeSingle(),
  ])
  const globalValue = settingsRes.data?.value && typeof settingsRes.data.value === "object"
    ? settingsRes.data.value as Record<string, unknown>
    : {}
  return workspaceRes.data?.seat_limit ?? (readNumber(globalValue.seatLimit) || 10)
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getUser()
  if (!auth.ok) return auth.response

  const { supabase } = auth
  const { id: workspaceId } = await params

  const { data, error } = await supabase
    .from("workspace_member")
    .select("role, joined_at, user:user_id(id, email, full_name, avatar_url, status)")
    .eq("workspace_id", workspaceId)
    .eq("status", "active")

  if (error) {
    return Errors.internal()
  }

  return ok({ members: data })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getUser()
  if (!auth.ok) return auth.response

  const { supabase, user } = auth
  const { id: workspaceId } = await params

  const isAdmin = await assertWorkspaceAdmin(supabase, workspaceId, user.id)
  if (!isAdmin) return Errors.forbidden()

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Errors.badRequest("Invalid JSON body.")
  }

  const parsed = inviteMemberSchema.safeParse(body)
  if (!parsed.success) {
    return Errors.validationError(parsed.error.issues[0].message)
  }

  const { email, role } = parsed.data
  const normalizedEmail = email.trim().toLowerCase()

  const [membersCountRes, pendingInvitesCountRes, seatLimit, workspaceRes, inviterRes] = await Promise.all([
    supabaseAdmin.from("workspace_member").select("user_id", { count: "exact", head: true }).eq("workspace_id", workspaceId).eq("status", "active"),
    supabaseAdmin.from("invitation").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).eq("status", "pending"),
    getSeatLimit(workspaceId),
    supabaseAdmin.from("workspace").select("id, name, avatar_url").eq("id", workspaceId).maybeSingle(),
    supabaseAdmin.from("users").select("full_name, email").eq("id", user.id).maybeSingle(),
  ])

  if (!workspaceRes.data) return Errors.notFound("Workspace")

  if ((membersCountRes.count ?? 0) + (pendingInvitesCountRes.count ?? 0) >= seatLimit) {
    return Errors.badRequest(`Workspace has reached the ${seatLimit.toLocaleString()} seat limit.`)
  }

  // Check for existing pending invitation
  const { data: existing } = await supabase
    .from("invitation")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("email", normalizedEmail)
    .eq("status", "pending")
    .maybeSingle()

  if (existing) {
    return Errors.conflict("A pending invitation for this email already exists.")
  }

  const { data: invitation, error } = await supabase
    .from("invitation")
    .insert({
      workspace_id: workspaceId,
      invited_by: user.id,
      email: normalizedEmail,
      role,
    })
    .select()
    .single()

  if (error) {
    return Errors.internal()
  }

  const emailResult = await sendWorkspaceInvitationEmail({
    email: normalizedEmail,
    workspaceName: workspaceRes.data.name,
    invitedByName: inviterRes.data?.full_name || inviterRes.data?.email || "A teammate",
    token: invitation.token,
  })

  return ok(
    {
      invitation,
      invitationEmailSent: emailResult.ok,
      invitationEmailWarning: emailResult.ok ? null : emailResult.reason,
    },
    201
  )
}
