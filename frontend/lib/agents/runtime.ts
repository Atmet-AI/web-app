import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import {
  runCompiledComposioAgentTool,
  runComposioChatTool,
  type ComposioAgentCompiledTool,
} from "@/lib/integrations/composio-chat"
import { getOpenAIClient } from "@/lib/openai"

export class AgentRuntimeError extends Error {
  constructor(
    message: string,
    public readonly code: "bad_request" | "not_found" | "internal" = "internal"
  ) {
    super(message)
  }
}

type AgentBlueprintStep = {
  id?: string
  node_id?: string
  action_id?: string
  name?: string
  type?: string
  provider?: string | null
  app?: string | null
  trigger_slug?: string | null
  prompt?: string
  runtime_ms?: number
  status?: string
}

type AgentBlueprintNode = {
  id?: string
  name?: string
  type?: "trigger" | "action" | string
  provider?: string | null
  app?: string | null
  trigger_slug?: string | null
  prompt?: string
  runtime?: {
    expected_ms?: number
    timeout_ms?: number
  }
  actions?: Array<{
    id?: string
    name?: string
    prompt?: string
    tool_hint?: string | null
    runtime_ms?: number
  }>
  status?: string
}

type AgentBlueprint = {
  nodes?: AgentBlueprintNode[]
  steps?: AgentBlueprintStep[]
  required_apps?: string[]
  approval_policy?: {
    require_approval_for?: string[]
    mode?: string
  }
}

type CompiledTool = {
  id?: string
  connection_id: string | null
  provider: string
  tool_name: string
  permissions_json?: {
    status?: string
    stepId?: string
    stepName?: string
    compiledComposio?: ComposioAgentCompiledTool | null
  } | null
}

type AgentBrainDecision = {
  decision?: "call_tool" | "request_approval" | "remember" | "finish" | "fail"
  stepIndex?: number
  toolIndex?: number
  title?: string
  reasoning?: string
  actionPrompt?: string
  finalAnswer?: string
  error?: string
  memoryWrites?: Array<{
    scope?: string
    key?: string
    value?: unknown
  }>
}

export type RunAgentResult = {
  run: Record<string, unknown>
  summary: {
    status: "succeeded" | "failed" | "waiting_for_approval"
    durationMs: number
    steps: Array<Record<string, unknown>>
    error: string | null
  }
}

function getBlueprintSteps(value: unknown): AgentBlueprintStep[] {
  if (!value || typeof value !== "object") return []
  const blueprint = value as AgentBlueprint
  if (Array.isArray(blueprint.nodes) && blueprint.nodes.length > 0) {
    return blueprint.nodes.flatMap((node, nodeIndex) => {
      const actions =
        Array.isArray(node.actions) && node.actions.length > 0
          ? node.actions
          : [
              {
                id: "action-1",
                name: node.name,
                prompt: node.prompt,
                runtime_ms: node.runtime?.expected_ms,
              },
            ]

      return actions.map((action, actionIndex) => ({
        id: `${node.id ?? `node-${nodeIndex + 1}`}-${action.id ?? `action-${actionIndex + 1}`}`,
        node_id: node.id ?? `node-${nodeIndex + 1}`,
        action_id: action.id ?? `action-${actionIndex + 1}`,
        name:
          actions.length > 1
            ? `${node.name ?? `Node ${nodeIndex + 1}`}: ${action.name ?? `Action ${actionIndex + 1}`}`
            : node.name ?? action.name ?? `Node ${nodeIndex + 1}`,
        type: node.type ?? "action",
        provider: node.provider ?? node.app ?? null,
        app: node.app ?? node.provider ?? null,
        trigger_slug: node.type === "trigger" ? node.trigger_slug ?? null : null,
        prompt: action.prompt ?? node.prompt,
        runtime_ms: action.runtime_ms ?? node.runtime?.expected_ms,
        status: node.status,
      }))
    })
  }
  return Array.isArray(blueprint.steps) ? blueprint.steps : []
}

function normalizeProviderName(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-")
}

function needsConnection(step: AgentBlueprintStep) {
  return Boolean(step.app || step.provider) && step.provider !== "Atmet"
}

