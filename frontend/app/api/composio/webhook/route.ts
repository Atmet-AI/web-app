import { type NextRequest } from "next/server"

import { ok, Errors } from "@/lib/api/response"
import {
  getComposioEventId,
  getComposioTriggerId,
  verifyComposioWebhookSignature,
} from "@/lib/integrations/composio"
import { supabaseAdmin } from "@/lib/supabase/admin"

function headersToObject(headers: Headers) {
  const result: Record<string, string> = {}
  headers.forEach((value, key) => {
    result[key] = value
  })
  return result
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text()

  if (!verifyComposioWebhookSignature(rawBody, request.headers)) {
    return Errors.forbidden("Invalid Composio webhook signature.")
  }

  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>
  } catch {
    return Errors.badRequest("Invalid Composio webhook payload.")
  }

  const triggerId = getComposioTriggerId(payload)
  const eventId = getComposioEventId(payload)

  if (!triggerId) {
    return ok({ accepted: false, reason: "missing_trigger_id" })
  }

  const { data: trigger, error: triggerError } = await supabaseAdmin
    .from("workflow_trigger")
    .select("id")
    .eq("external_provider", "composio")
    .eq("external_trigger_id", triggerId)
    .maybeSingle()

  if (triggerError) {
    console.error("Unable to find Composio workflow trigger", triggerError)
    return Errors.internal()
  }

  if (trigger) {
    const eventRecord = {
      trigger_id: trigger.id,
      provider_event_id: eventId,
      headers: headersToObject(request.headers),
      payload,
      status: "received",
      external_provider: "composio",
      external_event_id: eventId,
      external_metadata: {
        triggerId,
      },
    }

    const { error } = eventId
      ? await supabaseAdmin.from("workflow_event").upsert(eventRecord, {
          onConflict: "trigger_id,provider_event_id",
        })
      : await supabaseAdmin.from("workflow_event").insert(eventRecord)

    if (error) {
      console.error("Unable to store Composio workflow event", error)
      return Errors.internal()
    }

    return ok({ accepted: true, target: "workflow", triggerId, eventId })
  }

  const { data: agentTrigger, error: agentTriggerError } = await supabaseAdmin
    .from("agent_trigger")
    .select("id")
    .eq("external_provider", "composio")
    .eq("external_trigger_id", triggerId)
    .maybeSingle()

  if (agentTriggerError) {
    console.error("Unable to find Composio agent trigger", agentTriggerError)
    return Errors.internal()
  }

  if (!agentTrigger) {
    return ok({ accepted: false, reason: "trigger_not_registered", triggerId })
  }

  const agentEventRecord = {
    trigger_id: agentTrigger.id,
    provider_event_id: eventId,
    headers: headersToObject(request.headers),
    payload,
    status: "received",
    external_provider: "composio",
    external_event_id: eventId,
    external_metadata: {
      triggerId,
    },
  }

  const { error: agentEventError } = eventId
    ? await supabaseAdmin.from("agent_event").upsert(agentEventRecord, {
        onConflict: "trigger_id,provider_event_id",
      })
    : await supabaseAdmin.from("agent_event").insert(agentEventRecord)

  if (agentEventError) {
    console.error("Unable to store Composio agent event", agentEventError)
    return Errors.internal()
  }

  await supabaseAdmin
    .from("agent_trigger")
    .update({ last_received_at: new Date().toISOString(), error: null })
    .eq("id", agentTrigger.id)

  return ok({ accepted: true, target: "agent", triggerId, eventId })
}
