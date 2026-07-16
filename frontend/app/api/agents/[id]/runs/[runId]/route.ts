import { type NextRequest } from "next/server"

import { getUser } from "@/lib/api/auth"
import { Errors, ok } from "@/lib/api/response"
import { getWorkspaceId } from "@/lib/api/workspace"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; runId: string }> }
) {
  const auth = await getUser()
  if (!auth.ok) return auth.response

  const ws = getWorkspaceId(request)
  if (!ws.ok) return ws.response

  const { id, runId } = await params
  const { supabase } = auth

  const { data: agent, error: agentError } = await supabase
    .from("agent")
    .select("id")
    .eq("id", id)
    .eq("workspace_id", ws.workspaceId)
    .maybeSingle()

  if (agentError || !agent) return Errors.notFound("Agent")

  const { data: run, error: runError } = await supabase
    .from("agent_run")
    .select("*")
    .eq("id", runId)
    .eq("agent_id", agent.id)
    .maybeSingle()

  if (runError || !run) return Errors.notFound("Run")

  const [{ data: steps }, { data: approvals }] = await Promise.all([
    supabase
      .from("agent_run_step")
      .select("*")
      .eq("run_id", run.id)
      .order("step_index", { ascending: true }),
    supabase
      .from("agent_approval")
      .select("*")
      .eq("run_id", run.id)
      .order("requested_at", { ascending: true }),
  ])

  return ok({
    run,
    timeline: {
      steps: steps ?? [],
      approvals: approvals ?? [],
    },
  })
}
