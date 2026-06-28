import { type NextRequest } from "next/server"
import { z } from "zod"

import { getAdminUser } from "@/lib/api/admin"
import { Errors, ok } from "@/lib/api/response"
import { supabaseAdmin } from "@/lib/supabase/admin"

const defaultLimits = {
  monthlyTokenCap: 50000,
  maxFileSizeMb: 250,
  maxFilesPerWorkspace: 10000,
  seatLimit: 10,
}

const globalLimitsSchema = z.object({
  monthlyTokenCap: z.number().int().positive(),
  maxFileSizeMb: z.number().int().positive(),
  maxFilesPerWorkspace: z.number().int().positive(),
  seatLimit: z.number().int().positive(),
})

const updateSchema = z.object({
  globalLimits: globalLimitsSchema.optional(),
  workspaceId: z.string().uuid().optional(),
  workspaceLimits: globalLimitsSchema.partial().nullable().optional(),
})

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0
}

function tokenCountFromMetadata(metadata: unknown) {
  if (!metadata || typeof metadata !== "object") return 0
  const value = metadata as Record<string, unknown>
  return (
    readNumber(value.total_tokens) ||
    readNumber(value.totalTokens) ||
    readNumber(value.tokenCount) ||
    readNumber(value.tokens) ||
    readNumber(value.prompt_tokens) + readNumber(value.completion_tokens) ||
    readNumber(value.promptTokens) + readNumber(value.completionTokens)
  )
}

function featureRecord(features: unknown) {
  return features && typeof features === "object" && !Array.isArray(features)
    ? (features as Record<string, unknown>)
    : {}
}

function limitOverrides(features: unknown) {
  const limits = featureRecord(features).limits
  return limits && typeof limits === "object" && !Array.isArray(limits)
    ? (limits as Record<string, unknown>)
    : {}
}

