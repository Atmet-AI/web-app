import { type NextRequest } from "next/server"
import { getUser } from "@/lib/api/auth"
import { getWorkspaceId } from "@/lib/api/workspace"
import { ok, Errors } from "@/lib/api/response"
import { getCatalogIntegration } from "@/lib/integrations-catalog"
import { connectApiKeySchema } from "@/lib/validations/integration"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const auth = await getUser()
  if (!auth.ok) return auth.response

  const ws = getWorkspaceId(request)
  if (!ws.ok) return ws.response

  const { supabase, user } = auth
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

  const { apiKey, keyName } = parsed.data

  const { error } = await supabase.from("integration").upsert(
    {
      workspace_id: ws.workspaceId,
      created_by: user.id,
      slug,
      auth_type: "apikey",
      credentials: { api_key: apiKey, key_name: keyName ?? null },
      // TODO: encrypt credentials using Supabase Vault before storing
      status: "active",
      connected_at: new Date().toISOString(),
    },
    { onConflict: "workspace_id,slug" }
  )

  if (error) return Errors.internal()

  return ok({ success: true })
}
