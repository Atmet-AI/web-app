import { getAdminUser } from "@/lib/api/admin"
import { Errors, ok } from "@/lib/api/response"
import { supabaseAdmin } from "@/lib/supabase/admin"

function sinceDate(period: string) {
  const now = new Date()
  const days =
    period === "Today" ? 1 : period === "Last 30 days" ? 30 : period === "Last 90 days" ? 90 : 7
  now.setDate(now.getDate() - days)
  return now.toISOString()
}

function formatActivityDate(value: string) {
  return new Date(value).toLocaleString()
}

async function listAuthUsers() {
  type AuthUser = Awaited<
    ReturnType<typeof supabaseAdmin.auth.admin.listUsers>
  >["data"]["users"][number]
  const users: AuthUser[] = []
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw error
    users.push(...data.users)
    if (data.users.length < 1000) break
  }
  return users
}

export async function GET(request: Request) {
  const admin = await getAdminUser()
  if (!admin.ok) return admin.response

  const url = new URL(request.url)
  const period = url.searchParams.get("period") ?? "Last 7 days"
  const since = sinceDate(period)

  const [
    totalUsers,
    newUsers,
    workspaces,
    newWorkspaces,
    pendingRequests,
    onlineUsers,
    automations,
    chats,
    recentUsers,
    recentWorkspaces,
    recentRequests,
    authUsers,
  ] = await Promise.all([
    supabaseAdmin.from("users").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("users").select("id", { count: "exact", head: true }).gte("created_at", since),
    supabaseAdmin.from("workspace").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("workspace").select("id", { count: "exact", head: true }).gte("created_at", since),
    supabaseAdmin.from("waitlist").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabaseAdmin.from("user_presence").select("user_id", { count: "exact", head: true }).gte("last_seen_at", new Date(Date.now() - 2 * 60 * 1000).toISOString()),
    supabaseAdmin.from("automation").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("chat").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("users").select("id, full_name, email, avatar_url, created_at").order("created_at", { ascending: false }).limit(5),
    supabaseAdmin.from("workspace").select("id, name, created_at").order("created_at", { ascending: false }).limit(5),
    supabaseAdmin.from("waitlist").select("id, name, email, status, created_at").order("created_at", { ascending: false }).limit(5),
    listAuthUsers(),
  ])

  const hasError = [
    totalUsers.error,
    newUsers.error,
    workspaces.error,
    newWorkspaces.error,
    pendingRequests.error,
    onlineUsers.error,
    automations.error,
    chats.error,
    recentUsers.error,
    recentWorkspaces.error,
    recentRequests.error,
  ].some(Boolean)

  if (hasError) return Errors.internal()

  const activeSince = Date.now() - 14 * 24 * 60 * 60 * 1000
  const recentlySignedInUsers = authUsers.filter((user) => {
    const lastSignInAt = user.last_sign_in_at ? Date.parse(user.last_sign_in_at) : 0
    return lastSignInAt >= activeSince
  }).length

  const activity = [
    ...(recentUsers.data ?? []).map((user) => ({
      id: `user-${user.id}`,
      timestamp: formatActivityDate(user.created_at),
      actor: user.full_name ?? user.email ?? "Unknown user",
      description: "Joined Atmet.",
      workspace: "Platform",
      type: "User",
      avatar_url: user.avatar_url,
    })),
    ...(recentWorkspaces.data ?? []).map((workspace) => ({
      id: `workspace-${workspace.id}`,
      timestamp: formatActivityDate(workspace.created_at),
      actor: "System",
      description: `Workspace ${workspace.name} was created.`,
      workspace: workspace.name,
      type: "Workspace",
      avatar_url: null,
    })),
    ...(recentRequests.data ?? []).map((entry) => ({
      id: `request-${entry.id}`,
      timestamp: formatActivityDate(entry.created_at),
      actor: entry.name ?? entry.email ?? "Unknown request",
      description: `Waitlist request is ${entry.status}.`,
      workspace: "Waitlist",
      type: "Request",
      avatar_url: null,
    })),
  ].sort((first, second) => Date.parse(second.timestamp) - Date.parse(first.timestamp)).slice(0, 12)

  return ok({
    stats: [
      {
        label: "Total users",
        value: totalUsers.count ?? 0,
        delta: newUsers.count ?? 0,
        deltaTone: "positive",
        deltaLabel: `${newUsers.count ?? 0} new in ${period.toLowerCase()}`,
      },
      {
        label: "Active users",
        value: recentlySignedInUsers,
        caption: "Logged in during the last 14 days.",
      },
      {
        label: "Online users",
        value: onlineUsers.count ?? 0,
        caption: "Heartbeat seen in the last 2 minutes.",
      },
      {
        label: "Total workspaces",
        value: workspaces.count ?? 0,
        delta: newWorkspaces.count ?? 0,
        deltaTone: "positive",
        deltaLabel: `${newWorkspaces.count ?? 0} new in ${period.toLowerCase()}`,
      },
      { label: "Wishlist pending requests", value: pendingRequests.count ?? 0 },
      {
        label: "Automations",
        value: automations.count ?? 0,
      },
      { label: "Chats total", value: chats.count ?? 0 },
      { label: "Empty", value: 0, placeholder: true },
      { label: "Empty", value: 0, placeholder: true },
    ],
    activity,
  })
}
