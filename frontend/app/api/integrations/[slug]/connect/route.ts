import { type NextRequest } from "next/server"
import { getUser } from "@/lib/api/auth"
import { assertWorkspaceAdmin, getWorkspaceId } from "@/lib/api/workspace"
import { ok, Errors } from "@/lib/api/response"
import { getCatalogIntegration } from "@/lib/integrations-catalog"
import {
  createComposioApiKeyConnectedAccount,
  getComposioUserId,
} from "@/lib/integrations/composio"
import {
  createWorkspaceIntegration,
  upsertIntegrationSecret,
  upsertWorkspaceIntegration,
} from "@/lib/integrations/connections"
import { ensureIntegrationProvider } from "@/lib/integrations/providers"
import { connectApiKeySchema } from "@/lib/validations/integration"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const auth = await getUser()
  if (!auth.ok) return auth.response

  const ws = getWorkspaceId(request)
  if (!ws.ok) return ws.response
  const workspaceId = ws.workspaceId

  const { supabase, user } = auth
  const { slug } = await params

  const canManageIntegrations = await assertWorkspaceAdmin(supabase, workspaceId, user.id)
  if (!canManageIntegrations) return Errors.forbidden()

  const catalog = getCatalogIntegration(slug)
  if (!catalog) return Errors.notFound("Integration")
  const integrationName = catalog.name
  if (catalog.authType !== "apikey") {
    return Errors.badRequest("This integration uses OAuth, not API keys.")
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Errors.badRequest("Invalid JSON body.")
  }

  const parsed = connectApiKeySchema.safeParse(body)
  if (!parsed.success) return Errors.validationError(parsed.error.issues[0].message)

  const { apiKey, keyName } = parsed.data

  const connectorProvider: "native" | "composio" | "mcp" | "external_api" =
    catalog.connectorProvider ?? "native"

  try {
    const provider = await ensureIntegrationProvider(catalog)
    let connectedAccount = keyName ?? null
    const toolkit = catalog.composioToolkit ?? catalog.slug
    const composioUserId =
      connectorProvider === "composio" ? getComposioUserId(workspaceId, user.id) : null
    let externalConnectionId: string | null = null
    let externalAuthConfigId: string | null = null
    let externalMetadata: Record<string, unknown> | null = null
    const settings: Record<string, unknown> = { key_name: keyName ?? null }

    async function linkComposioApiKeyAccount() {
      if (connectorProvider !== "composio") return

      const composioAccount = await createComposioApiKeyConnectedAccount({
        workspaceId,
        userId: user.id,
        toolkit,
        apiKey,
        alias: `${slug}-${Date.now()}`,
      })
      externalConnectionId = composioAccount.connectedAccountId
      externalAuthConfigId = composioAccount.authConfigId
      connectedAccount = keyName?.trim() || `${integrationName} via Composio`
      externalMetadata = {
        toolkit,
        composioStatus: composioAccount.status,
        authMode: "api_key",
      }
    }

    if (slug === "telegram") {
      await linkComposioApiKeyAccount()
      const connectionName = keyName?.trim() || connectedAccount

      const connection = await createWorkspaceIntegration({
        workspaceId,
        providerId: provider.id,
        userId: user.id,
        connectionName,
        connectedAccount,
        settings,
        connectorProvider,
        externalConnectionId,
        externalUserId: composioUserId,
        externalAuthConfigId,
        externalMetadata,
      })

      return ok({ success: true, connection })
    }

    await linkComposioApiKeyAccount()

    const connection = await upsertWorkspaceIntegration({
      workspaceId,
      providerId: provider.id,
      userId: user.id,
      connectionName: keyName ?? null,
      connectedAccount,
      settings,
      connectorProvider,
      externalConnectionId,
      externalUserId: composioUserId,
      externalAuthConfigId,
      externalMetadata,
    })

    if (connectorProvider !== "composio") {
      await upsertIntegrationSecret({
        workspaceIntegrationId: connection.id,
        secretType: "api_key",
        payload: { api_key: apiKey, key_name: keyName ?? null },
      })
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to save integration connection."
    return connectorProvider === "composio" ? connectorProviderError(message) : Errors.badRequest(message)
  }

  return ok({ success: true })
}

function connectorProviderError(message: string) {
  return Errors.badRequest(
    `Composio could not create this connection. ${message}`
  )
}
