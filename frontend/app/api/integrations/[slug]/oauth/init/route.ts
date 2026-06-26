import { type NextRequest } from "next/server"
import { getUser } from "@/lib/api/auth"
import { getWorkspaceId } from "@/lib/api/workspace"
import { ok, Errors } from "@/lib/api/response"
import { getCatalogIntegration } from "@/lib/integrations-catalog"

export async function POST(
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
  if (catalog.authType !== "oauth") {
    return Errors.badRequest("OAuth initialization is not available for this integration.")
  }

  // TODO: replace with real OAuth authorize URL construction per integration
  // e.g. for Gmail: https://accounts.google.com/o/oauth2/v2/auth?client_id=...
  const baseUrl = new URL(request.url)
  const callbackUrl = new URL(`/apps/${slug}/callback`, baseUrl.origin)
  callbackUrl.searchParams.set("code", `mock-${slug}-code`)

  return ok({ redirectUrl: callbackUrl.toString() })
}
