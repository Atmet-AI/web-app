import { type NextRequest } from "next/server"
import { getUser } from "@/lib/api/auth"
import { getWorkspaceId } from "@/lib/api/workspace"
import { ok, Errors } from "@/lib/api/response"
import {
  agentStatusToAutomationStatus,
  updateAgentSchema,
} from "@/lib/validations/agent"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getUser()
  if (!auth.ok) return auth.response

  const ws = getWorkspaceId(request)
  if (!ws.ok) return ws.response

  const { supabase } = auth
  const { id } = await params

  const { data, error } = await supabase
    .from("agent")
    .select(
      "*, tools:agent_tool(*), triggers:agent_trigger(*), memory:agent_memory(*), approvals:agent_approval(*), runs:agent_run(id, status, input_json, output_json, queued_at, started_at, finished_at, error, created_at)"
    )
    .eq("id", id)
    .eq("workspace_id", ws.workspaceId)
    .maybeSingle()

  if (error || !data) return Errors.notFound("Agent")

  return ok({ agent: data })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getUser()
  if (!auth.ok) return auth.response

  const ws = getWorkspaceId(request)
  if (!ws.ok) return ws.response

  const { supabase } = auth
  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Errors.badRequest("Invalid JSON body.")
  }

  const parsed = updateAgentSchema.safeParse(body)
  if (!parsed.success) return Errors.validationError(parsed.error.issues[0].message)

  const { data, error } = await supabase
    .from("agent")
    .update(parsed.data)
    .eq("id", id)
    .eq("workspace_id", ws.workspaceId)
    .select()
    .single()

  if (error || !data) return Errors.notFound("Agent")

  if (data.legacy_automation_id) {
    const automationPatch: Record<string, unknown> = {}

    if (parsed.data.name !== undefined) automationPatch.name = parsed.data.name
    if (parsed.data.description !== undefined) automationPatch.description = parsed.data.description
    if (parsed.data.status !== undefined) {
      automationPatch.status = agentStatusToAutomationStatus(parsed.data.status)
    }
    if (parsed.data.blueprint_json !== undefined) {
      automationPatch.script_key = JSON.stringify({
        kind: "workspace-agent",
        source: "agent",
        agentId: data.id,
        blueprint: parsed.data.blueprint_json,
      })
    }

    if (Object.keys(automationPatch).length > 0) {
      const { error: automationError } = await supabase
        .from("automation")
        .update(automationPatch)
        .eq("id", data.legacy_automation_id)
        .eq("workspace_id", ws.workspaceId)

      if (automationError) {
        console.error("Unable to sync compatibility automation for agent", automationError)
      }
    }
  }

  return ok({ agent: data })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getUser()
  if (!auth.ok) return auth.response

  const ws = getWorkspaceId(request)
  if (!ws.ok) return ws.response

  const { supabase } = auth
  const { id } = await params

  const { data: agent, error: findError } = await supabase
    .from("agent")
    .select("id, legacy_automation_id")
    .eq("id", id)
    .eq("workspace_id", ws.workspaceId)
    .maybeSingle()

  if (findError || !agent) return Errors.notFound("Agent")

  const { error } = await supabase
    .from("agent")
    .delete()
    .eq("id", id)
    .eq("workspace_id", ws.workspaceId)

  if (error) return Errors.internal()

  if (agent.legacy_automation_id) {
    const { error: automationError } = await supabase
      .from("automation")
      .delete()
      .eq("id", agent.legacy_automation_id)
      .eq("workspace_id", ws.workspaceId)

    if (automationError) {
      console.error("Unable to delete compatibility automation for agent", automationError)
    }
  }

  return ok({ success: true })
}
