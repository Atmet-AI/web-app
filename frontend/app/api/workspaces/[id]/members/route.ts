import { type NextRequest } from "next/server"
import { getUser } from "@/lib/api/auth"
import { assertWorkspaceAdmin } from "@/lib/api/workspace"
import { ok, Errors } from "@/lib/api/response"
import { inviteMemberSchema } from "@/lib/validations/workspace"

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

  // Check for existing pending invitation
  const { data: existing } = await supabase
    .from("invitation")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("email", email)
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
      email,
      role,
    })
    .select()
    .single()

  if (error) {
    return Errors.internal()
  }

  // TODO: Send invitation email with link: APP_URL/invite/[token]
  // For now, token is returned in the response for development use
  console.log(`[DEV] Invite link: ${process.env.NEXT_PUBLIC_APP_URL}/invite/${invitation.token}`)

  return ok({ invitation }, 201)
}
