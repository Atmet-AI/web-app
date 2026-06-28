import { type NextRequest } from "next/server"
import { z } from "zod"

import { getUser } from "@/lib/api/auth"
import { Errors, ok } from "@/lib/api/response"
import { supabaseAdmin } from "@/lib/supabase/admin"

const defaultLimits = {
  monthlyTokenCap: 50000,
  maxFileSizeMb: 250,
  maxFilesPerWorkspace: 10000,
  seatLimit: 10,
}

const memberLimitSchema = z.object({
  userId: z.string().uuid(),
  monthlyTokenCap: z.number().int().positive().nullable(),
})

const updateSchema = z.object({
  memberLimits: z.array(memberLimitSchema).min(1),
})

type UsageBucket = {
  tokens: number
  runs: number
  files: number
  storageBytes: number
  chats: number
  apiKeys: number
}

function emptyUsage(): UsageBucket {
  return {
    tokens: 0,
    runs: 0,
    files: 0,
    storageBytes: 0,
    chats: 0,
    apiKeys: 0,
  }
}

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

function shouldIncludeDate(dateValue: unknown, range: string | null) {
  if (!range || range === "all") return true
  if (typeof dateValue !== "string") return true
  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) return true
  const now = Date.now()
  const days = range === "week" ? 7 : range === "month" ? 30 : 0
  if (!days) return true
  return date.getTime() >= now - days * 24 * 60 * 60 * 1000
}

