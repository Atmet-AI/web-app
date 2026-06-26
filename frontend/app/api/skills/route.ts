import { type NextRequest } from "next/server"
import { getUser } from "@/lib/api/auth"
import { getWorkspaceId } from "@/lib/api/workspace"
import { ok, Errors } from "@/lib/api/response"
import { createSkillSchema } from "@/lib/validations/skill"

export async function GET(request: NextRequest) {
  const auth = await getUser()
  if (!auth.ok) return auth.response

  const ws = getWorkspaceId(request)
  if (!ws.ok) return ws.response

  const { supabase } = auth
  const { searchParams } = request.nextUrl

  let query = supabase
    .from("skill")
    .select("id, name, description, type, status, created_by, created_at, updated_at")
    .eq("workspace_id", ws.workspaceId)
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
      ...parsed.data,
    })
    .select()
    .single()

  if (error) return Errors.internal()

  return ok({ skill: data }, 201)
}
