import type { NextRequest } from "next/server"
import { Errors } from "@/lib/api/response"
import { supabaseAdmin } from "@/lib/supabase/admin"
import type { User } from "@supabase/supabase-js"
import type { SupabaseClient } from "@supabase/supabase-js"

type WorkspaceResult =
  | { ok: true; workspaceId: string }
  | { ok: false; response: ReturnType<typeof Errors.badRequest> }

export function getWorkspaceId(request: NextRequest): WorkspaceResult {
  const workspaceId = request.headers.get("x-workspace-id")

  if (!workspaceId) {
    return {
      ok: false,
      response: Errors.badRequest("Missing required header: x-workspace-id"),
    }
  }

  return { ok: true, workspaceId }
}

export async function getPlatformWorkspaceForSuperAdmin(user: User) {
  const { data: profile } = await supabaseAdmin
    .from("users")
    .select("id, email, full_name, platform_role")
    .eq("id", user.id)
    .maybeSingle()

  const email = user.email?.toLowerCase()
  const allowedEmails = (process.env.SUPER_ADMIN_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
  const isSuperAdmin =
    profile?.platform_role === "super_admin" ||
    (email ? allowedEmails.includes(email) : false) ||
    user.app_metadata?.platform_role === "super_admin" ||
    user.app_metadata?.role === "super_admin" ||
    user.user_metadata?.platform_role === "super_admin"

  if (!isSuperAdmin) return null

  if (profile?.platform_role !== "super_admin") {
    await supabaseAdmin.from("users").upsert(
      {
        id: user.id,
        email: user.email ?? profile?.email ?? "",
        full_name: profile?.full_name ?? user.user_metadata?.full_name ?? null,
        platform_role: "super_admin",
        onboarding_completed: true,
        status: "active",
      },
      { onConflict: "id" }
    )
  }

  const { data: existingWorkspaces, error: findError } = await supabaseAdmin
    .from("workspace")
    .select("id")
    .eq("owner_id", user.id)
    .eq("name", "Atmet")
    .order("created_at", { ascending: true })
    .limit(1)

  if (findError) return null

  let workspaceId = existingWorkspaces?.[0]?.id as string | undefined

  if (!workspaceId) {
    const { data: workspace, error: createError } = await supabaseAdmin
      .from("workspace")
      .insert({
        name: "Atmet",
        plan: "enterprise",
        owner_id: user.id,
        avatar_url: "/Logos/Favicon Atmet.png",
      })
      .select("id")
      .single()

    if (createError || !workspace) return null
    workspaceId = workspace.id
  }

  await supabaseAdmin.from("workspace_member").upsert(
    {
      workspace_id: workspaceId,
      user_id: user.id,
      role: "owner",
    },
    { onConflict: "workspace_id,user_id" }
  )

  return workspaceId
}

export async function getWorkspaceIdOrPlatformWorkspace(
  request: NextRequest,
  user: User
): Promise<WorkspaceResult> {
  const ws = getWorkspaceId(request)
  if (ws.ok) return ws

  const platformWorkspaceId = await getPlatformWorkspaceForSuperAdmin(user)
  if (platformWorkspaceId) {
    return { ok: true, workspaceId: platformWorkspaceId }
  }

  return ws
}

export async function assertWorkspaceMember(
  supabase: SupabaseClient,
  workspaceId: string,
  userId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("workspace_member")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle()

  return !!data
}

export async function assertWorkspaceAdmin(
  supabase: SupabaseClient,
  workspaceId: string,
  userId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("workspace_member")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .eq("role", "owner")
    .maybeSingle()

  return !!data
}
