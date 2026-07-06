import { type NextRequest } from "next/server"
import { getUser } from "@/lib/api/auth"
import { getWorkspaceId } from "@/lib/api/workspace"
import { ok } from "@/lib/api/response"
import { INTEGRATIONS_CATALOG } from "@/lib/integrations-catalog"
import { ensureIntegrationProvider } from "@/lib/integrations/providers"

export async function GET(request: NextRequest) {
  const auth = await getUser()
  if (!auth.ok) return auth.response

  const ws = getWorkspaceId(request)
  if (!ws.ok) {
    return ok({
      integrations: INTEGRATIONS_CATALOG.map((entry) => ({
        ...entry,
        connected: false,
      })),
    })
  }

  const { supabase } = auth

  await Promise.all(INTEGRATIONS_CATALOG.map((entry) => ensureIntegrationProvider(entry)))

  const { data: connected } = await supabase
    .from("workspace_integration")
    .select("id, status, connected_at, connected_account, connection_name, settings, integration_provider!inner(slug)")
    .eq("workspace_id", ws.workspaceId)
    .order("created_at", { ascending: true })

  const connectedMap = new Map<string, typeof connected>()
  for (const r of connected ?? []) {
      const provider = Array.isArray(r.integration_provider)
        ? r.integration_provider[0]
        : r.integration_provider

    if (!provider?.slug) continue
    const rows = connectedMap.get(provider.slug) ?? []
    rows.push(r)
    connectedMap.set(provider.slug, rows)
  }

  // Merge catalog with DB connection state
  const integrations = INTEGRATIONS_CATALOG.map((entry) => {
    const connections = connectedMap.get(entry.slug) ?? []
    const db = connections[0]
    return {
      ...entry,
      connected: connections.length > 0,
      status: db?.status ?? undefined,
      connected_at: db?.connected_at ?? undefined,
      connected_account: db?.connected_account ?? undefined,
      connection_count: connections.length,
      connections: connections.map((connection) => ({
        id: connection.id,
        connection_name: connection.connection_name,
        connected_account: connection.connected_account,
        status: connection.status,
        connected_at: connection.connected_at,
        settings: connection.settings,
      })),
    }
  })

  return ok({ integrations })
}
