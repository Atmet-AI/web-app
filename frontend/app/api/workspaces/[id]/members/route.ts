import { type NextRequest } from "next/server"
import { getUser } from "@/lib/api/auth"
import { ok, Errors } from "@/lib/api/response"
import { inviteMemberSchema } from "@/lib/validations/workspace"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { sendWorkspaceInvitationEmail } from "@/lib/email/invitation"

type WorkspaceMemberRole = "owner" | "admin" | "member"

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

async function getCurrentMembership(workspaceId: string, userId: string) {
  const { data } = await supabaseAdmin
    .from("workspace_member")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle()

  return data?.role as WorkspaceMemberRole | undefined
}

function canManageMembers(role: WorkspaceMemberRole | undefined) {
  return role === "owner" || role === "admin"
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getUser()
  if (!auth.ok) return auth.response

  const { user } = auth
  const { id: workspaceId } = await params
  const currentMemberRole = await getCurrentMembership(workspaceId, user.id)

  if (!currentMemberRole) return Errors.forbidden()

  const [membersRes, seatLimit] = await Promise.all([
    supabaseAdmin
      .from("workspace_member")
      .select("role, joined_at, user:user_id(id, email, full_name, avatar_url, status)")
      .eq("workspace_id", workspaceId)
      .eq("status", "active")
      .order("joined_at", { ascending: true }),
    getSeatLimit(workspaceId),
  ])

  if (membersRes.error) {
    return Errors.internal()
  }

  return ok({
    members: membersRes.data,
    currentMemberRole,
    canInvite: canManageMembers(currentMemberRole),
    seatLimit,
  })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getUser()
  if (!auth.ok) return auth.response

  const { user } = auth
  const { id: workspaceId } = await params

  const currentMemberRole = await getCurrentMembership(workspaceId, user.id)
  if (!canManageMembers(currentMemberRole)) {
    return Errors.forbidden("Only workspace owners or admins can invite members.")
  }

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

  const [workspaceRes, inviterRes, existingInviteRes, existingUserRes] = await Promise.all([
    supabaseAdmin.from("workspace").select("id, name, avatar_url").eq("id", workspaceId).maybeSingle(),
    supabaseAdmin.from("users").select("full_name, email").eq("id", user.id).maybeSingle(),
    supabaseAdmin
      .from("invitation")
      .select("id, token")
      .eq("workspace_id", workspaceId)
      .eq("email", normalizedEmail)
      .eq("status", "pending")
      .maybeSingle(),
    supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", normalizedEmail)
      .maybeSingle(),
  ])

  if (!workspaceRes.data) return Errors.notFound("Workspace")

  if (existingUserRes.data?.id) {
    const { data: existingMembership } = await supabaseAdmin
      .from("workspace_member")
      .select("status")
      .eq("workspace_id", workspaceId)
      .eq("user_id", existingUserRes.data.id)
      .maybeSingle()

    if (existingMembership?.status === "active") {
      return Errors.conflict("This user is already a member of the workspace.")
    }
  }

  if (existingInviteRes.data) {
    const nextExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    const { data: refreshedInvitation } = await supabaseAdmin
      .from("invitation")
      .update({
        invited_by: user.id,
        role,
        expires_at: nextExpiry,
      })
      .eq("id", existingInviteRes.data.id)
      .select()
      .single()

    const invitation = refreshedInvitation ?? existingInviteRes.data
    const emailResult = await sendWorkspaceInvitationEmail({
      email: normalizedEmail,
      workspaceName: workspaceRes.data.name,
      invitedByName: inviterRes.data?.full_name || inviterRes.data?.email || "A teammate",
      token: invitation.token,
    })

    return ok({
      invitation,
      invitationResent: true,
      invitationEmailSent: emailResult.ok,
      invitationEmailWarning: emailResult.ok ? null : emailResult.reason,
    })
  }

  const [membersCountRes, pendingInvitesCountRes, seatLimit] = await Promise.all([
    supabaseAdmin.from("workspace_member").select("user_id", { count: "exact", head: true }).eq("workspace_id", workspaceId).eq("status", "active"),
    supabaseAdmin.from("invitation").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).eq("status", "pending"),
    getSeatLimit(workspaceId),
  ])

  if ((membersCountRes.count ?? 0) + (pendingInvitesCountRes.count ?? 0) >= seatLimit) {
    return Errors.badRequest(`Workspace has reached the ${seatLimit.toLocaleString()} seat limit.`)
  }

  const { data: invitation, error } = await supabaseAdmin
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
