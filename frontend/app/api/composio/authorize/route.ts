import { type NextRequest } from "next/server"
import { z } from "zod"

import { getUser } from "@/lib/api/auth"
import { ok, Errors } from "@/lib/api/response"
import { assertWorkspaceMember, getWorkspaceId } from "@/lib/api/workspace"
import {
  createComposioConnectLink,
  getComposioUserId,
  normalizeComposioToolkit,
} from "@/lib/integrations/composio"
import { getCatalogIntegration } from "@/lib/integrations-catalog"
import { ensureIntegrationProvider } from "@/lib/integrations/providers"
import { buildPublicUrl } from "@/lib/public-url"
import { supabaseAdmin } from "@/lib/supabase/admin"

const authorizeSchema = z.object({
  toolkit: z.string().min(1).max(100),
  providerSlug: z.string().min(1).max(100).optional(),
  connectionName: z.string().max(100).optional(),
  alias: z.string().max(100).optional(),
  authConfigId: z.string().max(200).optional(),
  callbackPath: z.string().startsWith("/").max(500).optional(),
})

async function ensureComposioProvider(toolkit: string, providerSlug?: string) {
  if (providerSlug) {
    const catalog = getCatalogIntegration(providerSlug)
    if (catalog?.connectorProvider === "composio") {
      return ensureIntegrationProvider(catalog)
    }
  }

  const slug = `composio_${toolkit}`
  const name = toolkit
    .split(/[_-]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")

  const { data, error } = await supabaseAdmin
    .from("integration_provider")
    .upsert(
      {
        slug,
        name,
        auth_type: "oauth",
        category: "composio",
        description: `${name} connected through Composio.`,
        status: "active",
        connector_provider: "composio",
        external_toolkit: toolkit,
        external_config: {},
        config: {
          connectorProvider: "composio",
          toolkit,
        },
      },
      { onConflict: "slug" }
    )
    .select("id, slug")
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to prepare Composio provider.")
  }

  return data
}

export async function POST(request: NextRequest) {
  const auth = await getUser()
  if (!auth.ok) return auth.response

  const ws = getWorkspaceId(request)
  if (!ws.ok) return ws.response

  const isMember = await assertWorkspaceMember(auth.supabase, ws.workspaceId, auth.user.id)
  if (!isMember) return Errors.forbidden()

  const body = await request.json().catch(() => null)
  const parsed = authorizeSchema.safeParse(body)
  if (!parsed.success) {
    return Errors.validationError(parsed.error.issues[0]?.message ?? "Invalid Composio authorization request.")
  }

  const toolkit = normalizeComposioToolkit(parsed.data.toolkit)
  const provider = await ensureComposioProvider(toolkit, parsed.data.providerSlug)
  const callbackUrl = buildPublicUrl(
    parsed.data.callbackPath ?? `/integrations/${provider.slug}?connected=composio`,
    request,
    { allowLocal: true }
  )

  try {
    const link = await createComposioConnectLink({
      workspaceId: ws.workspaceId,
      userId: auth.user.id,
      toolkit,
      callbackUrl,
      alias: parsed.data.alias,
      authConfigId: parsed.data.authConfigId,
    })

    const composioUserId = getComposioUserId(ws.workspaceId, auth.user.id)
    const { data: connection, error } = await supabaseAdmin
      .from("workspace_integration")
      .insert({
        workspace_id: ws.workspaceId,
        provider_id: provider.id,
        created_by: auth.user.id,
        status: "pending",
        connection_name: parsed.data.connectionName ?? `${toolkit} via Composio`,
        connected_account: toolkit,
        settings: {
          toolkit,
          composioRequestId: link.requestId,
          callbackUrl,
        },
        connector_provider: "composio",
        external_connection_id: link.requestId,
        external_user_id: composioUserId,
        external_auth_config_id: parsed.data.authConfigId ?? null,
        external_metadata: {
          toolkit,
          requestStatus: link.status ?? null,
        },
        connected_at: new Date().toISOString(),
      })
      .select("id")
      .single()

    if (error || !connection) {
      throw new Error(error?.message ?? "Unable to save Composio connection request.")
    }

    return ok({
      toolkit,
      providerSlug: provider.slug,
      connectionId: connection.id,
      composioUserId,
      composioRequestId: link.requestId,
      redirectUrl: link.redirectUrl,
    })
  } catch (error) {
    console.error("Composio authorization failed", error)
    return Errors.badRequest(error instanceof Error ? error.message : "Unable to create Composio connect link.")
  }
}