export async function GET() {
  const admin = await getAdminUser()
  if (!admin.ok) return admin.response

  const [
    settingsRes,
    usersRes,
    membershipsRes,
    workspacesRes,
    messagesRes,
    automationsRes,
    filesRes,
    chatsRes,
    apiKeysRes,
  ] = await Promise.all([
    supabaseAdmin.from("platform_setting").select("value").eq("key", "usage_limits").maybeSingle(),
    supabaseAdmin.from("users").select("id, email, full_name, avatar_url, status, platform_role, updated_at"),
    supabaseAdmin.from("workspace_member").select("role, status, user_id, workspace_id, workspace:workspace_id(id, name, status)"),
    supabaseAdmin.from("workspace").select("id, name, slug, plan, status, owner_id, avatar_url, country, monthly_token_cap, seat_limit, features, created_at, updated_at"),
    supabaseAdmin.from("message").select("metadata, created_at, chat:chat_id(workspace_id, created_by, updated_at)"),
    supabaseAdmin.from("automation").select("id, workspace_id, created_by"),
    supabaseAdmin.from("file").select("id, workspace_id, uploaded_by, size_bytes"),
    supabaseAdmin.from("chat").select("id, workspace_id, created_by"),
    supabaseAdmin.from("api_key").select("id, workspace_id"),
  ])

  const hasError = [
    settingsRes.error,
    usersRes.error,
    membershipsRes.error,
    workspacesRes.error,
    messagesRes.error,
    automationsRes.error,
    filesRes.error,
    chatsRes.error,
    apiKeysRes.error,
  ].some(Boolean)

  if (hasError) return Errors.internal()

  const rawGlobalLimits = settingsRes.data?.value && typeof settingsRes.data.value === "object"
    ? settingsRes.data.value as Record<string, unknown>
    : {}
  const globalLimits = {
    monthlyTokenCap: readNumber(rawGlobalLimits.monthlyTokenCap) || defaultLimits.monthlyTokenCap,
    maxFileSizeMb: readNumber(rawGlobalLimits.maxFileSizeMb) || defaultLimits.maxFileSizeMb,
    maxFilesPerWorkspace: readNumber(rawGlobalLimits.maxFilesPerWorkspace) || defaultLimits.maxFilesPerWorkspace,
    seatLimit: readNumber(rawGlobalLimits.seatLimit) || defaultLimits.seatLimit,
  }

  const workspacesById = new Map((workspacesRes.data ?? []).map((workspace) => [workspace.id, workspace]))
  const usageByWorkspace = new Map<string, { tokens: number; runs: number; files: number; storageBytes: number; chats: number; apiKeys: number }>()
  const usageByUser = new Map<string, { tokens: number; runs: number; files: number; storageBytes: number; chats: number }>()

  const workspaceUsage = (workspaceId: string) => {
    const existing = usageByWorkspace.get(workspaceId) ?? { tokens: 0, runs: 0, files: 0, storageBytes: 0, chats: 0, apiKeys: 0 }
    usageByWorkspace.set(workspaceId, existing)
    return existing
  }
  const userUsage = (userId: string) => {
    const existing = usageByUser.get(userId) ?? { tokens: 0, runs: 0, files: 0, storageBytes: 0, chats: 0 }
    usageByUser.set(userId, existing)
    return existing
  }

  for (const row of messagesRes.data ?? []) {
    const chat = Array.isArray(row.chat) ? row.chat[0] : row.chat
    if (!chat?.workspace_id || !chat.created_by) continue
    const tokens = tokenCountFromMetadata(row.metadata)
    workspaceUsage(chat.workspace_id).tokens += tokens
    userUsage(chat.created_by).tokens += tokens
  }

  for (const row of automationsRes.data ?? []) {
    workspaceUsage(row.workspace_id).runs += 1
    userUsage(row.created_by).runs += 1
  }

  for (const row of filesRes.data ?? []) {
    workspaceUsage(row.workspace_id).files += 1
    workspaceUsage(row.workspace_id).storageBytes += Number(row.size_bytes ?? 0)
    userUsage(row.uploaded_by).files += 1
    userUsage(row.uploaded_by).storageBytes += Number(row.size_bytes ?? 0)
  }

  for (const row of chatsRes.data ?? []) {
    workspaceUsage(row.workspace_id).chats += 1
    userUsage(row.created_by).chats += 1
  }

  for (const row of apiKeysRes.data ?? []) {
    workspaceUsage(row.workspace_id).apiKeys += 1
  }

  const users = (usersRes.data ?? []).map((user) => {
    const memberships = (membershipsRes.data ?? []).filter((member) => member.user_id === user.id)
    const firstMembership = memberships[0]
    const workspace = firstMembership
      ? workspacesById.get(firstMembership.workspace_id)
      : null
    return {
      ...user,
      workspace: workspace ? { id: workspace.id, name: workspace.name } : null,
      role: firstMembership?.role ?? (user.platform_role === "super_admin" ? "super_admin" : "member"),
      usage: usageByUser.get(user.id) ?? { tokens: 0, runs: 0, files: 0, storageBytes: 0, chats: 0 },
    }
  })

  const workspaces = (workspacesRes.data ?? []).map((workspace) => {
    const overrides = limitOverrides(workspace.features)
    const effectiveLimits = {
      monthlyTokenCap: workspace.monthly_token_cap ?? globalLimits.monthlyTokenCap,
      maxFileSizeMb: readNumber(overrides.maxFileSizeMb) || globalLimits.maxFileSizeMb,
      maxFilesPerWorkspace: readNumber(overrides.maxFilesPerWorkspace) || globalLimits.maxFilesPerWorkspace,
      seatLimit: workspace.seat_limit ?? globalLimits.seatLimit,
    }
    const isAdjusted =
      workspace.monthly_token_cap !== null ||
      workspace.seat_limit !== null ||
      Object.keys(overrides).length > 0
    return {
      ...workspace,
      usage: usageByWorkspace.get(workspace.id) ?? { tokens: 0, runs: 0, files: 0, storageBytes: 0, chats: 0, apiKeys: 0 },
      effectiveLimits,
      isAdjusted,
    }
  })

  return ok({
    globalLimits,
    summary: {
      tokens: workspaces.reduce((total, workspace) => total + workspace.usage.tokens, 0),
      runs: workspaces.reduce((total, workspace) => total + workspace.usage.runs, 0),
      files: workspaces.reduce((total, workspace) => total + workspace.usage.files, 0),
      storageBytes: workspaces.reduce((total, workspace) => total + workspace.usage.storageBytes, 0),
      chats: workspaces.reduce((total, workspace) => total + workspace.usage.chats, 0),
      apiKeys: workspaces.reduce((total, workspace) => total + workspace.usage.apiKeys, 0),
    },
    users,
    workspaces,
    adjustedWorkspaces: workspaces.filter((workspace) => workspace.isAdjusted),
  })
}

export async function PUT(request: NextRequest) {
  const admin = await getAdminUser("super_admin")
  if (!admin.ok) return admin.response

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Errors.badRequest("Invalid JSON body.")
  }

  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return Errors.validationError(parsed.error.issues[0].message)

  if (parsed.data.globalLimits) {
    const { error } = await supabaseAdmin.from("platform_setting").upsert(
      {
        key: "usage_limits",
        value: parsed.data.globalLimits,
        updated_by: admin.user.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" }
    )
    if (error) return Errors.internal()
  }

  if (parsed.data.workspaceId) {
    const workspaceLimits = parsed.data.workspaceLimits
    const { data: workspace, error: workspaceError } = await supabaseAdmin
      .from("workspace")
      .select("features")
      .eq("id", parsed.data.workspaceId)
      .maybeSingle()
    if (workspaceError) return Errors.internal()

    const features = featureRecord(workspace?.features)
    const nextFeatures = {
      ...features,
      limits: workspaceLimits
        ? {
            maxFileSizeMb: workspaceLimits.maxFileSizeMb ?? null,
            maxFilesPerWorkspace: workspaceLimits.maxFilesPerWorkspace ?? null,
          }
        : undefined,
    }

    if (!workspaceLimits) delete nextFeatures.limits

    const { error } = await supabaseAdmin
      .from("workspace")
      .update({
        monthly_token_cap: workspaceLimits?.monthlyTokenCap ?? null,
        seat_limit: workspaceLimits?.seatLimit ?? null,
        features: nextFeatures,
        updated_at: new Date().toISOString(),
      })
      .eq("id", parsed.data.workspaceId)
    if (error) return Errors.internal()
  }

  return ok({ success: true })
}
