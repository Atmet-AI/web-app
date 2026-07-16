import { type NextRequest } from "next/server"
import { getUser } from "@/lib/api/auth"
import { getWorkspaceId } from "@/lib/api/workspace"
import { ok, Errors } from "@/lib/api/response"
import {
  agentStatusToAutomationStatus,
  createAgentSchema,
} from "@/lib/validations/agent"

export async function GET(request: NextRequest) {
  const auth = await getUser()
  if (!auth.ok) return auth.response

  const ws = getWorkspaceId(request)
  if (!ws.ok) return ws.response

  const { supabase } = auth
  const status = request.nextUrl.searchParams.get("status")

  let query = supabase
    .from("agent")
    .select(
      "id, legacy_automation_id, template_id, name, description, goal, status, instructions, blueprint_json, runtime_config_json, created_by, created_at, updated_at"
    )
    .eq("workspace_id", ws.workspaceId)
    .order("created_at", { ascending: false })

  if (status) query = query.eq("status", status)

  const { data, error } = await query

  if (error) {
    console.error("Unable to list agents", error)
    return Errors.internal()
  }

  return ok({ agents: data })
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

  const parsed = createAgentSchema.safeParse(body)
  if (!parsed.success) return Errors.validationError(parsed.error.issues[0].message)

  const automationScriptKey = JSON.stringify({
    kind: "workspace-agent",
    source: "agent",
    blueprint: parsed.data.blueprint_json,
  })

  const { data: automation, error: automationError } = await supabase
    .from("automation")
    .insert({
      workspace_id: ws.workspaceId,
      created_by: user.id,
      name: parsed.data.name,
      description: parsed.data.description,
      status: agentStatusToAutomationStatus(parsed.data.status),
      script_key: automationScriptKey,
    })
    .select("id")
    .single()

  if (automationError || !automation) {
    console.error("Unable to create compatibility automation for agent", automationError)
    return Errors.internal()
  }

  const { data, error } = await supabase
    .from("agent")
    .insert({
      workspace_id: ws.workspaceId,
      created_by: user.id,
      legacy_automation_id: automation.id,
      ...parsed.data,
    })
    .select()
    .single()

  if (error || !data) {
    console.error("Unable to create agent", error)
    return Errors.internal()
  }

  return ok({ agent: data }, 201)
}
