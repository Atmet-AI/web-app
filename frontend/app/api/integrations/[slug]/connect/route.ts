import { type NextRequest } from "next/server"
import { getUser } from "@/lib/api/auth"
import { getWorkspaceId } from "@/lib/api/workspace"
import { ok, Errors } from "@/lib/api/response"
import { getCatalogIntegration } from "@/lib/integrations-catalog"
import {
  createWorkspaceIntegration,
  upsertIntegrationSecret,
  upsertWorkspaceIntegration,
} from "@/lib/integrations/connections"
import { ensureIntegrationProvider } from "@/lib/integrations/providers"
import { formatTelegramBotAccount, getTelegramBotInfo } from "@/lib/integrations/telegram"
import { connectApiKeySchema } from "@/lib/validations/integration"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const auth = await getUser()
  if (!auth.ok) return auth.response

  const ws = getWorkspaceId(request)
  if (!ws.ok) return ws.response

  const { user } = auth
  const { slug } = await params

  const catalog = getCatalogIntegration(slug)
  if (!catalog) return Errors.notFound("Integration")
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

  const { apiKey, keyName, avatarUrl } = parsed.data

  try {
    const provider = await ensureIntegrationProvider(catalog)
    let connectedAccount = keyName ?? null
    let settings: Record<string, unknown> = { key_name: keyName ?? null }

    if (slug === "telegram") {
      const bot = await getTelegramBotInfo(apiKey)
      connectedAccount = formatTelegramBotAccount(bot)
      const connectionName = keyName?.trim() || connectedAccount
      settings = {
        ...settings,
        connection_name: connectionName,
        avatar_url: avatarUrl ?? null,
        bot_id: bot.id,
        bot_username: bot.username ?? null,
        bot_first_name: bot.first_name,
      }

      const connection = await createWorkspaceIntegration({
        workspaceId: ws.workspaceId,
        providerId: provider.id,
        userId: user.id,
        connectionName,
        connectedAccount,
        settings,
      })

      await upsertIntegrationSecret({
        workspaceIntegrationId: connection.id,
        secretType: "api_key",
        payload: { api_key: apiKey, key_name: keyName ?? null },
      })

      return ok({ success: true, connection })
    }

    const connection = await upsertWorkspaceIntegration({
      workspaceId: ws.workspaceId,
      providerId: provider.id,
      userId: user.id,
      connectionName: keyName ?? null,
      connectedAccount,
      settings,
    })

    await upsertIntegrationSecret({
      workspaceIntegrationId: connection.id,
      secretType: "api_key",
      payload: { api_key: apiKey, key_name: keyName ?? null },
    })
  } catch {
    return Errors.internal()
  }

  return ok({ success: true })
}
