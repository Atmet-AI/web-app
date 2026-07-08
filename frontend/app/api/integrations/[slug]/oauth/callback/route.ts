import { type NextRequest } from "next/server"
import { getUser } from "@/lib/api/auth"
import { ok, Errors } from "@/lib/api/response"
import { assertWorkspaceAdmin } from "@/lib/api/workspace"
import { getCatalogIntegration } from "@/lib/integrations-catalog"
import { upsertIntegrationSecret, upsertWorkspaceIntegration } from "@/lib/integrations/connections"
import { ensureIntegrationProvider, getOAuthProvider } from "@/lib/integrations/providers"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { oauthCallbackSchema } from "@/lib/validations/integration"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const auth = await getUser()
  if (!auth.ok) return auth.response

  const { supabase, user } = auth
  const { slug } = await params

  const catalog = getCatalogIntegration(slug)
  if (!catalog) return Errors.notFound("Integration")
  if (catalog.authType !== "oauth") {
    return Errors.badRequest("OAuth callback is not available for this integration.")
  }

  const oauthProvider = getOAuthProvider(slug)
  if (!oauthProvider) {
    return Errors.badRequest("OAuth is not configured for this integration yet.")
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Errors.badRequest("Invalid JSON body.")
  }

  const parsed = oauthCallbackSchema.safeParse(body)
  if (!parsed.success) return Errors.validationError(parsed.error.issues[0].message)

  const { code, state } = parsed.data

  try {
    const provider = await ensureIntegrationProvider(catalog)
    const now = new Date()

    const { data: oauthState, error: stateError } = await supabaseAdmin
      .from("oauth_state")
      .select("id, workspace_id")
      .eq("state", state)
      .eq("provider_id", provider.id)
      .eq("user_id", user.id)
      .gt("expires_at", now.toISOString())
      .is("consumed_at", null)
      .maybeSingle()

    if (stateError || !oauthState) {
      return Errors.badRequest("OAuth state is invalid or expired. Please reconnect the integration.")
    }

    const canManageIntegrations = await assertWorkspaceAdmin(
      supabase,
      oauthState.workspace_id,
      user.id
    )
    if (!canManageIntegrations) return Errors.forbidden()

    const token = await oauthProvider.exchangeCode({
      requestUrl: request.url,
      slug,
      code,
    })

    const profile = oauthProvider.getProfile
      ? await oauthProvider.getProfile(token.access_token)
      : {}
    const expiresAt = token.expires_in
      ? new Date(now.getTime() + token.expires_in * 1000).toISOString()
      : null

    const connection = await upsertWorkspaceIntegration({
      workspaceId: oauthState.workspace_id,
      providerId: provider.id,
      userId: user.id,
      connectedAccount: profile.email ?? null,
      settings: { scopes: token.scope?.split(" ") ?? [] },
    })

    await upsertIntegrationSecret({
      workspaceIntegrationId: connection.id,
      secretType: "oauth_token",
      payload: token,
      expiresAt,
    })

    await supabaseAdmin
      .from("oauth_state")
      .update({ consumed_at: now.toISOString() })
      .eq("id", oauthState.id)
  } catch (error) {
    const message = error instanceof Error ? error.message : "OAuth callback failed."
    return Errors.badRequest(message)
  }

  return ok({ success: true })
}
