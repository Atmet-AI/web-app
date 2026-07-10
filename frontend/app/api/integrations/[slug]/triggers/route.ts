import { type NextRequest } from "next/server"
import { z } from "zod"

import { getUser } from "@/lib/api/auth"
import { ok, Errors } from "@/lib/api/response"
import { assertWorkspaceMember, getWorkspaceId } from "@/lib/api/workspace"
import {
  createComposioTriggerInstance,
  setComposioWebhookSubscription,
} from "@/lib/integrations/composio"
import { ensureIntegrationProvider } from "@/lib/integrations/providers"
import { getCatalogIntegration } from "@/lib/integrations-catalog"
import { buildPublicUrl } from "@/lib/public-url"
import { supabaseAdmin } from "@/lib/supabase/admin"

const triggerSchema = z.object({
  workflowId: z.string().uuid().optional(),
  automationId: z.string().uuid().optional(),
  connectionId: z.string().uuid().optional(),
  triggerSlug: z.string().min(1).max(160),
  triggerConfig: z.record(z.string(), z.unknown()).optional().default({}),
  eventType: z.string().min(1).max(160).optional(),
}).refine((value) => value.workflowId || value.automationId, {
  message: "workflowId or automationId is required.",
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const auth = await getUser()
  if (!auth.ok) return auth.response

  const ws = getWorkspaceId(request)
  if (!ws.ok) return ws.response

  const isMember = await assertWorkspaceMember(auth.supabase, ws.workspaceId, auth.user.id)
  if (!isMember) return Errors.forbidden()

  const { slug } = await params
  const catalog = getCatalogIntegration(slug)
  if (!catalog) return Errors.notFound("Integration")
  if (catalog.connectorProvider !== "composio" || !catalog.composioToolkit) {
    return Errors.badRequest("This integration does not support Composio triggers.")
  }

  const body = await request.json().catch(() => null)
  const parsed = triggerSchema.safeParse(body)
  if (!parsed.success) {
    return Errors.validationError(parsed.error.issues[0]?.message ?? "Invalid trigger request.")
  }

  const knownTrigger = catalog.triggers.find((trigger) => trigger.id === parsed.data.triggerSlug)
  if (!knownTrigger) {
    return Errors.badRequest(`Unsupported ${catalog.name} trigger: ${parsed.data.triggerSlug}`)
  }

  let workflowId = parsed.data.workflowId ?? null

  if (workflowId) {
    const { data: workflow, error: workflowError } = await supabaseAdmin
      .from("workflow")
      .select("id")
      .eq("id", workflowId)
      .eq("workspace_id", ws.workspaceId)
      .maybeSingle()

    if (workflowError) {
      console.error("Unable to verify workflow before trigger registration", workflowError)
      return Errors.internal()
    }

    if (!workflow) return Errors.notFound("Workflow")
  }

  if (!workflowId && parsed.data.automationId) {
    const { data: automation, error: automationError } = await supabaseAdmin
      .from("automation")
      .select("id, workspace_id, created_by, name, description, script_key")
      .eq("id", parsed.data.automationId)
      .eq("workspace_id", ws.workspaceId)
      .maybeSingle()

    if (automationError) {
      console.error("Unable to verify automation before trigger registration", automationError)
      return Errors.internal()
    }

    if (!automation) return Errors.notFound("Automation")

    const { data: existingWorkflow, error: existingWorkflowError } = await supabaseAdmin
      .from("workflow")
      .select("id")
      .eq("legacy_automation_id", automation.id)
      .maybeSingle()

    if (existingWorkflowError) {
      console.error("Unable to find workflow linked to automation", existingWorkflowError)
      return Errors.internal()
    }

    if (existingWorkflow?.id) {
      workflowId = existingWorkflow.id
    } else {
      const { data: createdWorkflow, error: createWorkflowError } = await supabaseAdmin
        .from("workflow")
        .insert({
          workspace_id: ws.workspaceId,
          created_by: automation.created_by,
          legacy_automation_id: automation.id,
          name: automation.name,
          description: automation.description,
          definition: automation.script_key
            ? { version: 1, legacyAutomationId: automation.id, blueprint: automation.script_key }
            : { version: 1, legacyAutomationId: automation.id },
          status: "draft",
        })
        .select("id")
        .single()

      if (createWorkflowError || !createdWorkflow) {
        console.error("Unable to create workflow for automation trigger", createWorkflowError)
        return Errors.internal()
      }

      workflowId = createdWorkflow.id
    }
  }

  if (!workflowId) return Errors.badRequest("workflowId or automationId is required.")

  const provider = await ensureIntegrationProvider(catalog)
  let connectionQuery = supabaseAdmin
    .from("workspace_integration")
    .select("id, external_connection_id")
    .eq("workspace_id", ws.workspaceId)
    .eq("provider_id", provider.id)
    .eq("created_by", auth.user.id)
    .eq("connector_provider", "composio")
    .eq("status", "active")
    .order("connected_at", { ascending: false })
    .limit(1)

  if (parsed.data.connectionId) {
    connectionQuery = connectionQuery.eq("id", parsed.data.connectionId)
  }

  const { data: connections, error: connectionError } = await connectionQuery
  if (connectionError) {
    console.error("Unable to find Composio connection for trigger registration", connectionError)
    return Errors.internal()
  }

  const connection = connections?.[0]
  if (!connection?.external_connection_id) {
    return Errors.badRequest(`Connect ${catalog.name} through Composio before adding this trigger.`)
  }

  const webhookUrl = buildPublicUrl("/api/composio/webhook", request)

  try {
    const { data: existingTrigger, error: existingTriggerError } = await supabaseAdmin
      .from("workflow_trigger")
      .select("id, external_trigger_id")
      .eq("workflow_id", workflowId)
      .eq("connection_id", connection.id)
      .eq("provider", slug)
      .eq("event_type", parsed.data.eventType ?? parsed.data.triggerSlug)
      .eq("external_provider", "composio")
      .eq("status", "active")
      .maybeSingle()

    if (existingTriggerError) {
      console.error("Unable to check existing workflow trigger", existingTriggerError)
      return Errors.internal()
    }

    if (existingTrigger?.external_trigger_id) {
      return ok({
        workflowTriggerId: existingTrigger.id,
        composioTriggerId: existingTrigger.external_trigger_id,
        triggerSlug: parsed.data.triggerSlug,
        webhookUrl,
        alreadyRegistered: true,
      })
    }

    await setComposioWebhookSubscription(webhookUrl)

    const composioTrigger = await createComposioTriggerInstance({
      workspaceId: ws.workspaceId,
      userId: auth.user.id,
      triggerSlug: parsed.data.triggerSlug,
      connectedAccountId: connection.external_connection_id,
      triggerConfig: parsed.data.triggerConfig,
    })

    const { data: workflowTrigger, error: insertError } = await supabaseAdmin
      .from("workflow_trigger")
      .insert({
        workflow_id: workflowId,
        connection_id: connection.id,
        provider: slug,
        event_type: parsed.data.eventType ?? parsed.data.triggerSlug,
        filter: parsed.data.triggerConfig,
        delivery: "webhook",
        status: "active",
        external_provider: "composio",
        external_trigger_id: composioTrigger.triggerId,
        external_metadata: {
          toolkit: catalog.composioToolkit,
          triggerSlug: parsed.data.triggerSlug,
          webhookUrl,
        },
      })
      .select("id, external_trigger_id")
      .single()

    if (insertError || !workflowTrigger) {
      console.error("Unable to save workflow trigger", insertError)
      return Errors.internal()
    }

    return ok({
      workflowTriggerId: workflowTrigger.id,
      composioTriggerId: workflowTrigger.external_trigger_id,
      triggerSlug: parsed.data.triggerSlug,
      webhookUrl,
    })
  } catch (error) {
    console.error("Unable to register Composio trigger", error)
    return Errors.badRequest(error instanceof Error ? error.message : "Unable to register trigger.")
  }
}
