import { type NextRequest } from "next/server"
import { z } from "zod"

import { AgentRuntimeError, runAgent } from "@/lib/agents/runtime"
import { getUser } from "@/lib/api/auth"
import { Errors, ok } from "@/lib/api/response"
import { getWorkspaceId } from "@/lib/api/workspace"

const resolveApprovalSchema = z.object({
  status: z.enum(["approved", "rejected"]),
})

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; approvalId: string }> }
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

  const parsed = resolveApprovalSchema.safeParse(body)
  if (!parsed.success) return Errors.validationError(parsed.error.issues[0].message)

  const { id, approvalId } = await params
  const { supabase, user } = auth

  const { data: agent, error: agentError } = await supabase
    .from("agent")
    .select("id, workspace_id")
    .eq("id", id)
    .eq("workspace_id", ws.workspaceId)
    .maybeSingle()

  if (agentError || !agent) return Errors.notFound("Agent")

  const { data: approval, error: approvalError } = await supabase
    .from("agent_approval")
    .select("id, agent_id, run_id, status, action_json")
    .eq("id", approvalId)
    .eq("agent_id", agent.id)
    .maybeSingle()

  if (approvalError || !approval) return Errors.notFound("Approval")
  if (approval.status !== "pending") {
    return Errors.badRequest("This approval has already been resolved.")
  }

  const action = asRecord(approval.action_json)
  const stepIndex =
    typeof action.stepIndex === "number" && Number.isInteger(action.stepIndex)
      ? action.stepIndex
      : null

  const now = new Date().toISOString()

  const { data: resolvedApproval, error: resolveError } = await supabase
    .from("agent_approval")
    .update({
      status: parsed.data.status,
      resolved_at: now,
      resolved_by_user_id: user.id,
    })
    .eq("id", approval.id)
    .eq("status", "pending")
    .select()
    .single()

  if (resolveError || !resolvedApproval) {
    return Errors.forbidden("Only workspace admins can resolve approvals.")
  }

  if (parsed.data.status === "rejected") {
    if (approval.run_id) {
      await supabase
        .from("agent_run")
        .update({
          status: "cancelled",
          error: "Approval rejected.",
          finished_at: now,
        })
        .eq("id", approval.run_id)

      await supabase
        .from("agent_run_step")
        .update({
          status: "skipped",
          error: "Approval rejected.",
          finished_at: now,
        })
        .eq("run_id", approval.run_id)
        .eq("status", "waiting_for_approval")
    }

    return ok({ approval: resolvedApproval, resumed: false })
  }

  if (!approval.run_id || stepIndex === null) {
    return ok({
      approval: resolvedApproval,
      resumed: false,
      warning: "Approval was resolved, but the run could not be resumed.",
    })
  }

  try {
    const result = await runAgent({
      supabase,
      agentId: agent.id,
      workspaceId: ws.workspaceId,
      userId: user.id,
      runInput: asRecord(action.runInput),
      resumeRunId: approval.run_id,
      startStepIndex: stepIndex,
      approvedApprovalId: approval.id,
    })

    return ok({ approval: resolvedApproval, resumed: true, result })
  } catch (error) {
    if (error instanceof AgentRuntimeError) {
      return Errors.badRequest(error.message)
    }

    console.error("Unable to resume approved agent run", error)
    return Errors.internal()
  }
}
