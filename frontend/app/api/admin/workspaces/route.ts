import { createHash, randomBytes } from "crypto"
import { type NextRequest } from "next/server"
import { z } from "zod"

import { getAdminUser } from "@/lib/api/admin"
import { Errors, ok } from "@/lib/api/response"
import { supabaseAdmin } from "@/lib/supabase/admin"

const provisionSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(120).optional().nullable(),
  country: z.string().optional().nullable(),
  plan: z.enum(["free", "pro", "enterprise"]).default("free"),
  ownerName: z.string().optional().nullable(),
  ownerEmail: z.string().email(),
  monthlyTokenCap: z.number().int().positive().optional().nullable(),
  seatLimit: z.number().int().positive().optional().nullable(),
  features: z.record(z.string(), z.boolean()).optional(),
  createApiKey: z.boolean().default(false),
  apiKeyName: z.string().optional().nullable(),
  apiKeyExpiresAt: z.string().datetime().optional().nullable(),
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

async function ensureOwner(email: string, fullName: string | null | undefined) {
  const existing = await findAuthUserByEmail(email)
  if (existing) {
    await supabaseAdmin.from("users").upsert(
      {
        id: existing.id,
        email: existing.email ?? email,
        full_name: existing.user_metadata?.full_name ?? fullName ?? null,
        platform_role: "user",
        status: existing.user_metadata?.password_set === true ? "active" : "inactive",
        onboarding_completed: existing.user_metadata?.password_set === true,
      },
      { onConflict: "id" }
    )
    return { userId: existing.id, error: null as string | null }
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: {
      full_name: fullName ?? null,
      password_set: false,
    },
  })

  if (error || !data.user) {
    return { userId: null, error: error?.message ?? "Unable to create owner account." }
  }

  await supabaseAdmin.from("users").upsert(
    {
      id: data.user.id,
      email: data.user.email ?? email,
      full_name: fullName ?? null,
      platform_role: "user",
      status: "inactive",
      onboarding_completed: false,
    },
    { onConflict: "id" }
  )

  return { userId: data.user.id, error: null }
}

export async function GET() {
  const admin = await getAdminUser()
  if (!admin.ok) return admin.response

  const [workspacesRes, membersRes, usersRes, keysRes] = await Promise.all([
    supabaseAdmin
      .from("workspace")
      .select("id, name, slug, plan, status, owner_id, avatar_url, country, monthly_token_cap, seat_limit, features, created_at, updated_at")
      .order("created_at", { ascending: false }),
    supabaseAdmin.from("workspace_member").select("workspace_id, user_id, role, status"),
    supabaseAdmin.from("users").select("id, email, full_name, avatar_url, status"),
    supabaseAdmin.from("api_key").select("workspace_id, id"),
  ])

  if (workspacesRes.error || membersRes.error || usersRes.error || keysRes.error) {
    return Errors.internal()
  }

  const usersById = new Map((usersRes.data ?? []).map((user) => [user.id, user]))
  const memberCounts = new Map<string, number>()
  for (const member of membersRes.data ?? []) {
    if (member.status !== "active") continue
    memberCounts.set(member.workspace_id, (memberCounts.get(member.workspace_id) ?? 0) + 1)
  }
  const apiKeyCounts = new Map<string, number>()
  for (const key of keysRes.data ?? []) {
    apiKeyCounts.set(key.workspace_id, (apiKeyCounts.get(key.workspace_id) ?? 0) + 1)
  }

  const workspaces = (workspacesRes.data ?? []).map((workspace) => ({
    ...workspace,
    owner: workspace.owner_id ? usersById.get(workspace.owner_id) ?? null : null,
    member_count: memberCounts.get(workspace.id) ?? 0,
    api_key_count: apiKeyCounts.get(workspace.id) ?? 0,
  }))

  return ok({ workspaces })
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

  const parsed = provisionSchema.safeParse(body)
  if (!parsed.success) return Errors.validationError(parsed.error.issues[0].message)

  const input = parsed.data
  const owner = await ensureOwner(input.ownerEmail.toLowerCase(), input.ownerName)
  if (!owner.userId) return Errors.badRequest(owner.error ?? "Unable to create owner.")

  const { data: workspace, error: workspaceError } = await supabaseAdmin
    .from("workspace")
    .insert({
      name: input.name,
      slug: input.slug || null,
      plan: input.plan,
      country: input.country ?? null,
      owner_id: owner.userId,
      monthly_token_cap: input.monthlyTokenCap ?? null,
      seat_limit: input.seatLimit ?? null,
      features: input.features ?? {},
    })
    .select("id, name, slug, plan, status, owner_id, avatar_url, country, monthly_token_cap, seat_limit, features, created_at, updated_at")
    .single()

  if (workspaceError || !workspace) return Errors.badRequest(workspaceError?.message ?? "Unable to create workspace.")

  await supabaseAdmin.from("workspace_member").upsert(
    {
      workspace_id: workspace.id,
      user_id: owner.userId,
      role: "owner",
      status: "active",
    },
    { onConflict: "workspace_id,user_id" }
  )

  let rawApiKey: string | null = null
  if (input.createApiKey) {
    rawApiKey = `atmet_${randomBytes(20).toString("hex")}`
    const keyHash = createHash("sha256").update(rawApiKey).digest("hex")
    await supabaseAdmin.from("api_key").insert({
      workspace_id: workspace.id,
      created_by: admin.user.id,
      name: input.apiKeyName || "Default workspace key",
      key_hash: keyHash,
      expires_at: input.apiKeyExpiresAt ?? null,
    })
  }

  return ok({ workspace, apiKey: rawApiKey }, 201)
}
