import { type NextRequest } from "next/server"

import { getUser } from "@/lib/api/auth"
import { getWorkspaceId } from "@/lib/api/workspace"
import { ok, Errors } from "@/lib/api/response"
import { compileComposioAgentTool } from "@/lib/integrations/composio-chat"

type AgentBlueprintStep = {
  id?: string
  name?: string
  type?: string
  provider?: string | null
  app?: string | null
  trigger_slug?: string | null
  triggerSlug?: string | null
  model?: string | null
  prompt?: string
  status?: string
}

type AgentBlueprint = {
  steps?: AgentBlueprintStep[]
  required_apps?: string[]
  approval_policy?: {
    require_approval_for?: string[]
    mode?: string
  }
}

function normalizeProviderName(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-")
}

function getBlueprintSteps(value: unknown): AgentBlueprintStep[] {
  if (!value || typeof value !== "object") return []
  const blueprint = value as AgentBlueprint
  return Array.isArray(blueprint.steps) ? blueprint.steps : []
}

function getStepProvider(step: AgentBlueprintStep) {
  const provider = step.app ?? step.provider
  if (!provider || provider === "Atmet") return null
  return provider
}

function inferToolName(step: AgentBlueprintStep) {
  const type = step.type ?? "action"
  const name = step.name ?? "agent step"
  return `${type}.${normalizeProviderName(name)}`
}

function buildActionCompilePrompt(step: AgentBlueprintStep, providerName: string) {
  return [
    `Use ${providerName} for this agent action step.`,
    step.name ? `Step name: ${step.name}` : null,
    step.prompt ? `Step instruction: ${step.prompt}` : null,
    "Choose the most specific executable Composio tool for this step.",
  ]
    .filter(Boolean)
    .join("\n")
}

