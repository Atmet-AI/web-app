import { type NextRequest } from "next/server"
import { z } from "zod"

import { getUser } from "@/lib/api/auth"
import { getWorkspaceId } from "@/lib/api/workspace"
import { ok, Errors } from "@/lib/api/response"
import { AgentRuntimeError, runAgent } from "@/lib/agents/runtime"

const runAgentSchema = z.object({
  input: z.record(z.string(), z.unknown()).optional().default({}),
})

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

  const { data: agent } = await supabase
    .from("agent")
    .select("id")
    .eq("id", id)
    .eq("workspace_id", ws.workspaceId)
    .maybeSingle()

  if (!agent) return Errors.notFound("Agent")

  const { data, error } = await supabase
    .from("agent_run")
    .select("id, status, input_json, output_json, error, queued_at, started_at, finished_at, created_at")
    .eq("agent_id", id)
    .order("created_at", { ascending: false })
    .limit(20)

  if (error) return Errors.internal()

  return ok({ runs: data ?? [] })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getUser()
  if (!auth.ok) return auth.response

  const ws = getWorkspaceId(request)
  if (!ws.ok) return ws.response

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Errors.badRequest("Invalid JSON body.")
  }

  const parsed = runAgentSchema.safeParse(body)
  if (!parsed.success) return Errors.validationError(parsed.error.issues[0].message)

  const { id } = await params

  try {
    const result = await runAgent({
      supabase: auth.supabase,
      agentId: id,
      workspaceId: ws.workspaceId,
      userId: auth.user.id,
      runInput: parsed.data.input,
    })

    return ok(result, 201)
  } catch (error) {
    if (error instanceof AgentRuntimeError) {
      if (error.code === "bad_request") return Errors.badRequest(error.message)
      if (error.code === "not_found") return Errors.notFound("Agent")
    }

    console.error("Unable to run agent", error)
    return Errors.internal()
  }
}
