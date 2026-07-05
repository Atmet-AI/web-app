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
    .select("status, connected_at, connected_account, integration_provider!inner(slug)")
    .eq("workspace_id", ws.workspaceId)

  const connectedMap = new Map(
    (connected ?? []).map((r) => {
      const provider = Array.isArray(r.integration_provider)
        ? r.integration_provider[0]
        : r.integration_provider

      return [provider?.slug, r]
    })
  )

  // Merge catalog with DB connection state
  const integrations = INTEGRATIONS_CATALOG.map((entry) => {
    const db = connectedMap.get(entry.slug)
    return {
      ...entry,
      connected: !!db,
      status: db?.status ?? undefined,
      connected_at: db?.connected_at ?? undefined,
      connected_account: db?.connected_account ?? undefined,
    }
  })

  return ok({ integrations })
}
