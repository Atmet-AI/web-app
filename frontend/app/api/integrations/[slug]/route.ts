import { type NextRequest } from "next/server"
import { getUser } from "@/lib/api/auth"
import { getWorkspaceId } from "@/lib/api/workspace"
import { ok, Errors } from "@/lib/api/response"
import { getCatalogIntegration } from "@/lib/integrations-catalog"
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

  const { data: db } = await supabase
    .from("workspace_integration")
    .select("status, connected_at, connected_account, settings")
    .eq("workspace_id", ws.workspaceId)
    .eq("provider_id", provider.id)
    .maybeSingle()

  return ok({
    integration: {
      ...catalog,
      connected: !!db,
      status: db?.status ?? undefined,
      connected_at: db?.connected_at ?? undefined,
      connected_account: db?.connected_account ?? undefined,
      settings: db?.settings ?? undefined,
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

  if (error) return Errors.internal()

  return ok({ success: true })
}