function normalizeRange(value: string | null) {
  return value === "week" || value === "month" || value === "all"
    ? value
    : "month"
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getUser()
  if (!auth.ok) return auth.response

  const { id: workspaceId } = await params
  const range = normalizeRange(request.nextUrl.searchParams.get("range"))

  const membershipRes = await supabaseAdmin
    .from("workspace_member")
    .select("role, status, monthly_token_cap")
    .eq("workspace_id", workspaceId)
    .eq("user_id", auth.user.id)
    .maybeSingle()

  if (membershipRes.error) return Errors.internal()
  if (!membershipRes.data || membershipRes.data.status !== "active") {
    return Errors.forbidden()
  }

  const isOwner = membershipRes.data.role === "owner"

  const [
    settingsRes,
    workspaceRes,
    membersRes,
    messagesRes,
    automationsRes,
    filesRes,
    chatsRes,
    apiKeysRes,
  ] = await Promise.all([
    supabaseAdmin.from("platform_setting").select("value").eq("key", "usage_limits").maybeSingle(),
    supabaseAdmin.from("workspace").select("id, name, monthly_token_cap, seat_limit, features").eq("id", workspaceId).maybeSingle(),
    supabaseAdmin
      .from("workspace_member")
      .select("role, status, joined_at, monthly_token_cap, user:user_id(id, email, full_name, avatar_url, status)")
      .eq("workspace_id", workspaceId)
      .eq("status", "active"),
    supabaseAdmin.from("message").select("metadata, created_at, chat:chat_id!inner(workspace_id, created_by)").eq("chat.workspace_id", workspaceId),
    supabaseAdmin.from("automation").select("id, workspace_id, created_by, created_at").eq("workspace_id", workspaceId),
    supabaseAdmin.from("file").select("id, workspace_id, uploaded_by, size_bytes, created_at").eq("workspace_id", workspaceId),
    supabaseAdmin.from("chat").select("id, workspace_id, created_by, created_at").eq("workspace_id", workspaceId),
    supabaseAdmin.from("api_key").select("id, workspace_id, created_by, created_at").eq("workspace_id", workspaceId),
  ])

  const hasError = [
    settingsRes.error,
    workspaceRes.error,
    membersRes.error,
    messagesRes.error,
    automationsRes.error,
    filesRes.error,
    chatsRes.error,
    apiKeysRes.error,
  ].some(Boolean)

  if (hasError) return Errors.internal()
  if (!workspaceRes.data) return Errors.notFound("Workspace")

  const rawGlobalLimits =
    settingsRes.data?.value && typeof settingsRes.data.value === "object"
      ? (settingsRes.data.value as Record<string, unknown>)
      : {}
  const globalLimits = {
    monthlyTokenCap:
      readNumber(rawGlobalLimits.monthlyTokenCap) ||
      defaultLimits.monthlyTokenCap,
    maxFileSizeMb:
      readNumber(rawGlobalLimits.maxFileSizeMb) ||
      defaultLimits.maxFileSizeMb,
    maxFilesPerWorkspace:
      readNumber(rawGlobalLimits.maxFilesPerWorkspace) ||
      defaultLimits.maxFilesPerWorkspace,
    seatLimit: readNumber(rawGlobalLimits.seatLimit) || defaultLimits.seatLimit,
  }

  const overrides = limitOverrides(workspaceRes.data.features)
  const workspaceLimits = {
    monthlyTokenCap:
      workspaceRes.data.monthly_token_cap ?? globalLimits.monthlyTokenCap,
    maxFileSizeMb:
      readNumber(overrides.maxFileSizeMb) || globalLimits.maxFileSizeMb,
    maxFilesPerWorkspace:
      readNumber(overrides.maxFilesPerWorkspace) ||
      globalLimits.maxFilesPerWorkspace,
    seatLimit: workspaceRes.data.seat_limit ?? globalLimits.seatLimit,
  }

  const workspaceUsage = emptyUsage()
  const usageByUser = new Map<string, UsageBucket>()
  const userUsage = (userId: string) => {
    const existing = usageByUser.get(userId) ?? emptyUsage()
    usageByUser.set(userId, existing)
    return existing
  }

  for (const row of messagesRes.data ?? []) {
    if (!shouldIncludeDate(row.created_at, range)) continue
    const chat = Array.isArray(row.chat) ? row.chat[0] : row.chat
    if (!chat?.workspace_id || chat.workspace_id !== workspaceId || !chat.created_by) continue
    const tokens = tokenCountFromMetadata(row.metadata)
    workspaceUsage.tokens += tokens
    userUsage(chat.created_by).tokens += tokens
  }

  for (const row of automationsRes.data ?? []) {
    if (!shouldIncludeDate(row.created_at, range)) continue
    workspaceUsage.runs += 1
    userUsage(row.created_by).runs += 1
  }

  for (const row of filesRes.data ?? []) {
    if (!shouldIncludeDate(row.created_at, range)) continue
    workspaceUsage.files += 1
    workspaceUsage.storageBytes += Number(row.size_bytes ?? 0)
    userUsage(row.uploaded_by).files += 1
    userUsage(row.uploaded_by).storageBytes += Number(row.size_bytes ?? 0)
  }

  for (const row of chatsRes.data ?? []) {
    if (!shouldIncludeDate(row.created_at, range)) continue
    workspaceUsage.chats += 1
    userUsage(row.created_by).chats += 1
  }

  for (const row of apiKeysRes.data ?? []) {
    if (!shouldIncludeDate(row.created_at, range)) continue
    workspaceUsage.apiKeys += 1
    if (row.created_by) userUsage(row.created_by).apiKeys += 1
  }

  const members = (membersRes.data ?? []).map((row) => {
    const user = Array.isArray(row.user) ? row.user[0] : row.user
    const usage = user?.id ? usageByUser.get(user.id) ?? emptyUsage() : emptyUsage()
    return {
      id: user?.id ?? "",
      email: user?.email ?? "",
      fullName: user?.full_name ?? user?.email ?? "Unknown user",
      avatarUrl: user?.avatar_url ?? "",
      accountStatus: user?.status ?? "active",
      role: row.role,
      joinedAt: row.joined_at,
      monthlyTokenCap: row.monthly_token_cap ?? null,
      usage,
    }
  })

  const currentUserLimit =
    membershipRes.data.monthly_token_cap ?? workspaceLimits.monthlyTokenCap
  const currentUserUsage = usageByUser.get(auth.user.id) ?? emptyUsage()

  return ok({
    role: membershipRes.data.role,
    canManageLimits: isOwner,
    scopeOptions: isOwner ? ["workspace", "user"] : ["user"],
    globalLimits,
    workspaceLimits,
    currentUserLimit,
    workspaceUsage,
    userUsage: currentUserUsage,
    members: isOwner ? members : [],
  })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getUser()
  if (!auth.ok) return auth.response

  const { id: workspaceId } = await params
  const { data: membership, error: membershipError } = await supabaseAdmin
    .from("workspace_member")
    .select("role, status")
    .eq("workspace_id", workspaceId)
    .eq("user_id", auth.user.id)
    .maybeSingle()

  if (membershipError) return Errors.internal()
  if (!membership || membership.role !== "owner" || membership.status !== "active") {
    return Errors.forbidden()
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Errors.badRequest("Invalid JSON body.")
  }

  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return Errors.validationError(parsed.error.issues[0].message)
  }

  const memberIds = parsed.data.memberLimits.map((limit) => limit.userId)
  const { data: workspaceMembers, error: membersError } = await supabaseAdmin
    .from("workspace_member")
    .select("user_id")
    .eq("workspace_id", workspaceId)
    .in("user_id", memberIds)

  if (membersError) return Errors.internal()

  const validIds = new Set((workspaceMembers ?? []).map((row) => row.user_id))
  if (validIds.size !== memberIds.length) {
    return Errors.badRequest("One or more users do not belong to this workspace.")
  }

  for (const limit of parsed.data.memberLimits) {
    const { error } = await supabaseAdmin
      .from("workspace_member")
      .update({ monthly_token_cap: limit.monthlyTokenCap })
      .eq("workspace_id", workspaceId)
      .eq("user_id", limit.userId)

    if (error) return Errors.internal()
  }

  return ok({ success: true })
}
