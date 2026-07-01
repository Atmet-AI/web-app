import { type NextRequest } from "next/server"
import { getUser } from "@/lib/api/auth"
import { assertWorkspaceMember, getWorkspaceId } from "@/lib/api/workspace"
import { ok, Errors } from "@/lib/api/response"
import { createSkillSchema } from "@/lib/validations/skill"
import { supabaseAdmin } from "@/lib/supabase/admin"

export async function GET(request: NextRequest) {
  const auth = await getUser()
  if (!auth.ok) return auth.response

  const ws = getWorkspaceId(request)
  if (!ws.ok) return ws.response

  const { user } = auth
  const { searchParams } = request.nextUrl

  const isMember = await assertWorkspaceMember(supabaseAdmin, ws.workspaceId, user.id)
  if (!isMember) return Errors.forbidden()

  let query = supabaseAdmin
    .from("skill")
    .select("id, workspace_id, name, description, definition, type, scope, image_url, status, created_by, created_at, updated_at")
    .or(`workspace_id.eq.${ws.workspaceId},scope.eq.system`)
    .order("created_at", { ascending: false })

  const type = searchParams.get("type")
  const status = searchParams.get("status")
  const search = searchParams.get("search")

  if (type) query = query.eq("type", type)
  if (status) query = query.eq("status", status)
  if (search) query = query.ilike("name", `%${search}%`)

  const { data, error } = await query

  if (error) return Errors.internal()

  return ok({ skills: data })
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

  const parsed = createSkillSchema.safeParse(body)
  if (!parsed.success) return Errors.validationError(parsed.error.issues[0].message)

  const { data, error } = await supabase
    .from("skill")
    .insert({
      workspace_id: ws.workspaceId,
      created_by: user.id,
      scope: "workspace",
      ...parsed.data,
    })
    .select()
    .single()

  if (error) return Errors.internal()

  return ok({ skill: data }, 201)
}
