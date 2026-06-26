import { type NextRequest } from "next/server"
import { getUser } from "@/lib/api/auth"
import { getWorkspaceId } from "@/lib/api/workspace"
import { ok, Errors } from "@/lib/api/response"
import { createScheduleSchema } from "@/lib/validations/schedule"

export async function GET(request: NextRequest) {
  const auth = await getUser()
  if (!auth.ok) return auth.response

  const ws = getWorkspaceId(request)
  if (!ws.ok) return ws.response

  const { supabase } = auth
  const { searchParams } = request.nextUrl

  let query = supabase
    .from("schedule")
    .select("id, name, cron_expression, timezone, automation_id, status, last_run_at, created_by, created_at, updated_at")
    .eq("workspace_id", ws.workspaceId)
    .order("created_at", { ascending: false })

  const automationId = searchParams.get("automation_id")
  const status = searchParams.get("status")

  if (automationId) query = query.eq("automation_id", automationId)
  if (status) query = query.eq("status", status)

  const { data, error } = await query

  if (error) return Errors.internal()

  return ok({ schedules: data })
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

  const parsed = createScheduleSchema.safeParse(body)
  if (!parsed.success) return Errors.validationError(parsed.error.issues[0].message)

  const { data, error } = await supabase
    .from("schedule")
    .insert({
      workspace_id: ws.workspaceId,
      created_by: user.id,
      ...parsed.data,
    })
    .select()
    .single()

  if (error) return Errors.internal()

  return ok({ schedule: data }, 201)
}
