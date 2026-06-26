import { type NextRequest } from "next/server"
import { createHash, randomBytes } from "crypto"
import { getUser } from "@/lib/api/auth"
import { getWorkspaceId } from "@/lib/api/workspace"
import { ok, Errors } from "@/lib/api/response"
import { apiKeySchema } from "@/lib/validations/invitation"

export async function GET(request: NextRequest) {
  const auth = await getUser()
  if (!auth.ok) return auth.response

  const ws = getWorkspaceId(request)
  if (!ws.ok) return ws.response

  const { supabase } = auth

  const { data, error } = await supabase
    .from("api_key")
    .select("id, name, last_used_at, expires_at, created_at")
    .eq("workspace_id", ws.workspaceId)
    .order("created_at", { ascending: false })

  if (error) return Errors.internal()

  return ok({ keys: data })
}

export async function POST(request: NextRequest) {
  const auth = await getUser()
  if (!auth.ok) return auth.response

  const ws = getWorkspaceId(request)
  if (!ws.ok) return ws.response

  const { supabase, user } = auth

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Errors.badRequest("Invalid JSON body.")
  }

  const parsed = apiKeySchema.safeParse(body)
  if (!parsed.success) return Errors.validationError(parsed.error.issues[0].message)

  // Generate a raw key: "atmet_" + 40 random hex chars
  const rawKey = `atmet_${randomBytes(20).toString("hex")}`
  const keyHash = createHash("sha256").update(rawKey).digest("hex")

  const { data, error } = await supabase
    .from("api_key")
    .insert({
      workspace_id: ws.workspaceId,
      created_by: user.id,
      name: parsed.data.name,
      key_hash: keyHash,
      expires_at: parsed.data.expires_at ?? null,
    })
    .select("id, name, created_at, expires_at")
    .single()

  if (error) return Errors.internal()

  // Raw key returned ONCE — never stored or retrievable again
  return ok(
    { key: rawKey, meta: data, message: "Save this key — it will not be shown again." },
    201
  )
}
