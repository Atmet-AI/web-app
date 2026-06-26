import { type NextRequest } from "next/server"
import { getUser } from "@/lib/api/auth"
import { getWorkspaceId } from "@/lib/api/workspace"
import { ok, Errors } from "@/lib/api/response"
import { getCatalogIntegration } from "@/lib/integrations-catalog"

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

  const { data: db } = await supabase
    .from("integration")
    .select("status, connected_at")
    .eq("workspace_id", ws.workspaceId)
    .eq("slug", slug)
    .maybeSingle()

  return ok({
    integration: {
      ...catalog,
      connected: !!db,
      status: db?.status ?? undefined,
      connected_at: db?.connected_at ?? undefined,
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

  const { supabase } = auth
  const { slug } = await params

  const { error } = await supabase
    .from("integration")
    .delete()
    .eq("workspace_id", ws.workspaceId)
    .eq("slug", slug)

  if (error) return Errors.internal()

  return ok({ success: true })
}