function inferTriggerSlug(step: AgentBlueprintStep) {
  if (step.trigger_slug) return step.trigger_slug
  if (step.triggerSlug) return step.triggerSlug
  if (step.model && /^[A-Z0-9_]+$/.test(step.model)) return step.model

  const text = `${step.name ?? ""} ${step.prompt ?? ""}`.toLowerCase()
  const provider = normalizeProviderName(step.app ?? step.provider ?? "")

  if (provider.includes("gmail")) {
    return text.includes("sent") || text.includes("outgoing")
      ? "GMAIL_EMAIL_SENT_TRIGGER"
      : "GMAIL_NEW_GMAIL_MESSAGE"
  }

  if (provider.includes("calendar")) {
    if (text.includes("starting") || text.includes("soon")) {
      return "GOOGLECALENDAR_EVENT_STARTING_SOON_TRIGGER"
    }
    if (text.includes("cancel") || text.includes("delete")) {
      return "GOOGLECALENDAR_EVENT_CANCELED_DELETED_TRIGGER"
    }
    if (text.includes("update") || text.includes("change")) {
      return "GOOGLECALENDAR_GOOGLE_CALENDAR_EVENT_UPDATED_TRIGGER"
    }
    return "GOOGLECALENDAR_GOOGLE_CALENDAR_EVENT_CREATED_TRIGGER"
  }

  if (provider.includes("sheets")) {
    if (text.includes("row")) return "GOOGLESHEETS_NEW_ROWS_TRIGGER"
    if (text.includes("cell") || text.includes("range") || text.includes("value")) {
      return "GOOGLESHEETS_CELL_RANGE_VALUES_CHANGED_TRIGGER"
    }
    return "GOOGLESHEETS_NEW_SPREADSHEET_CREATED_TRIGGER"
  }

  if (provider.includes("docs")) {
    if (text.includes("keyword")) return "GOOGLEDOCS_KEYWORD_DETECTED_TRIGGER"
    if (text.includes("update") || text.includes("edit")) {
      return "GOOGLEDOCS_DOCUMENT_UPDATED_TRIGGER"
    }
    return "GOOGLEDOCS_DOCUMENT_CREATED_TRIGGER"
  }

  if (provider.includes("drive")) {
    if (text.includes("comment")) return "GOOGLEDRIVE_COMMENT_ADDED_TRIGGER"
    if (text.includes("delete") || text.includes("trash")) {
      return "GOOGLEDRIVE_FILE_DELETED_OR_TRASHED_TRIGGER"
    }
    if (text.includes("update") || text.includes("edit")) {
      return "GOOGLEDRIVE_FILE_UPDATED_TRIGGER"
    }
    return "GOOGLEDRIVE_FILE_CREATED_TRIGGER"
  }

  if (provider.includes("github")) {
    if (text.includes("pull request") || text.includes(" pr ")) {
      return text.includes("update") || text.includes("review")
        ? "GITHUB_PULL_REQUEST_UPDATED"
        : "GITHUB_PULL_REQUEST_CREATED"
    }
    if (text.includes("issue")) {
      return text.includes("assign")
        ? "GITHUB_ISSUE_ASSIGNED_TO_ME_TRIGGER"
        : "GITHUB_ISSUE_CREATED_TRIGGER"
    }
    if (text.includes("branch")) return "GITHUB_BRANCH_CHANGED_TRIGGER"
    if (text.includes("workflow")) return "GITHUB_WORKFLOW_RUN_CREATED"
    if (text.includes("star")) return "GITHUB_STAR_ADDED_EVENT"
    return "GITHUB_COMMIT_EVENT"
  }

  return null
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getUser()
  if (!auth.ok) return auth.response

  const ws = getWorkspaceId(request)
  if (!ws.ok) return ws.response

  const { supabase } = auth
  const { id } = await params

  const { data: agent, error: agentError } = await supabase
    .from("agent")
    .select("id, workspace_id, blueprint_json, runtime_config_json")
    .eq("id", id)
    .eq("workspace_id", ws.workspaceId)
    .maybeSingle()

  if (agentError || !agent) return Errors.notFound("Agent")

  const blueprint = (agent.blueprint_json ?? {}) as AgentBlueprint
  const steps = getBlueprintSteps(blueprint)
  if (steps.length === 0) {
    return Errors.badRequest("This agent does not have plan steps to compile.")
  }

  const { data: connections, error: connectionsError } = await supabase
    .from("workspace_integration")
    .select(
      "id, status, connector_provider, external_connection_id, provider:provider_id(slug, name)"
    )
    .eq("workspace_id", ws.workspaceId)
    .eq("status", "active")

  if (connectionsError) return Errors.internal()

  const connectionByProvider = new Map<
    string,
    {
      id: string
      status: string
      connector_provider: string
      external_connection_id: string | null
      providerName: string
      providerSlug: string
    }
  >()

  for (const connection of connections ?? []) {
    const provider = Array.isArray(connection.provider)
      ? connection.provider[0]
      : connection.provider
    const slug = typeof provider?.slug === "string" ? provider.slug : ""
    const name = typeof provider?.name === "string" ? provider.name : slug
    const record = {
      id: connection.id,
      status: connection.status,
      connector_provider: connection.connector_provider,
      external_connection_id: connection.external_connection_id,
      providerName: name,
      providerSlug: slug,
    }
    if (slug) connectionByProvider.set(normalizeProviderName(slug), record)
    if (name) connectionByProvider.set(normalizeProviderName(name), record)
  }

  await supabase.from("agent_tool").delete().eq("agent_id", agent.id)
  await supabase.from("agent_trigger").delete().eq("agent_id", agent.id)

  const toolRows = await Promise.all(
    steps
      .filter((step) => step.type !== "trigger")
      .map(async (step, index) => {
      const providerName = getStepProvider(step)
      const connection = providerName
        ? connectionByProvider.get(normalizeProviderName(providerName))
        : null
      const shouldCompileComposio =
        Boolean(providerName && connection?.connector_provider === "composio")
      const compiled = shouldCompileComposio
        ? await compileComposioAgentTool({
            workspaceId: ws.workspaceId,
            userId: auth.user.id,
            provider: providerName!,
            content: buildActionCompilePrompt(step, providerName!),
          }).catch((error: unknown) => ({
            ok: false as const,
            error:
              error instanceof Error
                ? error.message
                : "Unable to compile Composio tool.",
          }))
        : null
      const compiledComposio =
        compiled && compiled.ok ? compiled.compiledTool : null
      const compileError =
        compiled && !compiled.ok ? compiled.error : null

      return {
        agent_id: agent.id,
        provider: providerName ?? "Atmet",
        tool_name: compiledComposio?.toolSlug ?? inferToolName(step),
        connection_id: connection?.id ?? null,
        permissions_json: {
          stepId: step.id ?? `step-${index + 1}`,
          stepName: step.name ?? `Step ${index + 1}`,
          prompt: step.prompt ?? null,
          status: providerName && !connection ? "missing_connection" : "ready",
          connectorProvider: connection?.connector_provider ?? null,
          externalConnectionId: connection?.external_connection_id ?? null,
          compiledComposio,
          compileError,
          compileStatus: providerName
            ? compiledComposio
              ? "compiled"
              : compileError
                ? "runtime_planning_fallback"
                : "not_required"
            : "not_required",
          approvalMode: blueprint.approval_policy?.mode ?? "design_time",
          requiresApprovalFor:
            blueprint.approval_policy?.require_approval_for ?? [],
        },
      }
      })
  )

  const triggerRows = steps
    .filter((step) => step.type === "trigger")
    .map((step, index) => {
      const providerName = getStepProvider(step)
      const connection = providerName
        ? connectionByProvider.get(normalizeProviderName(providerName))
        : null
      const triggerSlug = inferTriggerSlug(step)

      return {
        agent_id: agent.id,
        connection_id: connection?.id ?? null,
        provider: providerName,
        type: providerName ? "app_event" : "manual",
        event_type: triggerSlug,
        status: "inactive",
        config_json: {
          stepId: step.id ?? `trigger-${index + 1}`,
          stepName: step.name ?? `Trigger ${index + 1}`,
          provider: providerName,
          triggerSlug,
          prompt: step.prompt ?? null,
          connectionId: connection?.id ?? null,
          connectorProvider: connection?.connector_provider ?? null,
          externalConnectionId: connection?.external_connection_id ?? null,
          status: providerName && !connection ? "missing_connection" : "ready",
        },
      }
    })

  if (toolRows.length > 0) {
    const { error } = await supabase.from("agent_tool").insert(toolRows)
    if (error) {
      console.error("Unable to compile agent tools", error)
      return Errors.internal()
    }
  }

  if (triggerRows.length > 0) {
    const { error } = await supabase.from("agent_trigger").insert(triggerRows)
    if (error) {
      console.error("Unable to compile agent triggers", error)
      return Errors.internal()
    }
  }

  const missingConnections = [...toolRows, ...triggerRows]
    .filter((row) => {
      const payload =
        "permissions_json" in row ? row.permissions_json : row.config_json
      return payload.status === "missing_connection"
    })
    .map((row) => row.provider)
    .filter((value): value is string => Boolean(value))
  const compiledToolCount = toolRows.filter(
    (row) => row.permissions_json.compiledComposio
  ).length
  const toolCompileFallbacks = toolRows
    .filter((row) => row.permissions_json.compileError)
    .map((row) => ({
      provider: row.provider,
      stepName: row.permissions_json.stepName,
      error: row.permissions_json.compileError,
    }))

  const runtimeConfig =
    agent.runtime_config_json && typeof agent.runtime_config_json === "object"
      ? agent.runtime_config_json
      : {}
  const compiledAt = new Date().toISOString()

  const { data: updatedAgent, error: updateError } = await supabase
    .from("agent")
    .update({
      runtime_config_json: {
        ...runtimeConfig,
        agentRuntimeMode: "agent_brain",
        compiledAt,
        compileStatus: missingConnections.length > 0 ? "needs_connections" : "ready",
        compiledToolCount,
        toolCompileFallbacks,
        missingConnections: Array.from(new Set(missingConnections)),
      },
    })
    .eq("id", agent.id)
    .select("id, runtime_config_json")
    .single()

  if (updateError || !updatedAgent) return Errors.internal()

  return ok({
    agent: updatedAgent,
    compiled: {
      tools: toolRows.length,
      compiledTools: compiledToolCount,
      triggers: triggerRows.length,
      toolCompileFallbacks,
      missingConnections: Array.from(new Set(missingConnections)),
      compiledAt,
    },
  })
}
