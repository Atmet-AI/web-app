import { type NextRequest } from "next/server"

import { AgentRuntimeError, runAgent } from "@/lib/agents/runtime"
import { Errors, ok } from "@/lib/api/response"
import { supabaseAdmin } from "@/lib/supabase/admin"

const DEFAULT_LIMIT = 10

function isAuthorized(request: NextRequest) {
  const secret = process.env.AGENT_RUNTIME_SECRET ?? process.env.CRON_SECRET
  if (!secret) return process.env.NODE_ENV !== "production"

  const auth = request.headers.get("authorization")
  const bearer = auth?.replace(/^Bearer\s+/i, "").trim()
  return bearer === secret
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

async function tick(request: NextRequest) {
  if (!isAuthorized(request)) {
    return Errors.forbidden("Invalid agent runtime secret.")
  }

  const limitParam = Number(request.nextUrl.searchParams.get("limit"))
  const limit =
    Number.isFinite(limitParam) && limitParam > 0
      ? Math.min(Math.floor(limitParam), 25)
      : DEFAULT_LIMIT

  const { data: events, error: eventsError } = await supabaseAdmin
    .from("agent_event")
    .select(
      "id, provider_event_id, payload, trigger:trigger_id(id, agent_id, provider, event_type, agent:agent_id(id, workspace_id, created_by))"
    )
    .eq("status", "received")
    .order("received_at", { ascending: true })
    .limit(limit)

  if (eventsError) {
    console.error("Unable to load agent events", eventsError)
    return Errors.internal()
  }

  const processed: Array<Record<string, unknown>> = []
  const failed: Array<Record<string, unknown>> = []
  const ignored: Array<Record<string, unknown>> = []

  for (const event of events ?? []) {
    const trigger = Array.isArray(event.trigger)
      ? event.trigger[0]
      : event.trigger
    const agent = Array.isArray(trigger?.agent)
      ? trigger?.agent[0]
      : trigger?.agent

    if (!trigger?.id || !agent?.id || !agent.workspace_id || !agent.created_by) {
      const message = "Agent event is missing trigger or agent metadata."
      await supabaseAdmin
        .from("agent_event")
        .update({
          status: "ignored",
          error: message,
          processed_at: new Date().toISOString(),
        })
        .eq("id", event.id)
      ignored.push({ id: event.id, error: message })
      continue
    }

    await supabaseAdmin
      .from("agent_event")
      .update({ status: "queued", error: null })
      .eq("id", event.id)

    try {
      const result = await runAgent({
        supabase: supabaseAdmin,
        agentId: agent.id,
        workspaceId: agent.workspace_id,
        userId: agent.created_by,
        triggerId: trigger.id,
        idempotencyKey: `agent-event:${event.id}`,
        runInput: {
          source: "composio_webhook",
          eventId: event.id,
          providerEventId: event.provider_event_id,
          trigger: {
            id: trigger.id,
            provider: trigger.provider,
            eventType: trigger.event_type,
          },
          payload: asRecord(event.payload),
        },
      })

      await supabaseAdmin
        .from("agent_event")
        .update({
          status: "processed",
          error: null,
          processed_at: new Date().toISOString(),
        })
        .eq("id", event.id)

      await supabaseAdmin
        .from("agent_trigger")
        .update({ last_run_at: new Date().toISOString(), error: null })
        .eq("id", trigger.id)

      processed.push({
        id: event.id,
        runId: result.run.id,
        status: result.summary.status,
      })
    } catch (error) {
      const message =
        error instanceof AgentRuntimeError || error instanceof Error
          ? error.message
          : "Unable to process agent event."

      await supabaseAdmin
        .from("agent_event")
        .update({
          status: "failed",
          error: message,
          processed_at: new Date().toISOString(),
        })
        .eq("id", event.id)

      await supabaseAdmin
        .from("agent_trigger")
        .update({ status: "error", error: message })
        .eq("id", trigger.id)

      failed.push({ id: event.id, error: message })
    }
  }

  return ok({
    processed,
    failed,
    ignored,
    remaining: Math.max(0, (events?.length ?? 0) - processed.length - failed.length - ignored.length),
  })
}

export async function GET(request: NextRequest) {
  return tick(request)
}

export async function POST(request: NextRequest) {
  return tick(request)
}
