import { type NextRequest } from "next/server"
import { z } from "zod"

import { getAdminUser } from "@/lib/api/admin"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { ok, Errors } from "@/lib/api/response"
import { sendWaitlistApprovalEmail } from "@/lib/email/approval"

const inviteUserSchema = z.object({
  email: z.string().email(),
  role: z.enum(["user", "admin", "super_admin"]).default("user"),
})

type AuthListUser = Awaited<
  ReturnType<typeof supabaseAdmin.auth.admin.listUsers>
>["data"]["users"][number]

async function findAuthUserByEmail(email: string): Promise<AuthListUser | null> {
  const normalized = email.toLowerCase()
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 100 })
    if (error) return null
    const user = data.users.find((candidate) => candidate.email?.toLowerCase() === normalized)
    if (user) return user
    if (data.users.length < 100) return null
  }
  return null
}

export async function GET() {
  const admin = await getAdminUser()
  if (!admin.ok) return admin.response

  const [usersRes, membershipsRes, ownedWorkspacesRes] = await Promise.all([
    supabaseAdmin
      .from("users")
      .select("id, email, full_name, avatar_url, phone_country, phone_country_code, phone_number, status, platform_role, created_at, updated_at")
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("workspace_member")
      .select("role, status, joined_at, user_id, workspace:workspace_id(id, name, plan, status)"),
    supabaseAdmin
      .from("workspace")
      .select("id, name, owner_id"),
  ])

  if (usersRes.error || membershipsRes.error || ownedWorkspacesRes.error) return Errors.internal()

  const authUsersById = new Map<string, { last_sign_in_at?: string | null; email_confirmed_at?: string | null }>()
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 100 })
    if (error) break
    for (const user of data.users) {
      authUsersById.set(user.id, {
        last_sign_in_at: user.last_sign_in_at,
        email_confirmed_at: user.email_confirmed_at,
      })
    }
    if (data.users.length < 100) break
  }

  const membershipsByUser = new Map<string, unknown[]>()
  for (const membership of membershipsRes.data ?? []) {
    const workspace = Array.isArray(membership.workspace) ? membership.workspace[0] : membership.workspace
    if (membership.status !== "active" || workspace?.status !== "active") continue
    const userId = membership.user_id as string
    const existing = membershipsByUser.get(userId) ?? []
    existing.push(membership)
    membershipsByUser.set(userId, existing)
  }

  const ownedWorkspacesByUser = new Map<string, Array<{ id: string; name: string }>>()
  for (const workspace of ownedWorkspacesRes.data ?? []) {
    if (!workspace.owner_id) continue
    const existing = ownedWorkspacesByUser.get(workspace.owner_id) ?? []
    existing.push({ id: workspace.id, name: workspace.name })
    ownedWorkspacesByUser.set(workspace.owner_id, existing)
  }

  const users = (usersRes.data ?? []).map((user) => ({
    ...user,
    last_sign_in_at: authUsersById.get(user.id)?.last_sign_in_at ?? null,
    email_confirmed_at: authUsersById.get(user.id)?.email_confirmed_at ?? null,
    memberships: membershipsByUser.get(user.id) ?? [],
    owned_workspaces: ownedWorkspacesByUser.get(user.id) ?? [],
  }))

  return ok({ users })
}

export async function POST(request: NextRequest) {
  const admin = await getAdminUser("super_admin")
  if (!admin.ok) return admin.response

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Errors.badRequest("Invalid JSON body.")
  }

  const parsed = inviteUserSchema.safeParse(body)
  if (!parsed.success) return Errors.validationError(parsed.error.issues[0].message)

  const email = parsed.data.email.toLowerCase()
  const existing = await findAuthUserByEmail(email)
  let userId = existing?.id

  if (existing) {
    await supabaseAdmin.auth.admin.updateUserById(existing.id, {
      email_confirm: true,
      user_metadata: {
        ...existing.user_metadata,
        password_set: existing.user_metadata?.password_set ?? false,
      },
    })
  } else {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { password_set: false },
    })
    if (error || !data.user) return Errors.badRequest(error?.message ?? "Unable to create user.")
    userId = data.user.id
  }

  await supabaseAdmin.from("users").upsert(
    {
      id: userId,
      email,
      platform_role: parsed.data.role,
      status: existing?.user_metadata?.password_set === true ? "active" : "inactive",
      onboarding_completed: existing?.user_metadata?.password_set === true,
    },
    { onConflict: "id" }
  )

  const emailResult = await sendWaitlistApprovalEmail({ email, name: email })

  return ok(
    {
      success: true,
      emailSent: emailResult.ok,
      emailWarning: emailResult.ok ? null : emailResult.reason,
    },
    201
  )
}
