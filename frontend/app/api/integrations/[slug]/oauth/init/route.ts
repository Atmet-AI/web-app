import { type NextRequest } from "next/server"
import { getUser } from "@/lib/api/auth"
import { getWorkspaceId } from "@/lib/api/workspace"
import { ok, Errors } from "@/lib/api/response"
import { getCatalogIntegration } from "@/lib/integrations-catalog"
import { createOAuthState, ensureIntegrationProvider, getOAuthProvider } from "@/lib/integrations/providers"
import { supabaseAdmin } from "@/lib/supabase/admin"

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

  const oauthProvider = getOAuthProvider(slug)
  if (!oauthProvider) {
    return Errors.badRequest("OAuth is not configured for this integration yet.")
  }

  try {
    const provider = await ensureIntegrationProvider(catalog)
    const state = createOAuthState()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

    const { error } = await supabaseAdmin.from("oauth_state").insert({
      state,
      workspace_id: ws.workspaceId,
      provider_id: provider.id,
      user_id: auth.user.id,
      redirect_after: `/apps/${slug}`,
      expires_at: expiresAt,
    })

    if (error) return Errors.internal()

    return ok({
      redirectUrl: oauthProvider.buildAuthorizeUrl({
        requestUrl: request.url,
        slug,
        state,
        catalog,
      }),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to start OAuth connection."
    return Errors.badRequest(message)
  }
}
