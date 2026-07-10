import "server-only"

import { supabaseAdmin } from "@/lib/supabase/admin"
import { openSecretPayload, sealSecretPayload, type SealedSecret } from "@/lib/integrations/secrets"

type WorkspaceIntegrationInput = {
  workspaceId: string
  providerId: string
  userId: string
  connectionName?: string | null
  connectedAccount?: string | null
  settings?: Record<string, unknown>
  connectorProvider?: "native" | "composio" | "mcp" | "external_api"
  externalConnectionId?: string | null
  externalUserId?: string | null
  externalAuthConfigId?: string | null
  externalMetadata?: Record<string, unknown> | null
}

type WorkspaceIntegrationRecord = {
  id: string
}

type SecretInput = {
  workspaceIntegrationId: string
  secretType: "oauth_token" | "api_key" | "webhook_secret"
  payload: unknown
  expiresAt?: string | null
}

export async function upsertWorkspaceIntegration({
  workspaceId,
  providerId,
  userId,
  connectionName = null,
  connectedAccount = null,
  settings = {},
  connectorProvider = "native",
  externalConnectionId = null,
  externalUserId = null,
  externalAuthConfigId = null,
  externalMetadata = null,
}: WorkspaceIntegrationInput): Promise<WorkspaceIntegrationRecord> {
  const { data: existing, error: existingError } = await supabaseAdmin
    .from("workspace_integration")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("provider_id", providerId)
    .eq("created_by", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle()

  if (existingError) {
    throw new Error(existingError.message)
  }

  if (existing?.id) {
    const { data, error } = await supabaseAdmin
      .from("workspace_integration")
      .update({
        created_by: userId,
        status: "active",
        connection_name: connectionName,
        connected_account: connectedAccount,
        settings,
        connector_provider: connectorProvider,
        external_connection_id: externalConnectionId,
        external_user_id: externalUserId,
        external_auth_config_id: externalAuthConfigId,
        external_metadata: externalMetadata,
        connected_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select("id")
      .single()

    if (error || !data) {
      throw new Error(error?.message ?? "Unable to save integration connection.")
    }

    return data
  }

  return createWorkspaceIntegration({
    workspaceId,
    providerId,
    userId,
    connectionName,
    connectedAccount,
    settings,
    connectorProvider,
    externalConnectionId,
    externalUserId,
    externalAuthConfigId,
    externalMetadata,
  })
}

export async function createWorkspaceIntegration({
  workspaceId,
  providerId,
  userId,
  connectionName = null,
  connectedAccount = null,
  settings = {},
  connectorProvider = "native",
  externalConnectionId = null,
  externalUserId = null,
  externalAuthConfigId = null,
  externalMetadata = null,
}: WorkspaceIntegrationInput): Promise<WorkspaceIntegrationRecord> {
  const { data, error } = await supabaseAdmin
    .from("workspace_integration")
    .insert({
      workspace_id: workspaceId,
      provider_id: providerId,
      created_by: userId,
      status: "active",
      connection_name: connectionName,
      connected_account: connectedAccount,
      settings,
      connector_provider: connectorProvider,
      external_connection_id: externalConnectionId,
      external_user_id: externalUserId,
      external_auth_config_id: externalAuthConfigId,
      external_metadata: externalMetadata,
      connected_at: new Date().toISOString(),
    })
    .select("id")
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to save integration connection.")
  }

  return data
}

export async function upsertIntegrationSecret({
  workspaceIntegrationId,
  secretType,
  payload,
  expiresAt = null,
}: SecretInput) {
  const encryptedValue = sealSecretPayload(payload)

  const { error } = await supabaseAdmin.from("integration_secret").upsert(
    {
      workspace_integration_id: workspaceIntegrationId,
      secret_type: secretType,
      encrypted_value: encryptedValue,
      expires_at: expiresAt,
      last_refreshed_at: new Date().toISOString(),
    },
    { onConflict: "workspace_integration_id,secret_type" }
  )

  if (error) {
    throw new Error(error.message)
  }
}

export async function getIntegrationSecretPayload<T>(
  workspaceIntegrationId: string,
  secretType: "oauth_token" | "api_key" | "webhook_secret"
): Promise<T> {
  const { data, error } = await supabaseAdmin
    .from("integration_secret")
    .select("encrypted_value")
    .eq("workspace_integration_id", workspaceIntegrationId)
    .eq("secret_type", secretType)
    .maybeSingle()

  if (error || !data?.encrypted_value) {
    throw new Error("Integration secret was not found.")
  }

  return openSecretPayload<T>(data.encrypted_value as SealedSecret)
}