function safeStringify(value: unknown) {
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function buildLiveToolPrompt(input: {
  appName: string
  step: AgentBlueprintStep
  runInput: Record<string, unknown>
  previousOutputs: Array<Record<string, unknown>>
  memoryContext?: string | null
}) {
  const previousOutput = input.previousOutputs.at(-1)
  return [
    `Use ${input.appName} to complete this agent step.`,
    input.step.prompt ? `Step instruction: ${input.step.prompt}` : null,
    input.step.name ? `Step name: ${input.step.name}` : null,
    input.memoryContext ? `Agent memory:\n${input.memoryContext}` : null,
    `Current run input: ${safeStringify(input.runInput)}`,
    previousOutput
      ? `Previous step output: ${safeStringify(previousOutput)}`
      : null,
    "If the instruction is missing required details, do not guess sensitive values. Return a clear error or question.",
  ]
    .filter(Boolean)
    .join("\n")
}

function buildMemoryContext(
  memories: Array<{ scope: string; key: string; value_json: unknown }>
) {
  if (memories.length === 0) return null
  return memories
    .slice(0, 12)
    .map((memory) => `${memory.scope}.${memory.key}: ${safeStringify(memory.value_json)}`)
    .join("\n")
    .slice(0, 6000)
}

function stepRequiresApproval(input: {
  blueprint: AgentBlueprint
  step: AgentBlueprintStep
  appName: string | null
  canExecuteLiveTool: boolean
}) {
  const mode = input.blueprint.approval_policy?.mode ?? "design_time"
  if (mode === "none" || !input.canExecuteLiveTool) return false

  const approvalItems =
    input.blueprint.approval_policy?.require_approval_for ?? []
  const stepText = [
    input.step.name,
    input.step.prompt,
    input.appName,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()

  const riskyActionPattern =
    /\b(send|reply|email|message|post|publish|delete|remove|archive|update|edit|write|create|charge|refund|payment|invoice|crm|external)\b/i

  if (mode === "per_run") return true

  return approvalItems.some((item) => {
    const words = item
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((word) => word.length >= 4)
    return words.some((word) => stepText.includes(word))
  })
}

function shouldUseAgentBrain(agent: Record<string, unknown>) {
  const runtimeConfig =
    agent.runtime_config_json &&
    typeof agent.runtime_config_json === "object" &&
    !Array.isArray(agent.runtime_config_json)
      ? (agent.runtime_config_json as Record<string, unknown>)
      : {}

  if (runtimeConfig.agentRuntimeMode === "blueprint_runner") return false
  if (process.env.AGENT_RUNTIME_MODE === "blueprint_runner") return false
  return true
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function parseBrainDecision(value: string | null | undefined): AgentBrainDecision {
  if (!value) return { decision: "fail", error: "Agent brain returned no decision." }

  try {
    const parsed = JSON.parse(value) as AgentBrainDecision
    return parsed && typeof parsed === "object"
      ? parsed
      : { decision: "fail", error: "Agent brain returned an invalid decision." }
  } catch {
    return { decision: "fail", error: "Agent brain returned invalid JSON." }
  }
}

function buildToolCatalog(input: {
  steps: AgentBlueprintStep[]
  compiledToolByStep: Map<string, CompiledTool>
}) {
  return input.steps.map((step, stepIndex) => {
    const compiledTool =
      (step.id ? input.compiledToolByStep.get(step.id) : null) ??
      (step.name
        ? input.compiledToolByStep.get(normalizeProviderName(step.name))
        : null)
    const appName = step.app ?? step.provider ?? null
    const permissions = asRecord(compiledTool?.permissions_json)
    const compiledComposio =
      permissions.compiledComposio &&
      typeof permissions.compiledComposio === "object"
        ? (permissions.compiledComposio as ComposioAgentCompiledTool)
        : null

    return {
      stepIndex,
      stepId: step.id ?? `step-${stepIndex + 1}`,
      nodeId: step.node_id ?? null,
      actionId: step.action_id ?? null,
      name: step.name ?? `Step ${stepIndex + 1}`,
      type: step.type ?? "action",
      appName,
      instruction: step.prompt ?? null,
      runtimeMs: step.runtime_ms ?? null,
      provider: compiledTool?.provider ?? appName ?? "Atmet",
      toolName: compiledTool?.tool_name ?? null,
      connectionId: compiledTool?.connection_id ?? null,
      status: permissions.status ?? "ready",
      compiledComposio,
      needsConnection: needsConnection(step),
      canExecuteLiveTool:
        needsConnection(step) &&
        step.type !== "trigger" &&
        Boolean(compiledTool?.connection_id && appName),
      step,
      compiledTool,
    }
  })
}

async function decideNextAgentAction(input: {
  agent: Record<string, unknown>
  blueprint: AgentBlueprint
  runInput: Record<string, unknown>
  memoryContext: string | null
  toolCatalog: ReturnType<typeof buildToolCatalog>
  stepOutputs: Array<Record<string, unknown>>
}) {
  const model =
    process.env.OPENAI_AGENT_MODEL ?? process.env.OPENAI_MODEL ?? "gpt-4o"
  const openai = getOpenAIClient()
  const toolCatalogForPrompt = input.toolCatalog.map((tool, index) => ({
    toolIndex: index,
    stepIndex: tool.stepIndex,
    name: tool.name,
    nodeId: tool.nodeId,
    actionId: tool.actionId,
    type: tool.type,
    appName: tool.appName,
    provider: tool.provider,
    toolName: tool.toolName,
    status: tool.status,
    hasConnection: Boolean(tool.connectionId),
    canExecuteLiveTool: tool.canExecuteLiveTool,
    runtimeMs: tool.runtimeMs,
    instruction: tool.instruction,
    compiledTool: tool.compiledComposio
      ? {
          label: tool.compiledComposio.label,
          toolSlug: tool.compiledComposio.toolSlug,
          description: tool.compiledComposio.description,
        }
      : null,
  }))

  const completion = await openai.chat.completions.create({
    model,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: [
          "You are Atmet's agent brain. You operate a business workflow agent, not a chatbot.",
          "Decide exactly one next action from the current goal, memory, available tools, and observations.",
          "Return JSON only with this shape:",
          '{"decision":"call_tool|request_approval|remember|finish|fail","toolIndex":0,"stepIndex":0,"title":"short action name","reasoning":"short reason","actionPrompt":"specific instruction for the selected tool","memoryWrites":[{"scope":"runtime","key":"short_key","value":{}}],"finalAnswer":"summary","error":"failure reason"}',
          "Use call_tool when an available connected tool should be used.",
          "Do not request approval merely because the user mentioned or selected an app/skill; that is already design-time permission to include it.",
          "Use request_approval only before externally visible, destructive, or sensitive live actions when the agent approval policy requires it.",
          "Use remember to store durable information, then continue next turn.",
          "Use finish only when the workflow goal is complete.",
          "Use fail only when the agent cannot proceed without missing connections or required details.",
        ].join("\n"),
      },
      {
        role: "user",
        content: safeStringify({
          agent: {
            name: input.agent.name,
            description: input.agent.description,
            goal: input.agent.goal,
            instructions: input.agent.instructions,
          },
          blueprint: input.blueprint,
          runInput: input.runInput,
          memory: input.memoryContext,
          availableTools: toolCatalogForPrompt,
          observations: input.stepOutputs.slice(-8),
        }).slice(0, 22000),
      },
    ],
  })

  return parseBrainDecision(completion.choices[0]?.message?.content)
}

async function writeAgentMemory(input: {
  supabase: SupabaseClient
  agentId: string
  writes: NonNullable<AgentBrainDecision["memoryWrites"]>
}) {
  const now = new Date().toISOString()
  const rows = input.writes
    .filter((write) => write.key && typeof write.key === "string")
    .slice(0, 5)
    .map((write) => ({
      agent_id: input.agentId,
      scope: (write.scope && String(write.scope).slice(0, 40)) || "runtime",
      key: String(write.key).slice(0, 80),
      value_json:
        write.value && typeof write.value === "object"
          ? write.value
          : { value: write.value ?? null },
      updated_at: now,
    }))

  if (rows.length === 0) return

  await input.supabase.from("agent_memory").upsert(rows, {
    onConflict: "agent_id,scope,key",
  })
}

async function runAgentDecisionLoop(input: {
  supabase: SupabaseClient
  agent: Record<string, unknown>
  blueprint: AgentBlueprint
  steps: AgentBlueprintStep[]
  compiledToolByStep: Map<string, CompiledTool>
  run: Record<string, unknown>
  runInput: Record<string, unknown>
  memoryContext: string | null
  workspaceId: string
  userId: string
  resumeRunId?: string
  startStepIndex: number
  approvedApprovalId?: string
  runStartedAt: number
  seedStepOutputs: Array<Record<string, unknown>>
}): Promise<RunAgentResult> {
  const maxIterations = Number(process.env.AGENT_MAX_ITERATIONS ?? 8)
  const stepOutputs = [...input.seedStepOutputs]
  const toolCatalog = buildToolCatalog({
    steps: input.steps,
    compiledToolByStep: input.compiledToolByStep,
  })
  let nextRunStepIndex =
    input.seedStepOutputs.reduce((max, step) => {
      return typeof step.runStepIndex === "number"
        ? Math.max(max, step.runStepIndex)
        : max
    }, -1) + 1
  const approvedStepIndex =
    input.approvedApprovalId && Number.isInteger(input.startStepIndex)
      ? input.startStepIndex
      : null
  let finalStatus: "succeeded" | "failed" | "waiting_for_approval" = "succeeded"
  let finalError: string | null = null
  let liveToolAttempted = false
  let waitingApprovalStep: string | null = null

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    const decisionStartedAt = Date.now()
    let decision: AgentBrainDecision

    try {
      decision = await decideNextAgentAction({
        agent: input.agent,
        blueprint: input.blueprint,
        runInput: input.runInput,
        memoryContext: input.memoryContext,
        toolCatalog,
        stepOutputs,
      })
    } catch (error) {
      finalStatus = "failed"
      finalError =
        error instanceof Error
          ? error.message
          : "Agent brain could not make a decision."
      break
    }

    const chosenTool =
      typeof decision.toolIndex === "number"
        ? toolCatalog[decision.toolIndex]
        : typeof decision.stepIndex === "number"
          ? toolCatalog.find((tool) => tool.stepIndex === decision.stepIndex)
          : null
    const stepIndex = chosenTool?.stepIndex ?? iteration
    const stepName =
      decision.title ??
      chosenTool?.name ??
      `Agent decision ${iteration + 1}`
    const isApprovedResumeStep =
      approvedStepIndex !== null && chosenTool?.stepIndex === approvedStepIndex
    const decisionKind = decision.decision ?? "fail"

    if (Array.isArray(decision.memoryWrites) && decision.memoryWrites.length > 0) {
      await writeAgentMemory({
        supabase: input.supabase,
        agentId: String(input.agent.id),
        writes: decision.memoryWrites,
      })
    }

    if (decisionKind === "remember") {
      const output = {
        decision: decisionKind,
        reasoning: decision.reasoning ?? null,
        memoryWrites: decision.memoryWrites ?? [],
      }
      const { error: stepError } = await input.supabase
        .from("agent_run_step")
        .insert({
          run_id: input.run.id,
          step_index: nextRunStepIndex,
          step_name: stepName,
          tool_called: "Atmet.memory",
          status: "succeeded",
          input_json: { decision, runInput: input.runInput },
          output_json: output,
          started_at: new Date(decisionStartedAt).toISOString(),
          finished_at: new Date().toISOString(),
          duration_ms: Date.now() - decisionStartedAt,
        })

      if (stepError) {
        finalStatus = "failed"
        finalError = `Agent could not record memory at: ${stepName}`
        break
      }
      nextRunStepIndex += 1

      stepOutputs.push({
        stepIndex,
        stepName,
        status: "succeeded",
        output,
      })
      continue
    }

    if (decisionKind === "finish") {
      stepOutputs.push({
        stepIndex,
        stepName,
        status: "succeeded",
        output: {
          decision: decisionKind,
          reasoning: decision.reasoning ?? null,
          finalAnswer: decision.finalAnswer ?? "Agent completed the goal.",
        },
      })
      finalStatus = "succeeded"
      break
    }

    if (decisionKind === "fail" || !chosenTool) {
      finalStatus = "failed"
      finalError =
        decision.error ??
        (!chosenTool
          ? "Agent brain did not choose an available tool."
          : "Agent brain could not continue.")
      stepOutputs.push({
        stepIndex,
        stepName,
        status: "failed",
        output: {
          decision: decisionKind,
          reasoning: decision.reasoning ?? null,
          error: finalError,
        },
      })
      break
    }

    if (chosenTool.needsConnection && !chosenTool.connectionId) {
      finalStatus = "failed"
      finalError = `Connect ${chosenTool.appName} before this agent can execute this action.`
      stepOutputs.push({
        stepIndex,
        stepName,
        status: "failed",
        output: {
          decision: decisionKind,
          reason: "missing_connection",
          appName: chosenTool.appName,
        },
      })
      break
    }

    const shouldAskApproval =
      decisionKind === "request_approval" ||
      (!isApprovedResumeStep &&
        stepRequiresApproval({
          blueprint: input.blueprint,
          step: chosenTool.step,
          appName: chosenTool.appName,
          canExecuteLiveTool: chosenTool.canExecuteLiveTool,
        }))

    if (shouldAskApproval) {
      const now = new Date().toISOString()
      const approvalOutput = {
        decision: "request_approval",
        reasoning: decision.reasoning ?? null,
        message: "This action is waiting for a workspace admin approval.",
        preview: {
          title: stepName,
          appName: chosenTool.appName,
          instruction:
            decision.actionPrompt ?? chosenTool.instruction ?? chosenTool.step.prompt ?? null,
          toolName: chosenTool.toolName,
          connectionId: chosenTool.connectionId,
        },
      }

      const { data: stepRow, error: stepError } = await input.supabase
        .from("agent_run_step")
        .insert({
          run_id: input.run.id,
          step_index: nextRunStepIndex,
          step_name: stepName,
          tool_called: chosenTool.appName
            ? `${chosenTool.appName}.${chosenTool.toolName ?? "agent_action"}`
            : "Atmet.agent_action",
          status: "waiting_for_approval",
          input_json: { decision, runInput: input.runInput },
          output_json: approvalOutput,
          started_at: new Date(decisionStartedAt).toISOString(),
          finished_at: now,
          duration_ms: Date.now() - decisionStartedAt,
        })
        .select("id")
        .single()

      if (stepError) {
        finalStatus = "failed"
        finalError = `Agent could not request approval at: ${stepName}`
        break
      }
      nextRunStepIndex += 1

      const { error: approvalError } = await input.supabase
        .from("agent_approval")
        .insert({
          agent_id: input.agent.id,
          run_id: input.run.id,
          requested_by_run_step_id: stepRow?.id ?? null,
          action_json: {
            stepIndex: chosenTool.stepIndex,
            brainLoop: true,
            preview: approvalOutput.preview,
            decision,
            step: chosenTool.step,
            runInput: input.runInput,
            appName: chosenTool.appName,
            connectionId: chosenTool.connectionId,
            toolName: chosenTool.toolName,
            approvalPolicy: input.blueprint.approval_policy ?? null,
          },
          status: "pending",
        })

      if (approvalError) {
        finalStatus = "failed"
        finalError = `Agent could not create approval for: ${stepName}`
        break
      }

      stepOutputs.push({
        stepIndex: chosenTool.stepIndex,
        stepName,
        status: "waiting_for_approval",
        output: approvalOutput,
      })
      waitingApprovalStep = stepName
      finalStatus = "waiting_for_approval"
      break
    }

    liveToolAttempted = chosenTool.canExecuteLiveTool || liveToolAttempted
    let status: "succeeded" | "failed" = "succeeded"
    let stepFailureError: string | null = null
    let output: Record<string, unknown>

    if (chosenTool.canExecuteLiveTool && chosenTool.appName) {
      try {
        const liveToolPrompt = [
          decision.actionPrompt ??
            chosenTool.instruction ??
            chosenTool.step.prompt ??
            `Complete ${chosenTool.name}.`,
          decision.reasoning ? `Agent reason: ${decision.reasoning}` : null,
          `Current run input: ${safeStringify(input.runInput)}`,
          stepOutputs.length > 0
            ? `Recent observations: ${safeStringify(stepOutputs.slice(-4))}`
            : null,
          input.memoryContext ? `Agent memory:\n${input.memoryContext}` : null,
        ]
          .filter(Boolean)
          .join("\n")
        const toolResult = chosenTool.compiledComposio
          ? await runCompiledComposioAgentTool({
              workspaceId: input.workspaceId,
              userId: input.userId,
              content: liveToolPrompt,
              compiledTool: chosenTool.compiledComposio,
            })
          : await runComposioChatTool({
              workspaceId: input.workspaceId,
              userId: input.userId,
              content: liveToolPrompt,
              contextMessages: stepOutputs.slice(-3).map((previousStep) => ({
                role: "assistant",
                content: safeStringify(previousStep).slice(0, 4000),
              })),
            })

        if (!toolResult) {
          output = {
            decision: decisionKind,
            simulated: true,
            reason: "tool_not_detected",
            message:
              "Atmet could not map this action to a live Composio operation yet.",
            toolName: chosenTool.toolName,
            connectionId: chosenTool.connectionId,
          }
        } else if (toolResult.ok) {
          output = {
            decision: decisionKind,
            simulated: false,
            provider: toolResult.provider,
            operation: toolResult.operation,
            summary: toolResult.summary,
            data: toolResult.data,
            toolName: chosenTool.toolName,
            connectionId: chosenTool.connectionId,
            executionMode: chosenTool.compiledComposio
              ? "compiled_tool"
              : "dynamic_planning",
          }
        } else {
          status = "failed"
          stepFailureError = toolResult.error
          output = {
            decision: decisionKind,
            simulated: false,
            provider: toolResult.provider,
            operation: toolResult.operation,
            summary: toolResult.summary,
            error: toolResult.error,
            toolName: chosenTool.toolName,
            connectionId: chosenTool.connectionId,
            executionMode: chosenTool.compiledComposio
              ? "compiled_tool"
              : "dynamic_planning",
          }
        }
      } catch (error) {
        status = "failed"
        stepFailureError =
          error instanceof Error
            ? error.message
            : "Composio tool execution failed."
        output = {
          decision: decisionKind,
          simulated: false,
          reason: "tool_execution_error",
          message: stepFailureError,
          toolName: chosenTool.toolName,
          connectionId: chosenTool.connectionId,
        }
      }
    } else {
      output = {
        decision: decisionKind,
        simulated: true,
        message: "Agent completed an internal reasoning step.",
        reasoning: decision.reasoning ?? null,
      }
    }

    const { error: stepError } = await input.supabase
      .from("agent_run_step")
      .insert({
        run_id: input.run.id,
        step_index: nextRunStepIndex,
        step_name: stepName,
        tool_called: chosenTool.appName
          ? `${chosenTool.appName}.${chosenTool.toolName ?? "agent_action"}`
          : "Atmet.agent_action",
        status,
        input_json: {
          decision,
          selectedTool: {
            stepIndex: chosenTool.stepIndex,
            name: chosenTool.name,
            appName: chosenTool.appName,
            toolName: chosenTool.toolName,
          },
          runInput: input.runInput,
        },
        output_json: output,
        error: stepFailureError,
        started_at: new Date(decisionStartedAt).toISOString(),
        finished_at: new Date().toISOString(),
        duration_ms: Date.now() - decisionStartedAt,
      })

    if (stepError) {
      finalStatus = "failed"
      finalError = `Agent could not record step: ${stepName}`
      break
    }
    nextRunStepIndex += 1

    stepOutputs.push({
      stepIndex: chosenTool.stepIndex,
      stepName,
      status,
      output,
    })

    if (status === "failed") {
      finalStatus = "failed"
      finalError = stepFailureError ?? `Agent stopped at: ${stepName}`
      break
    }
  }

  if (stepOutputs.length >= maxIterations && finalStatus === "succeeded") {
    finalStatus = "failed"
    finalError = `Agent reached the ${maxIterations} step runtime limit.`
  }

  const runUpdate: Record<string, unknown> = {
    status: finalStatus,
    output_json: {
      mode: "agent_brain",
      steps: stepOutputs,
      dryRun: !liveToolAttempted,
      message:
        finalStatus === "waiting_for_approval"
          ? "Agent brain paused for approval."
          : finalStatus === "succeeded"
            ? "Agent brain completed the workflow goal."
            : "Agent brain stopped before completing the workflow goal.",
    },
    error: finalError,
  }

  if (finalStatus !== "waiting_for_approval") {
    runUpdate.finished_at = new Date().toISOString()
  }

  const { data: updatedRun, error: updateError } = await input.supabase
    .from("agent_run")
    .update(runUpdate)
    .eq("id", input.run.id)
    .select()
    .single()

  if (updateError || !updatedRun) {
    throw new AgentRuntimeError("Unable to update agent run.")
  }

  if (finalStatus === "succeeded") {
    await input.supabase.from("agent_memory").upsert(
      {
        agent_id: input.agent.id,
        scope: "runtime",
        key: "last_successful_run",
        value_json: {
          runId: updatedRun.id,
          mode: "agent_brain",
          completedAt: new Date().toISOString(),
          steps: stepOutputs.map((step) => ({
            stepIndex: step.stepIndex,
            stepName: step.stepName,
            status: step.status,
          })),
        },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "agent_id,scope,key" }
    )
  }

  return {
    run: updatedRun,
    summary: {
      status: finalStatus,
      durationMs: Date.now() - input.runStartedAt,
      steps: stepOutputs,
      error: finalError ?? (waitingApprovalStep ? null : null),
    },
  }
}

