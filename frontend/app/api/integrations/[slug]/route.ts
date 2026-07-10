import { type NextRequest } from "next/server"
import { getUser } from "@/lib/api/auth"
import { getWorkspaceId } from "@/lib/api/workspace"
import { ok, Errors } from "@/lib/api/response"
import { getCatalogIntegration } from "@/lib/integrations-catalog"
import { syncComposioWorkspaceConnections } from "@/lib/integrations/composio-sync"
import { ensureIntegrationProvider } from "@/lib/integrations/providers"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const auth = await getUser()
  if (!auth.ok) return auth.response

  const ws = getWorkspaceId(request)
  const { slug } = await params

  const catalog = getCatalogIntegration(slug)
  if (!catalog) return Errors.notFound("Integration")

  if (!ws.ok) {
    return ok({
      integration: {
        ...catalog,
        connected: false,
      },
    })
  }

  const { supabase } = auth
  const provider = await ensureIntegrationProvider(catalog)

  if (catalog.connectorProvider === "composio" && catalog.composioToolkit) {
    try {
      await syncComposioWorkspaceConnections({
        workspaceId: ws.workspaceId,
        providerId: provider.id,
        providerName: catalog.name,
        userId: auth.user.id,
        toolkit: catalog.composioToolkit,
      })
    } catch (error) {
      console.error("Unable to sync Composio integration state", error)
    }
  }

  const { data: connections } = await supabase
    .from("workspace_integration")
    .select(
      "id, status, connected_at, connected_account, connection_name, settings, connector_provider, external_connection_id, external_user_id, external_metadata"
    )
    .eq("workspace_id", ws.workspaceId)
    .eq("provider_id", provider.id)
    .eq("created_by", auth.user.id)
    .order("created_at", { ascending: true })

  const activeConnections =
    connections?.filter((connection) => connection.status === "active") ?? []
  const db = activeConnections[0] ?? connections?.[0]

  return ok({
    integration: {
      ...catalog,
      connected: activeConnections.length > 0,
      status: db?.status ?? undefined,
      connected_at: db?.connected_at ?? undefined,
      connected_account: db?.connected_account ?? undefined,
      settings: db?.settings ?? undefined,
      connection_count: activeConnections.length,
      connections:
        connections?.map((connection) => ({
          id: connection.id,
          connection_name: connection.connection_name,
          connected_account: connection.connected_account,
          status: connection.status,
          connected_at: connection.connected_at,
          settings: connection.settings,
          connector_provider: connection.connector_provider,
          external_connection_id: connection.external_connection_id,
          external_user_id: connection.external_user_id,
          external_metadata: connection.external_metadata,
        })) ?? [],
    },
  })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const auth = await getUser()
  if (!auth.ok) return auth.response

  const ws = getWorkspaceId(request)
  if (!ws.ok) return ws.response

  const { slug } = await params

  const catalog = getCatalogIntegration(slug)
  if (!catalog) return Errors.notFound("Integration")

  const { supabase } = auth
  const provider = await ensureIntegrationProvider(catalog)

  const { error } = await supabase
    .from("workspace_integration")
    .delete()
    .eq("workspace_id", ws.workspaceId)
    .eq("provider_id", provider.id)
    .eq("created_by", auth.user.id)

  if (error) return Errors.internal()

  return ok({ success: true })
}
