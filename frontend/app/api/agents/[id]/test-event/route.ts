import { type NextRequest } from "next/server"

import { AgentRuntimeError, runAgent } from "@/lib/agents/runtime"
import { getUser } from "@/lib/api/auth"
import { Errors, ok } from "@/lib/api/response"
import { getWorkspaceId } from "@/lib/api/workspace"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getUser()
  if (!auth.ok) return auth.response

  const ws = getWorkspaceId(request)
  if (!ws.ok) return ws.response

  const { id } = await params
  const { supabase, user } = auth

  const { data: agent, error: agentError } = await supabase
    .from("agent")
    .select("id, workspace_id")
    .eq("id", id)
    .eq("workspace_id", ws.workspaceId)
    .maybeSingle()

  if (agentError || !agent) return Errors.notFound("Agent")

  const { data: trigger, error: triggerError } = await supabase
    .from("agent_trigger")
    .select("id, provider, event_type, config_json")
    .eq("agent_id", agent.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle()

  if (triggerError) return Errors.internal()
  if (!trigger) {
    return Errors.badRequest("This agent does not have a trigger to test.")
  }

  try {
    const result = await runAgent({
      supabase,
      agentId: agent.id,
      workspaceId: ws.workspaceId,
      userId: user.id,
      triggerId: trigger.id,
      runInput: {
        source: "test_event",
        provider: trigger.provider,
        eventType: trigger.event_type,
        triggerConfig: trigger.config_json,
        payload: {
          test: true,
          createdAt: new Date().toISOString(),
        },
      },
    })

    return ok({ trigger, result }, 201)
  } catch (error) {
    if (error instanceof AgentRuntimeError) {
      if (error.code === "bad_request") return Errors.badRequest(error.message)
      if (error.code === "not_found") return Errors.notFound("Agent")
    }

    console.error("Unable to run agent test event", error)
    return Errors.internal()
  }
}
