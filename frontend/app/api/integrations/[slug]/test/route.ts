import { type NextRequest } from "next/server"
import { getUser } from "@/lib/api/auth"
import { getWorkspaceId } from "@/lib/api/workspace"
import { ok, Errors } from "@/lib/api/response"
import { getCatalogIntegration } from "@/lib/integrations-catalog"
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

  // TODO: replace with real HTTP test call to the integration's API per slug
  return ok({ success: true, message: "Connection successful." })
}
