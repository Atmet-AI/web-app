import "server-only"

import {
  getComposioUserId,
  listComposioConnectedAccounts,
  normalizeComposioToolkit,
  toWorkspaceIntegrationStatus,
  type ComposioConnectedAccount,
} from "@/lib/integrations/composio"
import { supabaseAdmin } from "@/lib/supabase/admin"

function connectionLabel(account: ComposioConnectedAccount, fallbackName: string) {
  return account.alias ?? account.wordId ?? `${fallbackName} account`
}

export async function syncComposioWorkspaceConnections(input: {
  workspaceId: string
  providerId: string
  providerName: string
  userId: string
  toolkit: string
}) {
  const toolkit = normalizeComposioToolkit(input.toolkit)
  const composioUserId = getComposioUserId(input.workspaceId, input.userId)
  const accounts = await listComposioConnectedAccounts({
    workspaceId: input.workspaceId,
    userId: input.userId,
    toolkit,
  })

  await Promise.all(
    accounts.map(async (account) => {
      const status = toWorkspaceIntegrationStatus(account.status)
      const connectedAt =
        status === "active" ? account.updatedAt ?? new Date().toISOString() : null
      const label = connectionLabel(account, input.providerName)
      const externalMetadata = {
        toolkit,
        composioStatus: account.status,
        statusReason: account.statusReason,
        isDisabled: account.isDisabled,
        updatedAt: account.updatedAt,
      }

      const { data: existing, error: existingError } = await supabaseAdmin
        .from("workspace_integration")
        .select("id")
        .eq("workspace_id", input.workspaceId)
        .eq("provider_id", input.providerId)
        .eq("created_by", input.userId)
        .eq("connector_provider", "composio")
        .eq("external_connection_id", account.id)
        .maybeSingle()

      if (existingError) throw new Error(existingError.message)

      if (existing?.id) {
        const { error } = await supabaseAdmin
          .from("workspace_integration")
          .update({
            status,
            connection_name: label,
            connected_account: label,
            connector_provider: "composio",
            external_user_id: composioUserId,
            external_auth_config_id: account.authConfigId,
            external_metadata: externalMetadata,
            connected_at: connectedAt,
          })
          .eq("id", existing.id)

        if (error) throw new Error(error.message)
        return
      }

      const { error } = await supabaseAdmin.from("workspace_integration").insert({
        workspace_id: input.workspaceId,
        provider_id: input.providerId,
        created_by: input.userId,
        status,
        connection_name: label,
        connected_account: label,
        settings: {
          toolkit,
        },
        connector_provider: "composio",
        external_connection_id: account.id,
        external_user_id: composioUserId,
        external_auth_config_id: account.authConfigId,
        external_metadata: externalMetadata,
        connected_at: connectedAt,
      })

      if (error) throw new Error(error.message)
    })
  )

  return accounts
}
