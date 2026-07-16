import { type NextRequest } from "next/server"

import { getUser } from "@/lib/api/auth"
import { Errors, ok } from "@/lib/api/response"
import { getWorkspaceId } from "@/lib/api/workspace"
import {
  createComposioTriggerInstance,
  setComposioWebhookSubscription,
} from "@/lib/integrations/composio"
import { buildPublicUrl } from "@/lib/public-url"

type TriggerConfig = {
  triggerSlug?: string | null
  triggerConfig?: Record<string, unknown>
  status?: string
}

function getRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function getTriggerConfig(value: unknown): TriggerConfig {
  const record = getRecord(value)
  return {
    triggerSlug:
      typeof record.triggerSlug === "string" ? record.triggerSlug : null,
    triggerConfig: getRecord(record.triggerConfig),
    status: typeof record.status === "string" ? record.status : undefined,
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getUser()
  if (!auth.ok) return auth.response

  const ws = getWorkspaceId(request)
  if (!ws.ok) return ws.response

  const { supabase, user } = auth
  const { id } = await params

  const { data: agent, error: agentError } = await supabase
    .from("agent")
    .select("id, workspace_id, status, runtime_config_json")
    .eq("id", id)
    .eq("workspace_id", ws.workspaceId)
    .maybeSingle()

  if (agentError || !agent) return Errors.notFound("Agent")

  const { data: triggers, error: triggersError } = await supabase
    .from("agent_trigger")
    .select("id, connection_id, provider, event_type, status, config_json, external_trigger_id")
    .eq("agent_id", agent.id)
    .eq("type", "app_event")

  if (triggersError) return Errors.internal()
  if (!triggers || triggers.length === 0) {
    return Errors.badRequest("This agent does not have app-event triggers to activate.")
  }

  const webhookUrl = buildPublicUrl("/api/composio/webhook", request)
  await setComposioWebhookSubscription(webhookUrl)

  const activated: Array<Record<string, unknown>> = []
  const failed: Array<Record<string, unknown>> = []

  for (const trigger of triggers) {
    if (trigger.external_trigger_id && trigger.status === "active") {
      activated.push({
        id: trigger.id,
        provider: trigger.provider,
        triggerId: trigger.external_trigger_id,
        alreadyActive: true,
      })
      continue
    }

    const config = getTriggerConfig(trigger.config_json)
    const triggerSlug =
      trigger.event_type ??
      config.triggerSlug ??
      null

    if (!triggerSlug) {
      const message = "This trigger is missing a Composio trigger slug."
      await supabase
        .from("agent_trigger")
        .update({ status: "error", error: message })
        .eq("id", trigger.id)
      failed.push({ id: trigger.id, provider: trigger.provider, error: message })
      continue
    }

    if (!trigger.connection_id) {
      const message = `Connect ${trigger.provider ?? "the app"} before activating this trigger.`
      await supabase
        .from("agent_trigger")
        .update({ status: "error", error: message })
        .eq("id", trigger.id)
      failed.push({ id: trigger.id, provider: trigger.provider, error: message })
      continue
    }

    const { data: connection, error: connectionError } = await supabase
      .from("workspace_integration")
      .select("id, external_connection_id")
      .eq("id", trigger.connection_id)
      .eq("workspace_id", ws.workspaceId)
      .eq("status", "active")
      .maybeSingle()

    if (connectionError || !connection?.external_connection_id) {
      const message = `Connect ${trigger.provider ?? "the app"} through Composio before activating this trigger.`
      await supabase
        .from("agent_trigger")
        .update({ status: "error", error: message })
        .eq("id", trigger.id)
      failed.push({ id: trigger.id, provider: trigger.provider, error: message })
      continue
    }

    try {
      const composioTrigger = await createComposioTriggerInstance({
        workspaceId: ws.workspaceId,
        userId: user.id,
        triggerSlug,
        connectedAccountId: connection.external_connection_id,
        triggerConfig: config.triggerConfig ?? {},
      })

      const { error: updateError } = await supabase
        .from("agent_trigger")
        .update({
          status: "active",
          event_type: triggerSlug,
          external_provider: "composio",
          external_trigger_id: composioTrigger.triggerId,
          external_metadata: {
            webhookUrl,
            triggerSlug,
          },
          error: null,
        })
        .eq("id", trigger.id)

      if (updateError) {
        throw updateError
      }

      activated.push({
        id: trigger.id,
        provider: trigger.provider,
        triggerSlug,
        triggerId: composioTrigger.triggerId,
      })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to activate trigger."
      await supabase
        .from("agent_trigger")
        .update({ status: "error", error: message })
        .eq("id", trigger.id)
      failed.push({ id: trigger.id, provider: trigger.provider, error: message })
    }
  }

  if (activated.length > 0) {
    const runtimeConfig = getRecord(agent.runtime_config_json)
    await supabase
      .from("agent")
      .update({
        status: "active",
        activated_at: new Date().toISOString(),
        runtime_config_json: {
          ...runtimeConfig,
          triggerStatus: failed.length > 0 ? "partial" : "active",
          triggerActivatedAt: new Date().toISOString(),
        },
      })
      .eq("id", agent.id)
  }

  return ok({
    activated,
    failed,
    webhookUrl,
  })
}
