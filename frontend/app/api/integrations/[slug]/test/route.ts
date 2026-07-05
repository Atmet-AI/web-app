import { type NextRequest } from "next/server"
import { getUser } from "@/lib/api/auth"
import { getWorkspaceId } from "@/lib/api/workspace"
import { ok, Errors } from "@/lib/api/response"
import { getCatalogIntegration } from "@/lib/integrations-catalog"
import { formatTelegramBotAccount, getTelegramBotInfo } from "@/lib/integrations/telegram"
import { testApiKeySchema } from "@/lib/validations/integration"

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
  if (catalog.authType !== "apikey") {
    return Errors.badRequest("This integration does not support API key authentication.")
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Errors.badRequest("Invalid JSON body.")
  }

  const parsed = testApiKeySchema.safeParse(body)
  if (!parsed.success) return Errors.validationError(parsed.error.issues[0].message)

  if (slug === "telegram") {
    try {
      const bot = await getTelegramBotInfo(parsed.data.apiKey)

      return ok({
        success: true,
        message: `Connected to ${formatTelegramBotAccount(bot)}.`,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Telegram connection failed."
      return Errors.badRequest(message)
    }
  }

  return ok({ success: true, message: "Connection successful." })
}