export async function runAgent(input: {
  supabase: SupabaseClient
  agentId: string
  workspaceId: string
  userId: string
  runInput?: Record<string, unknown>
  triggerId?: string | null
  idempotencyKey?: string
  resumeRunId?: string
  startStepIndex?: number
  approvedApprovalId?: string
}): Promise<RunAgentResult> {
  const runInput = input.runInput ?? {}

  if (input.idempotencyKey) {
    const { data: existingRun, error: existingRunError } = await input.supabase
      .from("agent_run")
      .select("*")
      .eq("idempotency_key", input.idempotencyKey)
      .maybeSingle()

    if (existingRunError) {
      throw new AgentRuntimeError("Unable to check existing agent run.")
    }

    if (existingRun) {
      return {
        run: existingRun,
        summary: {
          status: existingRun.status === "failed"
            ? "failed"
            : existingRun.status === "waiting_for_approval"
              ? "waiting_for_approval"
              : "succeeded",
          durationMs: 0,
          steps: [],
          error: existingRun.error ?? null,
        },
      }
    }
  }

  const { data: agent, error: agentError } = await input.supabase
    .from("agent")
    .select("id, workspace_id, name, description, goal, instructions, status, blueprint_json, runtime_config_json, tools:agent_tool(id, provider, tool_name, connection_id, permissions_json)")
    .eq("id", input.agentId)
    .eq("workspace_id", input.workspaceId)
    .maybeSingle()

  if (agentError) throw new AgentRuntimeError("Unable to load agent.")
  if (!agent) throw new AgentRuntimeError("Agent not found.", "not_found")

  const blueprint = (agent.blueprint_json ?? {}) as AgentBlueprint
  const steps = getBlueprintSteps(blueprint)
  if (steps.length === 0) {
    throw new AgentRuntimeError(
      "This agent does not have plan steps to run yet.",
      "bad_request"
    )
  }

  const compiledTools = Array.isArray(agent.tools)
    ? (agent.tools as CompiledTool[])
    : []
  if (compiledTools.length === 0 && steps.some(needsConnection)) {
    throw new AgentRuntimeError(
      "Compile this agent before running app-connected steps.",
      "bad_request"
    )
  }

  const { data: memories } = await input.supabase
    .from("agent_memory")
    .select("scope, key, value_json")
    .eq("agent_id", agent.id)
    .order("updated_at", { ascending: false })
    .limit(20)
  const memoryContext = buildMemoryContext(
    (memories ?? []) as Array<{
      scope: string
      key: string
      value_json: unknown
    }>
  )

  const compiledToolByStep = new Map<string, CompiledTool>()
  for (const tool of compiledTools) {
    const permissions =
      tool.permissions_json && typeof tool.permissions_json === "object"
        ? tool.permissions_json
        : null
    if (permissions?.stepId) {
      compiledToolByStep.set(permissions.stepId, {
        ...tool,
        permissions_json: permissions,
      })
    }
    if (permissions?.stepName) {
      compiledToolByStep.set(normalizeProviderName(permissions.stepName), {
        ...tool,
        permissions_json: permissions,
      })
    }
  }

  const startStepIndex = input.startStepIndex ?? 0
  let run: Record<string, unknown>

  if (input.resumeRunId) {
    const { data: existingRun, error: runLoadError } = await input.supabase
      .from("agent_run")
      .update({
        status: "running",
        error: null,
        finished_at: null,
      })
      .eq("id", input.resumeRunId)
      .eq("agent_id", agent.id)
      .select()
      .single()

    if (runLoadError || !existingRun) {
      throw new AgentRuntimeError("Unable to resume agent run.")
    }

    run = existingRun
  } else {
    const insertPayload: Record<string, unknown> = {
      agent_id: agent.id,
      trigger_id: input.triggerId ?? null,
      status: "running",
      input_json: runInput,
      started_at: new Date().toISOString(),
    }
    if (input.idempotencyKey) insertPayload.idempotency_key = input.idempotencyKey

    const { data: createdRun, error: runError } = await input.supabase
      .from("agent_run")
      .insert(insertPayload)
      .select()
      .single()

    if (runError || !createdRun) {
      throw new AgentRuntimeError("Unable to create agent run.")
    }

    run = createdRun
  }

  const runStartedAt = Date.now()
  const stepOutputs: Array<Record<string, unknown>> = []
  let failedStep: string | null = null
  let waitingApprovalStep: string | null = null
  let liveToolAttempted = false
  const useAgentBrain = shouldUseAgentBrain(agent as Record<string, unknown>)

  if (input.resumeRunId && (startStepIndex > 0 || useAgentBrain)) {
    let previousStepsQuery = input.supabase
        .from("agent_run_step")
        .select("step_index, step_name, status, output_json")
        .eq("run_id", run.id)
        .order("step_index", { ascending: true })

    if (!useAgentBrain) {
      previousStepsQuery = previousStepsQuery.lt("step_index", startStepIndex)
    }

    const { data: previousSteps, error: previousStepsError } =
      await previousStepsQuery

    if (previousStepsError) {
      throw new AgentRuntimeError("Unable to load previous agent steps.")
    }

    for (const previousStep of previousSteps ?? []) {
      stepOutputs.push({
        runStepIndex: previousStep.step_index,
        stepIndex: previousStep.step_index,
        stepName: previousStep.step_name,
        status: previousStep.status,
        output: previousStep.output_json,
      })
    }
  }

  if (useAgentBrain) {
    return runAgentDecisionLoop({
      supabase: input.supabase,
      agent: agent as Record<string, unknown>,
      blueprint,
      steps,
      compiledToolByStep,
      run,
      runInput,
      memoryContext,
      workspaceId: input.workspaceId,
      userId: input.userId,
      resumeRunId: input.resumeRunId,
      startStepIndex,
      approvedApprovalId: input.approvedApprovalId,
      runStartedAt,
      seedStepOutputs: stepOutputs,
    })
  }

  for (const [index, step] of steps.entries()) {
    if (index < startStepIndex) continue
    const stepStartedAt = Date.now()
    const appName = step.app ?? step.provider ?? null
    const compiledTool =
      (step.id ? compiledToolByStep.get(step.id) : null) ??
      (step.name ? compiledToolByStep.get(normalizeProviderName(step.name)) : null)
    const connectionId = compiledTool?.connection_id ?? null
    const missingConnection =
      needsConnection(step) &&
      (!compiledTool ||
        !connectionId ||
        compiledTool.permissions_json?.status === "missing_connection")
    const canExecuteLiveTool =
      needsConnection(step) &&
      step.type !== "trigger" &&
      Boolean(compiledTool && connectionId && appName)
    let status: "succeeded" | "failed" | "waiting_for_approval" = missingConnection
      ? "failed"
      : "succeeded"
    let output: Record<string, unknown> = missingConnection
      ? {
          simulated: false,
          reason: "missing_connection",
          message: `Connect ${appName} before this agent can execute this step.`,
        }
      : {
          simulated: true,
          message:
            step.type === "trigger"
              ? "Trigger step checked during manual run."
              : "Internal planning step recorded. No external tool was required.",
          connectionId,
          toolName: compiledTool?.tool_name ?? null,
        }
    let stepFailureError: string | null = missingConnection
      ? `Missing ${appName} connection.`
      : null
    const isApprovedResumeStep =
      input.approvedApprovalId && index === startStepIndex

    if (
      !missingConnection &&
      !isApprovedResumeStep &&
      stepRequiresApproval({
        blueprint,
        step,
        appName,
        canExecuteLiveTool,
      })
    ) {
      status = "waiting_for_approval"
      output = {
        simulated: false,
        reason: "approval_required",
        message: "This step is waiting for a workspace admin approval.",
        connectionId,
        toolName: compiledTool?.tool_name ?? null,
      }
    }

    if (status !== "waiting_for_approval" && !missingConnection && canExecuteLiveTool && appName) {
      liveToolAttempted = true
      try {
        const liveToolPrompt = buildLiveToolPrompt({
            appName,
            step,
            runInput,
            previousOutputs: stepOutputs,
            memoryContext,
        })
        const compiledComposio =
          compiledTool?.permissions_json?.compiledComposio ?? null
        const toolResult = compiledComposio
          ? await runCompiledComposioAgentTool({
              workspaceId: input.workspaceId,
              userId: input.userId,
              content: liveToolPrompt,
              compiledTool: compiledComposio,
            })
          : await runComposioChatTool({
              workspaceId: input.workspaceId,
              userId: input.userId,
              content: liveToolPrompt,
              contextMessages: stepOutputs.slice(-3).map((previousStep) => ({
                role: "assistant",
                content: safeStringify(previousStep).slice(0, 4000),
              })),
            })

        if (!toolResult) {
          output = {
            simulated: true,
            reason: "tool_not_detected",
            message:
              "Atmet could not map this step to a Composio action yet. Add a clearer app action to the agent plan.",
            connectionId,
            toolName: compiledTool?.tool_name ?? null,
            executionMode: "dynamic_planning",
          }
        } else if (toolResult.ok) {
          output = {
            simulated: false,
            provider: toolResult.provider,
            operation: toolResult.operation,
            summary: toolResult.summary,
            data: toolResult.data,
            connectionId,
            toolName: compiledTool?.tool_name ?? null,
            executionMode: compiledComposio
              ? "compiled_tool"
              : "dynamic_planning",
          }
        } else {
          status = "failed"
          stepFailureError = toolResult.error
          output = {
            simulated: false,
            provider: toolResult.provider,
            operation: toolResult.operation,
            summary: toolResult.summary,
            error: toolResult.error,
            connectionId,
            toolName: compiledTool?.tool_name ?? null,
            executionMode: compiledComposio
              ? "compiled_tool"
              : "dynamic_planning",
          }
        }
      } catch (error) {
        status = "failed"
        stepFailureError =
          error instanceof Error
            ? error.message
            : "Composio tool execution failed."
        output = {
          simulated: false,
          reason: "tool_execution_error",
          message: stepFailureError,
          connectionId,
          toolName: compiledTool?.tool_name ?? null,
        }
      }
    }

    const stepPayload = {
        run_id: run.id,
        step_index: index,
        step_name: step.name ?? `Step ${index + 1}`,
        tool_called: appName ? `${appName}.${step.type ?? "step"}` : null,
        status,
        input_json: {
          step,
          runInput,
        },
        output_json: output,
        error: stepFailureError,
        started_at: new Date(stepStartedAt).toISOString(),
        finished_at: new Date().toISOString(),
        duration_ms: Date.now() - stepStartedAt,
      }

    const stepMutation = input.resumeRunId && index === startStepIndex
      ? input.supabase
          .from("agent_run_step")
          .update(stepPayload)
          .eq("run_id", run.id)
          .eq("step_index", index)
          .select("id")
          .single()
      : input.supabase
          .from("agent_run_step")
          .insert(stepPayload)
          .select("id")
          .single()

    const { data: stepRow, error: stepError } = await stepMutation

    if (stepError) {
      failedStep = step.name ?? `Step ${index + 1}`
      break
    }

    stepOutputs.push({
      stepIndex: index,
      stepName: step.name ?? `Step ${index + 1}`,
      status,
      output,
    })

    if (status === "succeeded") {
      await input.supabase.from("agent_memory").upsert(
        {
          agent_id: agent.id,
          scope: "runtime",
          key: `last_step_${index}`,
          value_json: {
            stepIndex: index,
            stepName: step.name ?? `Step ${index + 1}`,
            status,
            output,
            recordedAt: new Date().toISOString(),
          },
          updated_at: new Date().toISOString(),
        },
        { onConflict: "agent_id,scope,key" }
      )
    }

    if (status === "waiting_for_approval") {
      const { error: approvalError } = await input.supabase
        .from("agent_approval")
        .insert({
          agent_id: agent.id,
          run_id: run.id,
          requested_by_run_step_id: stepRow?.id ?? null,
          action_json: {
            stepIndex: index,
            stepName: step.name ?? `Step ${index + 1}`,
            preview: {
              title: step.name ?? `Step ${index + 1}`,
              appName,
              instruction: step.prompt ?? null,
              toolName: compiledTool?.tool_name ?? null,
              connectionId,
            },
            step,
            runInput,
            appName,
            connectionId,
            toolName: compiledTool?.tool_name ?? null,
            approvalPolicy: blueprint.approval_policy ?? null,
          },
          status: "pending",
        })

      if (approvalError) {
        failedStep = step.name ?? `Step ${index + 1}`
        break
      }

      waitingApprovalStep = step.name ?? `Step ${index + 1}`
      break
    }

    if (status === "failed") {
      failedStep = step.name ?? `Step ${index + 1}`
      break
    }
  }

  const finalStatus = waitingApprovalStep
    ? "waiting_for_approval"
    : failedStep
      ? "failed"
      : "succeeded"
  const finalError = failedStep ? `Agent stopped at: ${failedStep}` : null

  const runUpdate: Record<string, unknown> = {
    status: finalStatus,
    output_json: {
      steps: stepOutputs,
      dryRun: !liveToolAttempted,
      message:
        finalStatus === "waiting_for_approval"
          ? "Agent run is waiting for approval."
          : finalStatus === "succeeded" && liveToolAttempted
            ? "Agent run completed with live tool execution."
            : finalStatus === "succeeded"
              ? "Agent run completed in dry-run mode."
              : "Agent run stopped before completing every step.",
    },
    error: finalError,
  }

  if (finalStatus !== "waiting_for_approval") {
    runUpdate.finished_at = new Date().toISOString()
  }

  const { data: updatedRun, error: updateError } = await input.supabase
    .from("agent_run")
    .update(runUpdate)
    .eq("id", run.id)
    .select()
    .single()

  if (updateError || !updatedRun) {
    throw new AgentRuntimeError("Unable to update agent run.")
  }

  if (finalStatus === "succeeded") {
    await input.supabase.from("agent_memory").upsert(
      {
        agent_id: agent.id,
        scope: "runtime",
        key: "last_successful_run",
        value_json: {
          runId: updatedRun.id,
          completedAt: new Date().toISOString(),
          steps: stepOutputs.map((step) => ({
            stepIndex: step.stepIndex,
            stepName: step.stepName,
            status: step.status,
          })),
        },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "agent_id,scope,key" }
    )
  }

  return {
    run: updatedRun,
    summary: {
      status: finalStatus,
      durationMs: Date.now() - runStartedAt,
      steps: stepOutputs,
      error: finalError,
    },
  }
}
