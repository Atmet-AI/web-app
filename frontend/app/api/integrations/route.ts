import { type NextRequest } from "next/server"
import { getUser } from "@/lib/api/auth"
import { getWorkspaceId } from "@/lib/api/workspace"
import { ok } from "@/lib/api/response"
import { INTEGRATIONS_CATALOG } from "@/lib/integrations-catalog"

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

  // Fetch all connected integrations for this workspace
  const { data: connected } = await supabase
    .from("integration")
    .select("slug, status, connected_at")
    .eq("workspace_id", ws.workspaceId)

  const connectedMap = new Map(
    (connected ?? []).map((r) => [r.slug, r])
  )

  // Merge catalog with DB connection state
  const integrations = INTEGRATIONS_CATALOG.map((entry) => {
    const db = connectedMap.get(entry.slug)
    return {
      ...entry,
      connected: !!db,
      status: db?.status ?? undefined,
      connected_at: db?.connected_at ?? undefined,
    }
  })

  return ok({ integrations })
}
