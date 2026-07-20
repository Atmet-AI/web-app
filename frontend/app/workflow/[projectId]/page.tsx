"use client"

import Link from "next/link"
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react"
import { useParams } from "next/navigation"
import AIPrompt from "@/components/kokonutui/ai-prompt"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ContextMenu5Wrapper } from "@/components/examples/c-context-menu-5"
import { Badge } from "@/registry/spell-ui/badge"
import { cn } from "@/lib/utils"
import {
  ATMET_APPEARANCE_SETTINGS_CHANGED_EVENT,
  ATMET_APPEARANCE_SETTINGS_STORAGE_KEY,
  readPlaygroundDotsEnabled,
} from "@/lib/sound-preferences"
import { useWorkspace } from "@/lib/workspace-context"
import { listIntegrations } from "@/lib/integrations-store"
import {
  getWorkflowProject,
  type WorkflowProject,
} from "@/lib/workflow-projects"
import {
  WORKFLOW_OPEN_LOG_EVENT,
  WORKFLOW_PUBLISH_EVENT,
  WORKFLOW_RUN_EVENT,
  WORKFLOW_SET_AUTORUN_EVENT,
  WORKFLOW_STATE_EVENT,
  type WorkflowControlEventDetail,
  type WorkflowRunSchedule,
  type WorkflowSetAutoRunEventDetail,
  type WorkflowStateEventDetail,
} from "@/lib/workflow-events"
import {
  Check,
  Clock3,
  ExternalLink,
  PlayCircle,
  Pencil,
  Plus,
  RefreshCcw,
  X,
  Zap,
} from "lucide-react"

type WorkflowNode = {
  id: string
  nodeType: "Action" | "Trigger"
  stepName: string
  status: "Done" | "In review" | "Pending"
  executionStatus: "idle" | "running" | "success" | "error"
  owner: string
  provider: string
  model: string
  prompt: string
  tokenCount: number
  lastRan: string
  usedApps: string[]
  usedSkills: string[]
  files: string[]
  chatId?: string
  runtimeMs?: number
  x: number
  y: number
}

type WorkflowPlannerNode = {
  type: "trigger" | "action"
  name: string
  app: string
  provider?: string
  prompt: string
  runtimeMs: number
  triggerSlug?: string | null
  actions: Array<{
    name: string
    prompt: string
    runtimeMs: number
  }>
}

type ComposioTriggerRegistration = {
  slug: string
  appLabel: string
  triggerSlug: string
  triggerConfig: Record<string, unknown>
}

type AppearanceSettingsChangedDetail = {
  playgroundDotsEnabled?: unknown
}

const WORKFLOW_INTEGRATIONS = listIntegrations()
const ATMET_APP_LOGO_SRC = "/Logos/Favicon%20Atmet.png"

function normalizeAppLookup(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "")
}

function getAppInitials(value: string) {
  const initials = value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("")

  return initials || "A"
}

function getWorkflowNodeAppIdentity(node: WorkflowNode) {
  const candidates = [
    node.usedApps[0],
    node.provider,
    node.owner,
    node.model,
  ].filter((value): value is string => Boolean(value?.trim()))
  const normalizedCandidates = candidates.map(normalizeAppLookup)
  const integration = WORKFLOW_INTEGRATIONS.find((entry) => {
    const normalizedName = normalizeAppLookup(entry.name)
    const normalizedSlug = normalizeAppLookup(entry.slug)
    return normalizedCandidates.some(
      (candidate) =>
        candidate === normalizedName ||
        candidate === normalizedSlug ||
        normalizedName.includes(candidate) ||
        candidate.includes(normalizedName)
    )
  })
  const fallbackName = candidates[0] ?? "Atmet"
  const isAtmet = normalizeAppLookup(fallbackName) === "atmet"

  return {
    name: integration?.name ?? fallbackName,
    logo: integration?.logo ?? (isAtmet ? ATMET_APP_LOGO_SRC : null),
    initials: getAppInitials(integration?.name ?? fallbackName),
  }
}

type AgentPlanStep = {
  id?: string
  node_id?: string
  action_id?: string
  name?: string
  type?: string
  provider?: string | null
  app?: string | null
  prompt?: string
  runtime_ms?: number
  status?: string
}

type AgentPlanNode = {
  id?: string
  name?: string
  type?: string
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
    runtime_ms?: number
    tool_hint?: string | null
  }>
  status?: string
}

type AgentPlanBlueprint = {
  builderSource?: string
  goal?: string
  trigger?: {
    type?: string
    description?: string
  } | null
  required_apps?: string[]
  nodes?: AgentPlanNode[]
  steps?: AgentPlanStep[]
  approval_policy?: {
    require_approval_for?: string[]
    mode?: string
  }
  missing_inputs?: string[]
  safety_notes?: string[]
}

type AgentPlan = {
  id: string
  name: string
  description: string | null
  goal: string | null
  status: "draft" | "active" | "paused" | "archived"
  instructions: string | null
  blueprint_json: AgentPlanBlueprint | null
  runtime_config_json: Record<string, unknown> | null
  tools?: Array<{
    id: string
    provider: string
    tool_name: string
    connection_id: string | null
    permissions_json: {
      status?: string
      stepName?: string
    } | null
  }>
  triggers?: Array<{
    id: string
    type: string
    provider?: string | null
    event_type?: string | null
    status: string
    external_trigger_id?: string | null
    error?: string | null
    last_received_at?: string | null
    last_run_at?: string | null
    config_json: {
      status?: string
      stepName?: string
      provider?: string | null
      triggerSlug?: string | null
    } | null
  }>
  runs?: Array<{
    id: string
    status:
      | "queued"
      | "running"
      | "waiting_for_approval"
      | "succeeded"
      | "failed"
      | "cancelled"
    queued_at: string | null
    started_at: string | null
    finished_at: string | null
    error: string | null
    input_json?: Record<string, unknown> | null
    output_json?: {
      message?: string
      steps?: Array<unknown>
      dryRun?: boolean
    } | null
    created_at: string
  }>
  approvals?: Array<{
    id: string
    run_id: string | null
    status: "pending" | "approved" | "rejected" | "cancelled"
    action_json: {
      stepIndex?: number
      stepName?: string
      appName?: string | null
      toolName?: string | null
      preview?: {
        title?: string
        appName?: string | null
        instruction?: string | null
        toolName?: string | null
      }
    } | null
    requested_at: string
    resolved_at: string | null
  }>
  memory?: Array<{
    id: string
    scope: string
    key: string
    value_json: Record<string, unknown> | null
    updated_at: string
  }>
}

const COMPOSIO_TRIGGER_APPS = [
  { provider: "Gmail", slug: "gmail", prefix: "GMAIL_", appLabel: "Gmail" },
  {
    provider: "Google Calendar",
    slug: "google-calendar",
    prefix: "GOOGLECALENDAR_",
    appLabel: "Google Calendar",
  },
  {
    provider: "Google Drive",
    slug: "google-drive",
    prefix: "GOOGLEDRIVE_",
    appLabel: "Google Drive",
  },
  {
    provider: "Google Sheets",
    slug: "google-sheets",
    prefix: "GOOGLESHEETS_",
    appLabel: "Google Sheets",
  },
  {
    provider: "Google Docs",
    slug: "google-docs",
    prefix: "GOOGLEDOCS_",
    appLabel: "Google Docs",
  },
  { provider: "GitHub", slug: "github", prefix: "GITHUB_", appLabel: "GitHub" },
] as const

function getDefaultComposioTriggerConfig(
  triggerSlug: string
): Record<string, unknown> {
  if (triggerSlug.startsWith("GMAIL_")) {
    return { userId: "me", labelIds: "INBOX", interval: 2 }
  }

  if (triggerSlug.startsWith("GOOGLECALENDAR_")) {
    return { calendarId: "primary", interval: 2 }
  }

  if (triggerSlug.startsWith("GOOGLEDRIVE_")) {
    return { interval: 2, max_results: 10, include_items_from_all_drives: true }
  }

  if (triggerSlug.startsWith("GOOGLESHEETS_")) {
    return {
      interval: 2,
      max_results: 10,
      include_shared_drives: true,
      query: "",
    }
  }

  if (triggerSlug.startsWith("GOOGLEDOCS_")) {
    return {
      interval: 2,
      max_results: 10,
      include_shared_drives: true,
      query: "",
    }
  }

  if (triggerSlug.startsWith("GITHUB_")) {
    return { interval: 2 }
  }

  return { interval: 2 }
}

function getComposioTriggerRegistration(
  node: WorkflowNode
): ComposioTriggerRegistration | null {
  if (node.nodeType !== "Trigger") return null

  const app = COMPOSIO_TRIGGER_APPS.find(
    (entry) =>
      node.provider === entry.provider && node.model.startsWith(entry.prefix)
  )
  if (!app) return null

  return {
    slug: app.slug,
    appLabel: app.appLabel,
    triggerSlug: node.model,
    triggerConfig: getDefaultComposioTriggerConfig(node.model),
  }
}

type WorkflowEdge = {
  id: string
  sourceId: string
  targetId: string
  sourceHandle?: AnchorSide
  targetHandle?: AnchorSide
}

type EdgeGeometry = WorkflowEdge & {
  path: string
  fromX: number
  fromY: number
  toX: number
  toY: number
  midX: number
  midY: number
}

type WorkflowSnapshot = {
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  selectedNodeId: string
}

type TelegramAgentBlueprint = {
  kind?: string
  agentName?: string
  channel?: {
    bot?: string | null
    avatarUrl?: string | null
    connectionName?: string | null
    webhookUrl?: string
    webhookPath?: string
  }
  brain?: {
    mode?: "atmet" | "agent_api"
    agentApiUrl?: string | null
  }
  behavior?: {
    instructions?: string
    autoReply?: boolean
    handoffMessage?: string | null
  }
}

type TelegramWebhookStatus = {
  bot: string | null
  botLink: string | null
  expectedWebhookUrl: string
  currentWebhookUrl: string | null
  webhookConfigured: boolean
  pendingUpdateCount: number
  lastErrorMessage: string | null
}

type AnchorSide = "top" | "right" | "bottom" | "left"

const NODE_WIDTH = 320
const DEFAULT_NODE_HEIGHT = 116
const CANVAS_GRID_STEP = 12
const WIRE_GRID_STEP = CANVAS_GRID_STEP
const WORKSPACE_WIDTH = 10000
const WORKSPACE_HEIGHT = 7000
const WORKSPACE_OFFSET_X = 2200
const WORKSPACE_OFFSET_Y = 1400
const EXECUTION_STATUS_META: Record<
  WorkflowNode["executionStatus"],
  { label: string; dotClass: string; borderClass: string }
> = {
  idle: {
    label: "Idle",
    dotClass: "bg-muted-foreground/45",
    borderClass: "border-border/80",
  },
  running: {
    label: "Running",
    dotClass: "bg-sky-500 animate-pulse",
    borderClass: "border-sky-300 dark:border-sky-500/65",
  },
  success: {
    label: "Success",
    dotClass: "bg-emerald-500",
    borderClass: "border-emerald-300 dark:border-emerald-500/65",
  },
  error: {
    label: "Error",
    dotClass: "bg-red-500",
    borderClass: "border-red-300 dark:border-red-500/65",
  },
}

function snapToGrid(value: number, step: number) {
  return Math.round(value / step) * step
}

function snapCanvasCoord(value: number) {
  return Math.max(CANVAS_GRID_STEP, snapToGrid(value, CANVAS_GRID_STEP))
}

function getHandleVector(side: AnchorSide) {
  if (side === "top") return { dx: 0, dy: -1 }
  if (side === "bottom") return { dx: 0, dy: 1 }
  if (side === "left") return { dx: -1, dy: 0 }
  return { dx: 1, dy: 0 }
}

function getEdgeSourceHandle(edge: WorkflowEdge): AnchorSide {
  return edge.sourceHandle ?? "bottom"
}

function getEdgeTargetHandle(edge: WorkflowEdge): AnchorSide {
  return edge.targetHandle ?? "top"
}

function getOppositeHandle(side: AnchorSide): AnchorSide {
  if (side === "top") return "bottom"
  if (side === "bottom") return "top"
  if (side === "left") return "right"
  return "left"
}

function getNodeAnchorPoint(
  node: WorkflowNode,
  nodeHeight: number,
  side: AnchorSide
) {
  if (side === "top") {
    return { x: node.x + NODE_WIDTH / 2, y: node.y }
  }
  if (side === "bottom") {
    return { x: node.x + NODE_WIDTH / 2, y: node.y + nodeHeight }
  }
  if (side === "left") {
    return { x: node.x, y: node.y + nodeHeight / 2 }
  }
  return { x: node.x + NODE_WIDTH, y: node.y + nodeHeight / 2 }
}

function getOrthogonalWirePath(
  fromX: number,
  fromY: number,
  fromSide: AnchorSide,
  toX: number,
  toY: number,
  toSide: AnchorSide
) {
  const fromVector = getHandleVector(fromSide)
  const toVector = getHandleVector(toSide)

  // Keep perfectly aligned vertical/horizontal links fully straight.
  if (
    fromVector.dx === 0 &&
    toVector.dx === 0 &&
    Math.abs(fromX - toX) < 0.01
  ) {
    const topY = Math.min(fromY, toY)
    const bottomY = Math.max(fromY, toY)
    return {
      path: `M ${fromX} ${topY} L ${fromX} ${bottomY}`,
      midX: fromX,
      midY: (topY + bottomY) / 2,
    }
  }
  if (
    fromVector.dy === 0 &&
    toVector.dy === 0 &&
    Math.abs(fromY - toY) < 0.01
  ) {
    const leftX = Math.min(fromX, toX)
    const rightX = Math.max(fromX, toX)
    return {
      path: `M ${leftX} ${fromY} L ${rightX} ${fromY}`,
      midX: (leftX + rightX) / 2,
      midY: fromY,
    }
  }

  const startStub = {
    x:
      fromVector.dx === 0
        ? fromX
        : snapToGrid(fromX + fromVector.dx * WIRE_GRID_STEP, WIRE_GRID_STEP),
    y:
      fromVector.dy === 0
        ? fromY
        : snapToGrid(fromY + fromVector.dy * WIRE_GRID_STEP, WIRE_GRID_STEP),
  }
  const endStub = {
    x:
      toVector.dx === 0
        ? toX
        : snapToGrid(toX + toVector.dx * WIRE_GRID_STEP, WIRE_GRID_STEP),
    y:
      toVector.dy === 0
        ? toY
        : snapToGrid(toY + toVector.dy * WIRE_GRID_STEP, WIRE_GRID_STEP),
  }

  const points: Array<{ x: number; y: number }> = [
    { x: fromX, y: fromY },
    startStub,
    ...(fromSide === "left" || fromSide === "right"
      ? [
          {
            x: snapToGrid((startStub.x + endStub.x) / 2, WIRE_GRID_STEP),
            y: startStub.y,
          },
          {
            x: snapToGrid((startStub.x + endStub.x) / 2, WIRE_GRID_STEP),
            y: endStub.y,
          },
        ]
      : [
          {
            x: startStub.x,
            y: snapToGrid((startStub.y + endStub.y) / 2, WIRE_GRID_STEP),
          },
          {
            x: endStub.x,
            y: snapToGrid((startStub.y + endStub.y) / 2, WIRE_GRID_STEP),
          },
        ]),
    endStub,
    { x: toX, y: toY },
  ]

  const dedupedPoints = points.filter((point, index, collection) => {
    if (index === 0) return true
    const previous = collection[index - 1]
    return previous.x !== point.x || previous.y !== point.y
  })

  const path = dedupedPoints
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ")

  const segmentLengths = dedupedPoints.slice(0, -1).map((point, index) => {
    const next = dedupedPoints[index + 1]
    return Math.abs(next.x - point.x) + Math.abs(next.y - point.y)
  })
  const total = segmentLengths.reduce((sum, length) => sum + length, 0)
  const half = total / 2

  let midX = dedupedPoints[0]?.x ?? fromX
  let midY = dedupedPoints[0]?.y ?? fromY
  let traversed = 0

  for (let i = 0; i < segmentLengths.length; i += 1) {
    const length = segmentLengths[i] ?? 0
    const start = dedupedPoints[i]
    const end = dedupedPoints[i + 1]
    if (!start || !end) continue

    if (traversed + length >= half) {
      const remaining = half - traversed
      if (start.x === end.x) {
        midX = start.x
        midY = start.y + (end.y > start.y ? remaining : -remaining)
      } else {
        midX = start.x + (end.x > start.x ? remaining : -remaining)
        midY = start.y
      }
      break
    }
    traversed += length
  }

  return { path, midX, midY }
}

function buildNodes(project: WorkflowProject): WorkflowNode[] {
  return project.steps.map((step, index) => ({
    id: `${project.id}-node-${index + 1}`,
    nodeType: step.nodeType ?? "Action",
    stepName: step.name,
    status: step.status,
    executionStatus: "idle",
    owner: step.owner,
    provider: step.provider ?? "",
    model: step.model ?? "",
    prompt: step.prompt ?? "",
    tokenCount: step.tokenCount ?? 0,
    lastRan: "—",
    usedApps: step.usedApps ?? [],
    usedSkills: step.usedSkills ?? [],
    files: step.files ?? [],
    chatId: step.chatId,
    x: snapCanvasCoord(WORKSPACE_OFFSET_X + 110),
    y: snapCanvasCoord(WORKSPACE_OFFSET_Y + 150 + index * 300),
  }))
}

function getRunScheduleIntervalMs(runSchedule: WorkflowRunSchedule) {
  if (runSchedule.mode === "off") return null
  if (runSchedule.mode === "every") {
    const multiplier =
      runSchedule.unit === "minutes"
        ? 1
        : runSchedule.unit === "hours"
          ? 60
          : runSchedule.unit === "days"
            ? 60 * 24
            : runSchedule.unit === "weeks"
              ? 60 * 24 * 7
              : 60 * 24 * 30
    return Math.max(1, runSchedule.value) * multiplier * 60 * 1000
  }
  return null
}

function getTelegramAgentBlueprint(scriptKey: string | null | undefined) {
  if (!scriptKey) return null

  try {
    const parsed = JSON.parse(scriptKey) as TelegramAgentBlueprint
    return parsed.kind === "telegram-agent" ? parsed : null
  } catch {
    return null
  }
}

function getStepsFromAutomationBlueprint(scriptKey: string | null | undefined) {
  if (!scriptKey) return null

  const telegramBlueprint = getTelegramAgentBlueprint(scriptKey)
  if (telegramBlueprint) {
    const brainLabel =
      telegramBlueprint.brain?.mode === "agent_api"
        ? "Agent API"
        : "Atmet model"
    return [
      {
        name: telegramBlueprint.agentName ?? "Telegram agent",
        status: "Done" as const,
        nodeType: "Action" as const,
        owner: "Atmet",
        provider: brainLabel,
        model: brainLabel,
        prompt:
          telegramBlueprint.behavior?.instructions ??
          "Generate a helpful reply and send it back through Telegram.",
        usedApps: ["Telegram"],
        usedSkills: ["Customer agent"],
      },
    ]
  }

  try {
    const parsed = JSON.parse(scriptKey) as {
      source?: string
      steps?: WorkflowProject["steps"]
    }

    if (parsed.source !== "chat-agent" || !Array.isArray(parsed.steps)) {
      return null
    }

    const steps = parsed.steps.filter(
      (step) =>
        step &&
        typeof step.name === "string" &&
        (step.status === "Done" ||
          step.status === "In review" ||
          step.status === "Pending") &&
        typeof step.owner === "string"
    )

    return steps.length > 0 ? steps : null
  } catch {
    return null
  }
}

function getStepsFromAgentPlan(agent: AgentPlan | null) {
  const nodes = getNodesFromAgentPlan(agent)
  if (nodes.length > 0) {
    return nodes.map((node, index) => {
      const isTrigger = node.type === "trigger"
      const status =
        agent?.status === "active"
          ? "Done"
          : node.status === "ready"
            ? "Pending"
            : "In review"

      return {
        name: node.name || `Node ${index + 1}`,
        status: status as "Done" | "In review" | "Pending",
        nodeType: isTrigger ? ("Trigger" as const) : ("Action" as const),
        owner: node.provider || node.app || "Atmet",
        provider: node.provider || node.app || "Atmet",
        model: node.app || node.provider || "",
        prompt: node.prompt || "Agent node generated by Atmet.",
        usedApps: node.app ? [node.app] : [],
        usedSkills: [],
        files: [],
      }
    })
  }

  const steps = agent?.blueprint_json?.steps
  if (!Array.isArray(steps) || steps.length === 0) return null

  return steps.map((step, index) => {
    const isTrigger = step.type === "trigger"
    const status =
      agent?.status === "active"
        ? "Done"
        : step.status === "ready"
          ? "Pending"
          : "In review"

    return {
      name: step.name || `Step ${index + 1}`,
      status: status as "Done" | "In review" | "Pending",
      nodeType: isTrigger ? ("Trigger" as const) : ("Action" as const),
      owner: step.provider || step.app || "Atmet",
      provider: step.provider || step.app || "Atmet",
      model: step.app || step.provider || "",
      prompt: step.prompt || "Agent step generated by Atmet.",
      usedApps: step.app ? [step.app] : [],
      usedSkills: [],
      files: [],
    }
  })
}

function getNodesFromAgentPlan(agent: AgentPlan | null): AgentPlanNode[] {
  const nodes = agent?.blueprint_json?.nodes
  if (Array.isArray(nodes) && nodes.length > 0) return nodes

  const steps = agent?.blueprint_json?.steps
  if (!Array.isArray(steps) || steps.length === 0) return []

  return steps.map((step, index) => ({
    id: step.node_id ?? `node-${index + 1}`,
    name: step.name ?? `Node ${index + 1}`,
    type: step.type === "trigger" ? "trigger" : "action",
    provider: step.provider ?? step.app ?? null,
    app: step.app ?? step.provider ?? null,
    trigger_slug: step.type === "trigger" ? null : undefined,
    prompt: step.prompt,
    runtime: {
      expected_ms: step.runtime_ms ?? (step.type === "trigger" ? 5000 : 30000),
      timeout_ms: Math.max(
        60000,
        (step.runtime_ms ?? (step.type === "trigger" ? 5000 : 30000)) * 3
      ),
    },
    actions: [
      {
        id: step.action_id ?? `action-${index + 1}`,
        name: step.name ?? `Action ${index + 1}`,
        prompt: step.prompt,
        runtime_ms: step.runtime_ms,
      },
    ],
    status: step.status,
  }))
}

function formatRuntimeMs(value: number | undefined) {
  if (!value || value <= 0) return null
  if (value < 1000) return `${value}ms`
  const seconds = Math.round(value / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.round(seconds / 60)
  return `${minutes}m`
}

function formatAgentMemoryValue(value: Record<string, unknown> | null) {
  if (!value) return "Empty"
  const text = JSON.stringify(value)
  return text.length > 140 ? `${text.slice(0, 140)}...` : text
}

function getAgentRunSummary(run: NonNullable<AgentPlan["runs"]>[number]) {
  const message = run.output_json?.message
  const stepCount = run.output_json?.steps?.length ?? 0
  if (message && stepCount > 0) return `${message} · ${stepCount} steps`
  if (message) return message
  if (stepCount > 0) return `${stepCount} steps recorded`
  return null
}

export default function WorkflowProjectPage() {
  const { apiFetch } = useWorkspace()
  const params = useParams<{ projectId: string }>()
  const projectId = Array.isArray(params?.projectId)
    ? params.projectId[0]
    : params?.projectId
  const [appearanceUserKey, setAppearanceUserKey] = useState<string | null>(
    null
  )
  const [showPlaygroundDots, setShowPlaygroundDots] = useState(false)

  const fixtureProject = useMemo(
    () => (projectId ? getWorkflowProject(projectId) : undefined),
    [projectId]
  )
  const [databaseProject, setDatabaseProject] =
    useState<WorkflowProject | null>(null)
  const [agentPlan, setAgentPlan] = useState<AgentPlan | null>(null)
  const [telegramAgentBlueprint, setTelegramAgentBlueprint] =
    useState<TelegramAgentBlueprint | null>(null)
  const [telegramWebhookStatus, setTelegramWebhookStatus] =
    useState<TelegramWebhookStatus | null>(null)
  const [telegramWebhookError, setTelegramWebhookError] = useState<
    string | null
  >(null)
  const [isTelegramWebhookLoading, setIsTelegramWebhookLoading] =
    useState(false)
  const [isActivatingTelegramWebhook, setIsActivatingTelegramWebhook] =
    useState(false)
  const [composioTriggerError, setComposioTriggerError] = useState<
    string | null
  >(null)
  const [isActivatingComposioTrigger, setIsActivatingComposioTrigger] =
    useState(false)
  const [isCompilingAgent, setIsCompilingAgent] = useState(false)
  const [isActivatingAgentTriggers, setIsActivatingAgentTriggers] =
    useState(false)
  const [isTestingAgentEvent, setIsTestingAgentEvent] = useState(false)
  const [resolvingApprovalId, setResolvingApprovalId] = useState<string | null>(
    null
  )
  const [agentCompileError, setAgentCompileError] = useState<string | null>(
    null
  )
  const [isLoadingProject, setIsLoadingProject] = useState(false)
  const project = fixtureProject ?? databaseProject

  useEffect(() => {
    let isCancelled = false

    apiFetch("/api/users/me")
      .then((response) => response.json().catch(() => null))
      .then(
        (
          payload:
            | {
                data?: {
                  user?: {
                    id?: string | null
                    email?: string | null
                  } | null
                }
              }
            | null
        ) => {
          if (isCancelled) return
          const user = payload?.data?.user
          setAppearanceUserKey(user?.id ?? user?.email ?? null)
        }
      )
      .catch(() => {
        if (!isCancelled) setAppearanceUserKey(null)
      })

    return () => {
      isCancelled = true
    }
  }, [apiFetch])

  useEffect(() => {
    if (typeof window === "undefined") return

    const readPreference = () => {
      setShowPlaygroundDots(readPlaygroundDotsEnabled(appearanceUserKey))
    }

    readPreference()

    const handleAppearanceSettingsChanged = (event: Event) => {
      const detail = (event as CustomEvent<AppearanceSettingsChangedDetail>)
        .detail
      if (typeof detail?.playgroundDotsEnabled === "boolean") {
        setShowPlaygroundDots(detail.playgroundDotsEnabled)
        return
      }
      readPreference()
    }

    const handleStorage = (event: StorageEvent) => {
      if (
        event.key &&
        !event.key.startsWith(ATMET_APPEARANCE_SETTINGS_STORAGE_KEY)
      ) {
        return
      }
      readPreference()
    }

    window.addEventListener(
      ATMET_APPEARANCE_SETTINGS_CHANGED_EVENT,
      handleAppearanceSettingsChanged
    )
    window.addEventListener("storage", handleStorage)

    return () => {
      window.removeEventListener(
        ATMET_APPEARANCE_SETTINGS_CHANGED_EVENT,
        handleAppearanceSettingsChanged
      )
      window.removeEventListener("storage", handleStorage)
    }
  }, [appearanceUserKey])

  const [nodes, setNodes] = useState<WorkflowNode[]>([])
  const [edges, setEdges] = useState<WorkflowEdge[]>([])
  const [selectedNodeId, setSelectedNodeId] = useState<string>("")
  const [connectingSourceId, setConnectingSourceId] = useState<string | null>(
    null
  )
  const [connectingSourceHandle, setConnectingSourceHandle] =
    useState<AnchorSide | null>(null)
  const [wireCursor, setWireCursor] = useState<{ x: number; y: number } | null>(
    null
  )
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null)
  const [filesDialogOpen, setFilesDialogOpen] = useState(false)
  const [agentEditorOpen, setAgentEditorOpen] = useState(false)
  const [isSavingAgentPlan, setIsSavingAgentPlan] = useState(false)
  const [agentEditorDraft, setAgentEditorDraft] = useState({
    name: "",
    description: "",
    goal: "",
    instructions: "",
    status: "draft" as AgentPlan["status"],
    approvalMode: "design_time",
    approvalRules: "",
  })
  const [executionLogOpen, setExecutionLogOpen] = useState(false)
  const [editingTitleNodeId, setEditingTitleNodeId] = useState<string | null>(
    null
  )
  const [titleDraft, setTitleDraft] = useState("")
  const [copiedNode, setCopiedNode] = useState<WorkflowNode | null>(null)
  const [historyPast, setHistoryPast] = useState<WorkflowSnapshot[]>([])
  const [historyFuture, setHistoryFuture] = useState<WorkflowSnapshot[]>([])
  const [contextMenuPoint, setContextMenuPoint] = useState<{
    x: number
    y: number
  } | null>(null)
  const [zoom, setZoom] = useState(1)
  const [isSpacePressed, setIsSpacePressed] = useState(false)
  const [isPanning, setIsPanning] = useState(false)
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null)
  const [isRunningWorkflow, setIsRunningWorkflow] = useState(false)
  const [isPublishingWorkflow, setIsPublishingWorkflow] = useState(false)
  const [publishState, setPublishState] = useState<"Draft" | "Published">(
    "Draft"
  )
  const [hasUnpublishedChanges, setHasUnpublishedChanges] = useState(false)
  const [lastExecutionLabel, setLastExecutionLabel] = useState("Not run yet")
  const [activeChatNodeId, setActiveChatNodeId] = useState<string>("")
  const [mountedChatNodeIds, setMountedChatNodeIds] = useState<string[]>([])
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [runSchedule, setRunSchedule] = useState<WorkflowRunSchedule>({
    mode: "off",
  })
  const [nodeHeights, setNodeHeights] = useState<Record<string, number>>({})
  const viewportRef = useRef<HTMLElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const edgeHoverTimeoutRef = useRef<number | null>(null)
  const runTimerRef = useRef<number | null>(null)
  const publishTimerRef = useRef<number | null>(null)
  const autoRunIntervalRef = useRef<number | null>(null)
  const autoRunTimeoutRef = useRef<number | null>(null)
  const focusAnimationFrameRef = useRef<number | null>(null)
  const nodesRef = useRef<WorkflowNode[]>([])
  const edgesRef = useRef<WorkflowEdge[]>([])
  const selectedNodeIdRef = useRef("")
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const panStateRef = useRef<{
    startClientX: number
    startClientY: number
    startScrollLeft: number
    startScrollTop: number
  } | null>(null)
  const dragStateRef = useRef<{
    nodeId: string
    pointerOffsetX: number
    pointerOffsetY: number
  } | null>(null)
  const pointerCanvasPointRef = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    if (!projectId || fixtureProject) {
      setDatabaseProject(null)
      setAgentPlan(null)
      setTelegramAgentBlueprint(null)
      setTelegramWebhookStatus(null)
      setTelegramWebhookError(null)
      setComposioTriggerError(null)
      setIsLoadingProject(false)
      return
    }

    setIsLoadingProject(true)
    apiFetch(`/api/automations/${projectId}`)
      .then((response) => (response.ok ? response.json() : null))
      .then(
        (
          payload: {
            data?: {
              automation?: {
                id: string
                name: string
                description: string | null
                status: "active" | "inactive" | "draft"
                created_by: string
                script_key: string | null
              }
              agent?: AgentPlan | null
            }
          } | null
        ) => {
          const automation = payload?.data?.automation
          const agent = payload?.data?.agent ?? null
          if (!automation) {
            setDatabaseProject(null)
            setAgentPlan(null)
            setTelegramAgentBlueprint(null)
            setTelegramWebhookStatus(null)
            setComposioTriggerError(null)
            return
          }

          const telegramBlueprint = getTelegramAgentBlueprint(
            automation.script_key
          )
          setAgentPlan(agent)
          const blueprintSteps = getStepsFromAutomationBlueprint(
            automation.script_key
          )
          const agentPlanSteps = getStepsFromAgentPlan(agent)
          setTelegramAgentBlueprint(telegramBlueprint)

          setDatabaseProject({
            id: automation.id,
            title: agent?.name ?? automation.name,
            description: agent?.description ?? automation.description ?? "",
            icon: "checklist",
            tags: [agent?.status ?? automation.status],
            members: [
              {
                name: "Agent owner",
                initials: "AO",
                tone: "bg-cyan-100 text-cyan-700",
              },
            ],
            steps: agentPlanSteps ?? blueprintSteps ?? [
              {
                name: agent?.name ?? automation.name,
                status:
                  (agent?.status ?? automation.status) === "active"
                    ? "Done"
                    : (agent?.status ?? automation.status) === "draft"
                      ? "In review"
                      : "Pending",
                owner: "Agent owner",
              },
            ],
          })
        }
      )
      .catch(() => {
        setDatabaseProject(null)
        setAgentPlan(null)
        setTelegramAgentBlueprint(null)
        setTelegramWebhookStatus(null)
        setComposioTriggerError(null)
      })
      .finally(() => setIsLoadingProject(false))
  }, [apiFetch, fixtureProject, projectId])

  const setNodeHeightRef = useCallback(
    (nodeId: string, element: HTMLDivElement | null) => {
      if (!element) return
      const measuredHeight = element.offsetHeight
      setNodeHeights((previous) =>
        previous[nodeId] === measuredHeight
          ? previous
          : { ...previous, [nodeId]: measuredHeight }
      )
    },
    []
  )

  useEffect(() => {
    if (!project) return
    const initialNodes = buildNodes(project)
    const initialEdges = initialNodes.slice(0, -1).map((node, index) => ({
      id: `${node.id}:bottom->${initialNodes[index + 1]?.id}:top`,
      sourceId: node.id,
      targetId: initialNodes[index + 1]?.id ?? "",
      sourceHandle: "bottom" as AnchorSide,
      targetHandle: "top" as AnchorSide,
    }))
    setNodes(initialNodes)
    setEdges(initialEdges.filter((edge) => edge.targetId.length > 0))
    setSelectedNodeId(initialNodes[0]?.id ?? "")
    setConnectingSourceId(null)
    setConnectingSourceHandle(null)
    setWireCursor(null)
    setHoveredNodeId(null)
    setHoveredEdgeId(null)
    setFilesDialogOpen(false)
    setExecutionLogOpen(false)
    setEditingTitleNodeId(null)
    setTitleDraft("")
    setCopiedNode(null)
    setHistoryPast([])
    setHistoryFuture([])
    setContextMenuPoint(null)
    setZoom(1)
    setIsSpacePressed(false)
    setIsPanning(false)
    setIsRunningWorkflow(false)
    setIsPublishingWorkflow(false)
    setIsCompilingAgent(false)
    setAgentCompileError(null)
    setPublishState("Draft")
    setHasUnpublishedChanges(false)
    setLastExecutionLabel("Not run yet")
    setActiveChatNodeId(initialNodes[0]?.id ?? "")
    setMountedChatNodeIds(initialNodes[0] ? [initialNodes[0].id] : [])
    setIsChatOpen(Boolean(initialNodes[0]))
    setRunSchedule({ mode: "off" })

    window.requestAnimationFrame(() => {
      const viewport = viewportRef.current
      if (!viewport || initialNodes.length === 0) return

      const firstNode = initialNodes[0]
      if (!firstNode) return
      const targetCenterX = firstNode.x + NODE_WIDTH / 2
      const targetCenterY = firstNode.y + DEFAULT_NODE_HEIGHT / 2

      viewport.scrollLeft = Math.max(
        0,
        targetCenterX - viewport.clientWidth / 2
      )
      viewport.scrollTop = Math.max(
        0,
        targetCenterY - viewport.clientHeight / 2
      )
    })
  }, [project])

  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedNodeId),
    [nodes, selectedNodeId]
  )
  const activeChatNode = useMemo(
    () => nodes.find((node) => node.id === activeChatNodeId) ?? null,
    [activeChatNodeId, nodes]
  )
  const hasSelectedNode = Boolean(selectedNode)
  const canPaste = Boolean(copiedNode)
  const canUndo = historyPast.length > 0
  const canRedo = historyFuture.length > 0
  const showTelegramAgentPanel = Boolean(telegramAgentBlueprint && selectedNode)
  const showAgentPlanPanel = Boolean(agentPlan && !telegramAgentBlueprint)
  const agentBlueprint = agentPlan?.blueprint_json
  const agentBlueprintNodes = getNodesFromAgentPlan(agentPlan)
  const hasCompiledAgentTools = (agentPlan?.tools?.length ?? 0) > 0
  const hasAgentAppTriggers =
    (agentPlan?.triggers?.some((trigger) => trigger.type === "app_event") ??
      false)
  const compiledAgentToolCount =
    typeof agentPlan?.runtime_config_json?.compiledToolCount === "number"
      ? agentPlan.runtime_config_json.compiledToolCount
      : 0
  const toolCompileFallbacks = Array.isArray(
    agentPlan?.runtime_config_json?.toolCompileFallbacks
  )
    ? agentPlan.runtime_config_json.toolCompileFallbacks
    : []
  const pendingAgentApprovals =
    agentPlan?.approvals?.filter((approval) => approval.status === "pending") ??
    []
  const resolvedAgentApprovals =
    agentPlan?.approvals?.filter((approval) => approval.status !== "pending") ??
    []
  const refreshAgentPlan = useCallback(async () => {
    if (!projectId || !agentPlan) return
    const response = await apiFetch(`/api/automations/${projectId}`)
    const payload = (await response.json()) as {
      data?: { agent?: AgentPlan | null }
    }
    if (response.ok && payload.data?.agent) {
      setAgentPlan(payload.data.agent)
    }
  }, [agentPlan, apiFetch, projectId])
  const openAgentEditor = useCallback(() => {
    if (!agentPlan) return
    setAgentEditorDraft({
      name: agentPlan.name,
      description: agentPlan.description ?? "",
      goal: agentPlan.goal ?? "",
      instructions: agentPlan.instructions ?? "",
      status: agentPlan.status,
      approvalMode:
        agentPlan.blueprint_json?.approval_policy?.mode ?? "design_time",
      approvalRules: (
        agentPlan.blueprint_json?.approval_policy?.require_approval_for ?? []
      ).join("\n"),
    })
    setAgentEditorOpen(true)
  }, [agentPlan])
  const handleSaveAgentPlan = useCallback(async () => {
    if (!agentPlan || isSavingAgentPlan) return

    setIsSavingAgentPlan(true)
    setAgentCompileError(null)
    try {
      const response = await apiFetch(`/api/agents/${agentPlan.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: agentEditorDraft.name,
          description: agentEditorDraft.description || null,
          goal: agentEditorDraft.goal || null,
          instructions: agentEditorDraft.instructions || null,
          status: agentEditorDraft.status,
          blueprint_json: {
            ...(agentPlan.blueprint_json ?? {}),
            approval_policy: {
              ...(agentPlan.blueprint_json?.approval_policy ?? {}),
              mode: agentEditorDraft.approvalMode,
              require_approval_for: agentEditorDraft.approvalRules
                .split("\n")
                .map((item) => item.trim())
                .filter(Boolean),
            },
          },
        }),
      })
      const payload = (await response.json()) as {
        error?: { message?: string }
      }

      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Unable to save agent.")
      }

      await refreshAgentPlan()
      setAgentEditorOpen(false)
      setLastExecutionLabel("Agent updated")
    } catch (error) {
      setAgentCompileError(
        error instanceof Error ? error.message : "Unable to save agent."
      )
    } finally {
      setIsSavingAgentPlan(false)
    }
  }, [
    agentEditorDraft,
    agentPlan,
    apiFetch,
    isSavingAgentPlan,
    refreshAgentPlan,
  ])
  const handleCompileAgent = useCallback(async () => {
    if (!agentPlan || isCompilingAgent) return

    setIsCompilingAgent(true)
    setAgentCompileError(null)
    try {
      const response = await apiFetch(`/api/agents/${agentPlan.id}/compile`, {
        method: "POST",
      })
      const payload = (await response.json()) as {
        data?: {
          compiled?: {
            tools: number
            triggers: number
            missingConnections: string[]
          }
        }
        error?: { message?: string }
      }

      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Unable to compile agent.")
      }

      await refreshAgentPlan()
      const missing = payload.data?.compiled?.missingConnections ?? []
      setLastExecutionLabel(
        missing.length > 0
          ? `Compiled · missing ${missing.join(", ")}`
          : "Compiled and ready"
      )
    } catch (error) {
      setAgentCompileError(
        error instanceof Error ? error.message : "Unable to compile agent."
      )
    } finally {
      setIsCompilingAgent(false)
    }
  }, [agentPlan, apiFetch, isCompilingAgent, refreshAgentPlan])
  const handleActivateAgentTriggers = useCallback(async () => {
    if (!agentPlan || isActivatingAgentTriggers) return

    setIsActivatingAgentTriggers(true)
    setAgentCompileError(null)
    try {
      const response = await apiFetch(
        `/api/agents/${agentPlan.id}/triggers/activate`,
        {
          method: "POST",
        }
      )
      const payload = (await response.json()) as {
        data?: {
          activated?: Array<Record<string, unknown>>
          failed?: Array<{ error?: string }>
        }
        error?: { message?: string }
      }

      if (!response.ok) {
        throw new Error(
          payload.error?.message ?? "Unable to activate agent triggers."
        )
      }

      await refreshAgentPlan()
      const activatedCount = payload.data?.activated?.length ?? 0
      const failed = payload.data?.failed ?? []
      setLastExecutionLabel(
        failed.length > 0
          ? `Triggers partial · ${failed[0]?.error ?? "needs attention"}`
          : `Triggers active · ${activatedCount}`
      )
    } catch (error) {
      setAgentCompileError(
        error instanceof Error
          ? error.message
          : "Unable to activate agent triggers."
      )
    } finally {
      setIsActivatingAgentTriggers(false)
    }
  }, [
    agentPlan,
    apiFetch,
    isActivatingAgentTriggers,
    refreshAgentPlan,
  ])
  const handleTestAgentEvent = useCallback(async () => {
    if (!agentPlan || isTestingAgentEvent) return

    setIsTestingAgentEvent(true)
    setAgentCompileError(null)
    try {
      const response = await apiFetch(`/api/agents/${agentPlan.id}/test-event`, {
        method: "POST",
      })
      const payload = (await response.json()) as {
        data?: {
          result?: {
            summary?: {
              status?: string
            }
          }
        }
        error?: { message?: string }
      }

      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Unable to run test event.")
      }

      await refreshAgentPlan()
      setLastExecutionLabel(
        `Test event · ${payload.data?.result?.summary?.status ?? "created"}`
      )
    } catch (error) {
      setAgentCompileError(
        error instanceof Error ? error.message : "Unable to run test event."
      )
    } finally {
      setIsTestingAgentEvent(false)
    }
  }, [agentPlan, apiFetch, isTestingAgentEvent, refreshAgentPlan])
  const handleResolveAgentApproval = useCallback(
    async (approvalId: string, status: "approved" | "rejected") => {
      if (!agentPlan || resolvingApprovalId) return

      setResolvingApprovalId(approvalId)
      setAgentCompileError(null)
      try {
        const response = await apiFetch(
          `/api/agents/${agentPlan.id}/approvals/${approvalId}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
          }
        )
        const payload = (await response.json()) as {
          data?: { resumed?: boolean }
          error?: { message?: string }
        }

        if (!response.ok) {
          throw new Error(
            payload.error?.message ?? "Unable to resolve approval."
          )
        }

        await refreshAgentPlan()
        setLastExecutionLabel(
          status === "approved"
            ? payload.data?.resumed
              ? "Approved and resumed"
              : "Approved"
            : "Approval rejected"
        )
      } catch (error) {
        setAgentCompileError(
          error instanceof Error ? error.message : "Unable to resolve approval."
        )
      } finally {
        setResolvingApprovalId(null)
      }
    },
    [agentPlan, apiFetch, refreshAgentPlan, resolvingApprovalId]
  )
  const telegramBotLink = useMemo(() => {
    if (telegramWebhookStatus?.botLink) return telegramWebhookStatus.botLink
    const bot =
      telegramWebhookStatus?.bot ?? telegramAgentBlueprint?.channel?.bot
    if (!bot) return null
    const username = bot.replace(/^@/, "").trim()
    return username && projectId
      ? `https://t.me/${username}?start=${encodeURIComponent(projectId)}`
      : username
        ? `https://t.me/${username}`
        : null
  }, [projectId, telegramAgentBlueprint, telegramWebhookStatus])
  const telegramAgentAvatarUrl =
    telegramAgentBlueprint?.channel?.avatarUrl ?? null

  const refreshTelegramWebhookStatus = useCallback(async () => {
    if (!projectId || !telegramAgentBlueprint) return

    setIsTelegramWebhookLoading(true)
    setTelegramWebhookError(null)
    try {
      const response = await apiFetch(
        `/api/automations/${projectId}/telegram/webhook`
      )
      const payload = (await response.json()) as {
        data?: TelegramWebhookStatus
        error?: { message?: string }
      }

      if (!response.ok || !payload.data) {
        throw new Error(
          payload.error?.message ?? "Unable to load Telegram webhook status."
        )
      }

      setTelegramWebhookStatus(payload.data)
    } catch (error) {
      setTelegramWebhookError(
        error instanceof Error
          ? error.message
          : "Unable to load Telegram webhook status."
      )
    } finally {
      setIsTelegramWebhookLoading(false)
    }
  }, [apiFetch, projectId, telegramAgentBlueprint])

  const activateTelegramWebhook = useCallback(async () => {
    if (!projectId || !telegramAgentBlueprint) return

    setIsActivatingTelegramWebhook(true)
    setTelegramWebhookError(null)
    try {
      const response = await apiFetch(
        `/api/automations/${projectId}/telegram/webhook`,
        {
          method: "POST",
        }
      )
      const payload = (await response.json()) as {
        data?: TelegramWebhookStatus
        error?: { message?: string }
      }

      if (!response.ok || !payload.data) {
        throw new Error(
          payload.error?.message ?? "Unable to activate Telegram webhook."
        )
      }

      setTelegramWebhookStatus(payload.data)
    } catch (error) {
      setTelegramWebhookError(
        error instanceof Error
          ? error.message
          : "Unable to activate Telegram webhook."
      )
    } finally {
      setIsActivatingTelegramWebhook(false)
    }
  }, [apiFetch, projectId, telegramAgentBlueprint])

  const activateComposioTriggers = useCallback(
    async (registrations: ComposioTriggerRegistration[]) => {
      if (!projectId || registrations.length === 0) return

      setIsActivatingComposioTrigger(true)
      setComposioTriggerError(null)
      try {
        for (const registration of registrations) {
          const response = await apiFetch(
            `/api/integrations/${registration.slug}/triggers`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                automationId: projectId,
                triggerSlug: registration.triggerSlug,
                triggerConfig: registration.triggerConfig,
              }),
            }
          )
          const payload = (await response.json()) as {
            data?: { composioTriggerId?: string }
            error?: { message?: string }
          }

          if (!response.ok || !payload.data?.composioTriggerId) {
            throw new Error(
              payload.error?.message ??
                `Unable to activate ${registration.appLabel} trigger.`
            )
          }
        }
      } catch (error) {
        setComposioTriggerError(
          error instanceof Error
            ? error.message
            : "Unable to activate Composio trigger."
        )
      } finally {
        setIsActivatingComposioTrigger(false)
      }
    },
    [apiFetch, projectId]
  )

  useEffect(() => {
    if (!telegramAgentBlueprint) return
    void refreshTelegramWebhookStatus()
  }, [refreshTelegramWebhookStatus, telegramAgentBlueprint])

  useEffect(() => {
    if (!isChatOpen) return

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (chatContainerRef.current?.contains(target)) return
      setIsChatOpen(false)
    }

    window.addEventListener("pointerdown", handlePointerDown, true)
    return () =>
      window.removeEventListener("pointerdown", handlePointerDown, true)
  }, [isChatOpen])

  const doneSteps = useMemo(
    () => nodes.filter((node) => node.status === "Done").length,
    [nodes]
  )
  const inReviewSteps = useMemo(
    () => nodes.filter((node) => node.status === "In review").length,
    [nodes]
  )
  const pendingSteps = useMemo(
    () => nodes.filter((node) => node.status === "Pending").length,
    [nodes]
  )
  const idleNodeCount = useMemo(
    () => nodes.filter((node) => node.executionStatus === "idle").length,
    [nodes]
  )
  const runningNodeCount = useMemo(
    () => nodes.filter((node) => node.executionStatus === "running").length,
    [nodes]
  )
  const successNodeCount = useMemo(
    () => nodes.filter((node) => node.executionStatus === "success").length,
    [nodes]
  )
  const errorNodeCount = useMemo(
    () => nodes.filter((node) => node.executionStatus === "error").length,
    [nodes]
  )
  const completionPercent = useMemo(() => {
    if (nodes.length === 0) return 0
    return Math.round((doneSteps / nodes.length) * 100)
  }, [doneSteps, nodes.length])
  const totalTokenCount = useMemo(
    () => nodes.reduce((sum, node) => sum + node.tokenCount, 0),
    [nodes]
  )
  const uniqueAppsCount = useMemo(
    () => new Set(nodes.flatMap((node) => node.usedApps)).size,
    [nodes]
  )
  const uniqueSkillsCount = useMemo(
    () => new Set(nodes.flatMap((node) => node.usedSkills)).size,
    [nodes]
  )
  const totalFileCount = useMemo(
    () => nodes.reduce((sum, node) => sum + node.files.length, 0),
    [nodes]
  )
  const actionNodeCount = useMemo(
    () => nodes.filter((node) => node.nodeType === "Action").length,
    [nodes]
  )
  const triggerNodeCount = useMemo(
    () => nodes.filter((node) => node.nodeType === "Trigger").length,
    [nodes]
  )
  const composioTriggerRegistrations = useMemo(
    () =>
      nodes
        .map((node) => getComposioTriggerRegistration(node))
        .filter((registration): registration is ComposioTriggerRegistration =>
          Boolean(registration)
        ),
    [nodes]
  )
  const hasComposioTriggerNode = composioTriggerRegistrations.length > 0
  const orderedNodes = useMemo(
    () => [...nodes].sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x)),
    [nodes]
  )
  const runScheduleLabel = useMemo(() => {
    if (runSchedule.mode === "off") return "Manual only"
    if (runSchedule.mode === "every") {
      return `Every ${runSchedule.value} ${runSchedule.unit}`
    }
    const runAt = new Date(runSchedule.atISO)
    if (Number.isNaN(runAt.getTime())) return "One-time schedule set"
    return `At ${runAt.toLocaleString()}`
  }, [runSchedule])
  const executionTimeline = useMemo(() => {
    if (lastExecutionLabel === "Not run yet") {
      return [
        {
          title: "No execution yet",
          detail: "Run the workflow to generate a full event timeline.",
        },
        {
          title: "Publish state",
          detail:
            publishState === "Published" ? "Published and active" : "Draft",
        },
        {
          title: "Scheduler",
          detail: runScheduleLabel,
        },
      ]
    }
    return [
      {
        title: "Workflow started",
        detail: `Latest run ${lastExecutionLabel}`,
      },
      {
        title: "Node processing",
        detail: `${doneSteps} done • ${inReviewSteps} in review • ${pendingSteps} pending`,
      },
      {
        title: "Execution snapshot",
        detail: `${totalTokenCount.toLocaleString()} tokens across ${nodes.length} nodes`,
      },
      {
        title: "Publish state",
        detail: publishState === "Published" ? "Published and active" : "Draft",
      },
    ]
  }, [
    doneSteps,
    inReviewSteps,
    lastExecutionLabel,
    nodes.length,
    pendingSteps,
    publishState,
    runScheduleLabel,
    totalTokenCount,
  ])

  const nodeMap = useMemo(
    () => new Map(nodes.map((node) => [node.id, node])),
    [nodes]
  )

  useEffect(() => {
    nodesRef.current = nodes
  }, [nodes])

  useEffect(() => {
    edgesRef.current = edges
  }, [edges])

  useEffect(() => {
    selectedNodeIdRef.current = selectedNodeId
  }, [selectedNodeId])

  const cloneSnapshot = useCallback(
    (snapshot: WorkflowSnapshot): WorkflowSnapshot => ({
      nodes: snapshot.nodes.map((node) => ({ ...node })),
      edges: snapshot.edges.map((edge) => ({ ...edge })),
      selectedNodeId: snapshot.selectedNodeId,
    }),
    []
  )

  const getCurrentSnapshot = useCallback(
    (): WorkflowSnapshot => ({
      nodes: nodesRef.current.map((node) => ({ ...node })),
      edges: edgesRef.current.map((edge) => ({ ...edge })),
      selectedNodeId: selectedNodeIdRef.current,
    }),
    []
  )

  const pushHistorySnapshot = useCallback(() => {
    const snapshot = getCurrentSnapshot()
    setHistoryPast((previous) => [...previous, snapshot])
    setHistoryFuture([])
  }, [getCurrentSnapshot])

  const applySnapshot = useCallback(
    (snapshot: WorkflowSnapshot) => {
      const next = cloneSnapshot(snapshot)
      setNodes(next.nodes)
      setEdges(next.edges)
      setSelectedNodeId(next.selectedNodeId)
      setConnectingSourceId(null)
      setConnectingSourceHandle(null)
      setWireCursor(null)
      setHoveredNodeId(null)
      setHoveredEdgeId(null)
      setEditingTitleNodeId(null)
      setTitleDraft("")
    },
    [cloneSnapshot]
  )

  const markProjectChanged = useCallback(() => {
    setHasUnpublishedChanges(true)
    setPublishState("Draft")
  }, [])

  const handleUndo = useCallback(() => {
    setHistoryPast((previous) => {
      if (previous.length === 0) return previous
      const previousSnapshot = previous[previous.length - 1]
      setHistoryFuture((future) => [getCurrentSnapshot(), ...future])
      applySnapshot(previousSnapshot)
      markProjectChanged()
      return previous.slice(0, -1)
    })
  }, [applySnapshot, getCurrentSnapshot, markProjectChanged])

  const handleRedo = useCallback(() => {
    setHistoryFuture((future) => {
      if (future.length === 0) return future
      const [nextSnapshot, ...rest] = future
      setHistoryPast((previous) => [...previous, getCurrentSnapshot()])
      applySnapshot(nextSnapshot)
      markProjectChanged()
      return rest
    })
  }, [applySnapshot, getCurrentSnapshot, markProjectChanged])

  const edgeGeometries = useMemo<EdgeGeometry[]>(() => {
    return edges
      .map((edge) => {
        const sourceNode = nodeMap.get(edge.sourceId)
        const targetNode = nodeMap.get(edge.targetId)
        if (!sourceNode || !targetNode) return null
        const sourceHeight = nodeHeights[sourceNode.id] ?? DEFAULT_NODE_HEIGHT
        const targetHeight = nodeHeights[targetNode.id] ?? DEFAULT_NODE_HEIGHT
        const sourceHandle = getEdgeSourceHandle(edge)
        const targetHandle = getEdgeTargetHandle(edge)
        const from = getNodeAnchorPoint(sourceNode, sourceHeight, sourceHandle)
        const to = getNodeAnchorPoint(targetNode, targetHeight, targetHandle)
        const { path, midX, midY } = getOrthogonalWirePath(
          from.x,
          from.y,
          sourceHandle,
          to.x,
          to.y,
          targetHandle
        )

        return {
          ...edge,
          path,
          fromX: from.x,
          fromY: from.y,
          toX: to.x,
          toY: to.y,
          midX,
          midY,
        }
      })
      .filter((edge): edge is EdgeGeometry => edge !== null)
  }, [edges, nodeHeights, nodeMap])

  const draftWirePath = useMemo(() => {
    if (!connectingSourceId || !connectingSourceHandle || !wireCursor)
      return null
    const sourceNode = nodeMap.get(connectingSourceId)
    if (!sourceNode) return null
    const sourceHeight = nodeHeights[sourceNode.id] ?? DEFAULT_NODE_HEIGHT
    const from = getNodeAnchorPoint(
      sourceNode,
      sourceHeight,
      connectingSourceHandle
    )
    const toX = wireCursor.x
    const toY = wireCursor.y
    return getOrthogonalWirePath(
      from.x,
      from.y,
      connectingSourceHandle,
      toX,
      toY,
      "top"
    ).path
  }, [
    connectingSourceHandle,
    connectingSourceId,
    nodeHeights,
    nodeMap,
    wireCursor,
  ])

  const handleRunWorkflow = useCallback(async () => {
    if (isRunningWorkflow) return
    if (runTimerRef.current !== null) {
      window.clearTimeout(runTimerRef.current)
      runTimerRef.current = null
    }

    const totalNodes = nodesRef.current.length
    if (totalNodes === 0) return

    if (agentPlan && !telegramAgentBlueprint) {
      setIsRunningWorkflow(true)
      setNodes((previous) =>
        previous.map((node) => ({
          ...node,
          status: "Pending",
          executionStatus: "idle",
          lastRan: "Queued...",
        }))
      )

      try {
        const response = await apiFetch(`/api/agents/${agentPlan.id}/runs`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            input: {
              source: "manual",
              automationId: projectId,
            },
          }),
        })
        const payload = (await response.json()) as {
          data?: {
            summary?: {
              status: "succeeded" | "failed"
              steps?: Array<{ stepIndex: number; status: "succeeded" | "failed" }>
              error?: string | null
            }
          }
          error?: { message?: string }
        }

        if (!response.ok || !payload.data?.summary) {
          throw new Error(payload.error?.message ?? "Agent run failed.")
        }

        const stepResults = new Map(
          (payload.data.summary.steps ?? []).map((step) => [
            step.stepIndex,
            step.status,
          ])
        )
        setNodes((previous) =>
          previous.map((node, index) => {
            const result = stepResults.get(index)
            if (!result) {
              return {
                ...node,
                status: payload.data?.summary?.status === "failed" ? "Pending" : node.status,
                executionStatus: payload.data?.summary?.status === "failed" ? "idle" : node.executionStatus,
              }
            }
            return {
              ...node,
              status: result === "succeeded" ? "Done" : "Pending",
              executionStatus: result === "succeeded" ? "success" : "error",
              lastRan: "Just now",
            }
          })
        )
        setLastExecutionLabel(
          payload.data.summary.status === "succeeded"
            ? "Just now"
            : payload.data.summary.error ?? "Run failed"
        )
        await refreshAgentPlan()
      } catch (error) {
        const message = error instanceof Error ? error.message : "Agent run failed."
        setLastExecutionLabel(message)
        setNodes((previous) =>
          previous.map((node, index) =>
            index === 0
              ? {
                  ...node,
                  status: "Pending",
                  executionStatus: "error",
                  lastRan: "Failed",
                }
              : node
          )
        )
        await refreshAgentPlan()
      } finally {
        setIsRunningWorkflow(false)
        runTimerRef.current = null
      }
      return
    }

    if (telegramAgentBlueprint && !telegramWebhookStatus?.webhookConfigured) {
      void activateTelegramWebhook()
    }

    const composioRegistrations = nodesRef.current
      .map((node) => getComposioTriggerRegistration(node))
      .filter((registration): registration is ComposioTriggerRegistration =>
        Boolean(registration)
      )
    if (composioRegistrations.length > 0) {
      void activateComposioTriggers(composioRegistrations)
    }

    setIsRunningWorkflow(true)
    setNodes((previous) =>
      previous.map((node) => ({
        ...node,
        status: "Pending",
        executionStatus: "idle",
        lastRan: "Queued...",
      }))
    )

    const errorIndex =
      totalNodes > 2 && Math.random() < 0.35
        ? Math.floor(Math.random() * totalNodes)
        : -1

    const executeNodeAt = (index: number) => {
      if (index >= totalNodes) {
        setLastExecutionLabel("Just now")
        setIsRunningWorkflow(false)
        runTimerRef.current = null
        return
      }

      setNodes((previous) =>
        previous.map((node, nodeIndex) =>
          nodeIndex === index
            ? {
                ...node,
                status: "In review",
                executionStatus: "running",
                lastRan: "Running...",
              }
            : node
        )
      )

      runTimerRef.current = window.setTimeout(() => {
        const isError = index === errorIndex
        setNodes((previous) =>
          previous.map((node, nodeIndex) =>
            nodeIndex === index
              ? {
                  ...node,
                  status: isError ? "Pending" : "Done",
                  executionStatus: isError ? "error" : "success",
                  lastRan: "Just now",
                }
              : node
          )
        )
        executeNodeAt(index + 1)
      }, 600)
    }

    executeNodeAt(0)
  }, [
    activateComposioTriggers,
    activateTelegramWebhook,
    agentPlan,
    apiFetch,
    isRunningWorkflow,
    projectId,
    refreshAgentPlan,
    telegramAgentBlueprint,
    telegramWebhookStatus?.webhookConfigured,
  ])

  const handlePublishWorkflow = useCallback(() => {
    if (isPublishingWorkflow) return
    if (publishTimerRef.current !== null) {
      window.clearTimeout(publishTimerRef.current)
      publishTimerRef.current = null
    }

    setIsPublishingWorkflow(true)

    publishTimerRef.current = window.setTimeout(() => {
      setPublishState("Published")
      setHasUnpublishedChanges(false)
      setIsPublishingWorkflow(false)
      publishTimerRef.current = null
    }, 900)
  }, [isPublishingWorkflow])

  const toggleConnection = (
    sourceId: string,
    targetId: string,
    sourceHandle: AnchorSide = "bottom",
    targetHandle: AnchorSide = "top"
  ) => {
    if (!sourceId || !targetId || sourceId === targetId) return
    pushHistorySnapshot()
    markProjectChanged()
    setEdges((previous) => {
      const existing = previous.find(
        (edge) =>
          edge.sourceId === sourceId &&
          edge.targetId === targetId &&
          getEdgeSourceHandle(edge) === sourceHandle &&
          getEdgeTargetHandle(edge) === targetHandle
      )
      if (existing) {
        return previous.filter((edge) => edge.id !== existing.id)
      }
      return [
        ...previous,
        {
          id: `${sourceId}:${sourceHandle}->${targetId}:${targetHandle}`,
          sourceId,
          targetId,
          sourceHandle,
          targetHandle,
        },
      ]
    })
  }

  const getCanvasPoint = (clientX: number, clientY: number) => {
    const viewport = viewportRef.current
    if (!viewport) return null
    const viewportRect = viewport.getBoundingClientRect()
    const pointerX = clientX - viewportRect.left
    const pointerY = clientY - viewportRect.top
    return {
      x: Math.round((viewport.scrollLeft + pointerX) / zoom),
      y: Math.round((viewport.scrollTop + pointerY) / zoom),
    }
  }

  const clearWireDraft = () => {
    setConnectingSourceId(null)
    setConnectingSourceHandle(null)
    setWireCursor(null)
  }

  const startTitleEdit = (node: WorkflowNode) => {
    setSelectedNodeId(node.id)
    setEditingTitleNodeId(node.id)
    setTitleDraft(node.stepName)
  }

  const activateNodeChat = (nodeId: string) => {
    setActiveChatNodeId(nodeId)
    setIsChatOpen(true)
    setMountedChatNodeIds((previous) =>
      previous.includes(nodeId) ? previous : [...previous, nodeId]
    )
  }

  const openNodeChatPanel = (node: WorkflowNode) => {
    setSelectedNodeId(node.id)
    activateNodeChat(node.id)
  }

  const attachChatToNode = useCallback((nodeId: string, chatId: string) => {
    markProjectChanged()
    setNodes((previous) =>
      previous.map((node) =>
        node.id === nodeId ? { ...node, chatId } : node
      )
    )
  }, [markProjectChanged])

  const applyWorkflowNodePlan = useCallback(
    (
      sourceNodeId: string,
      plannedNodes: WorkflowPlannerNode[],
      _reply: string
    ) => {
      if (plannedNodes.length === 0) return
      const sourceNode =
        nodesRef.current.find((node) => node.id === sourceNodeId) ??
        nodesRef.current[0]
      const baseX = sourceNode?.x ?? WORKSPACE_OFFSET_X
      const baseY = sourceNode?.y ?? WORKSPACE_OFFSET_Y
      const sourceHeight = sourceNode
        ? nodeHeights[sourceNode.id] ?? DEFAULT_NODE_HEIGHT
        : DEFAULT_NODE_HEIGHT
      const projectKey = project?.id ?? "workflow"
      const stamp = Date.now().toString(36)
      const nextNodes = plannedNodes.map((plannedNode, index) => {
        const runtimeLabel = formatRuntimeMs(plannedNode.runtimeMs)
        const actionSummary = plannedNode.actions
          .map((action) => `- ${action.name}: ${action.prompt}`)
          .join("\n")
        return {
          id: `${projectKey}-node-${stamp}-${index + 1}`,
          nodeType:
            plannedNode.type === "trigger"
              ? ("Trigger" as const)
              : ("Action" as const),
          stepName: plannedNode.name,
          status: "Pending" as const,
          executionStatus: "idle" as const,
          owner: "Atmet AI",
          provider: plannedNode.provider ?? plannedNode.app,
          model: plannedNode.triggerSlug ?? plannedNode.provider ?? plannedNode.app,
          prompt: [
            plannedNode.prompt,
            actionSummary ? `\nActions:\n${actionSummary}` : null,
          ]
            .filter(Boolean)
            .join(""),
          tokenCount: 0,
          lastRan: runtimeLabel ? `~${runtimeLabel}` : "Never",
          runtimeMs: plannedNode.runtimeMs,
          usedApps: [plannedNode.app],
          usedSkills: ["Action Planner"],
          files: [],
          x: snapCanvasCoord(baseX),
          y: snapCanvasCoord(baseY + index * (sourceHeight + 72)),
        } satisfies WorkflowNode
      })

      pushHistorySnapshot()
      markProjectChanged()
      setNodes((previous) => {
        const replaceIndex = previous.findIndex((node) => node.id === sourceNodeId)
        if (replaceIndex === -1) return [...previous, ...nextNodes]
        return [
          ...previous.slice(0, replaceIndex),
          ...nextNodes,
          ...previous.slice(replaceIndex + 1),
        ]
      })
      setEdges((previous) => {
        const keptEdges = previous.filter(
          (edge) => edge.sourceId !== sourceNodeId && edge.targetId !== sourceNodeId
        )
        const plannedEdges = nextNodes.slice(0, -1).map((node, index) => ({
          id: `${node.id}:bottom->${nextNodes[index + 1].id}:top`,
          sourceId: node.id,
          targetId: nextNodes[index + 1].id,
          sourceHandle: "bottom" as const,
          targetHandle: "top" as const,
        }))
        return [...keptEdges, ...plannedEdges]
      })
      setSelectedNodeId(nextNodes[0].id)
      setActiveChatNodeId(nextNodes[0].id)
      setMountedChatNodeIds((previous) =>
        Array.from(new Set([...previous.filter((id) => id !== sourceNodeId), nextNodes[0].id]))
      )
      setEditingTitleNodeId(null)
      setTitleDraft("")
      clearWireDraft()
    },
    [markProjectChanged, nodeHeights, project?.id, pushHistorySnapshot]
  )

  const commitTitleEdit = (nodeId: string) => {
    const nextTitle = titleDraft.trim()
    if (!nextTitle) {
      setEditingTitleNodeId(null)
      setTitleDraft("")
      return
    }
    pushHistorySnapshot()
    markProjectChanged()
    setNodes((previous) =>
      previous.map((node) =>
        node.id === nodeId ? { ...node, stepName: nextTitle } : node
      )
    )
    setEditingTitleNodeId(null)
    setTitleDraft("")
  }

  const addNodeNextTo = (sourceNodeId: string) => {
    const source = nodes.find((node) => node.id === sourceNodeId)
    if (!source) return
    const sourceHeight = nodeHeights[source.id] ?? DEFAULT_NODE_HEIGHT
    const projectKey = project?.id ?? "workflow"
    const newId = `${projectKey}-node-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 6)}`
    const newNode: WorkflowNode = {
      id: newId,
      nodeType: source.nodeType,
      stepName: "New Step",
      status: "Pending",
      executionStatus: "idle",
      owner: "You",
      provider: source.provider,
      model: source.model,
      prompt: "Define what this node should do.",
      tokenCount: 0,
      lastRan: "Never",
      usedApps: [source.provider],
      usedSkills: ["Action Planner"],
      files: [],
      x: snapCanvasCoord(source.x),
      y: snapCanvasCoord(source.y + sourceHeight + 72),
    }

    pushHistorySnapshot()
    markProjectChanged()
    setNodes((previous) => {
      const sourceIndex = previous.findIndex((node) => node.id === sourceNodeId)
      if (sourceIndex === -1) return [...previous, newNode]
      return [
        ...previous.slice(0, sourceIndex + 1),
        newNode,
        ...previous.slice(sourceIndex + 1),
      ]
    })
    setEdges((previous) => [
      ...previous,
      {
        id: `${sourceNodeId}:bottom->${newId}:top`,
        sourceId: sourceNodeId,
        targetId: newId,
        sourceHandle: "bottom",
        targetHandle: "top",
      },
    ])
    setSelectedNodeId(newId)
    activateNodeChat(newId)
    setEditingTitleNodeId(newId)
    setTitleDraft("New Step")
    clearWireDraft()
  }

  const deleteNode = (nodeId: string) => {
    pushHistorySnapshot()
    const remainingNodes = nodes.filter((node) => node.id !== nodeId)
    markProjectChanged()
    setNodes(remainingNodes)
    setEdges((previous) =>
      previous.filter(
        (edge) => edge.sourceId !== nodeId && edge.targetId !== nodeId
      )
    )
    setSelectedNodeId((previous) => {
      if (previous !== nodeId) return previous
      return remainingNodes[0]?.id ?? ""
    })
    setActiveChatNodeId((previous) => {
      if (previous !== nodeId) return previous
      return remainingNodes[0]?.id ?? ""
    })
    setIsChatOpen((previous) => {
      if (!previous) return previous
      if (remainingNodes.length > 0) return previous
      return false
    })
    setMountedChatNodeIds((previous) => previous.filter((id) => id !== nodeId))
    setConnectingSourceId((previous) => (previous === nodeId ? null : previous))
    setHoveredEdgeId(null)
    setFilesDialogOpen(false)
    setEditingTitleNodeId((previous) => (previous === nodeId ? null : previous))
  }

  const addNodeAtPosition = (
    x: number,
    y: number,
    options?: { template?: WorkflowNode; preserveStepName?: boolean }
  ) => {
    const projectKey = project?.id ?? "workflow"
    const newId = `${projectKey}-node-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 6)}`
    const template = options?.template ?? copiedNode
    const preserveStepName = options?.preserveStepName ?? false
    const snappedX = snapCanvasCoord(x)
    const snappedY = snapCanvasCoord(y)
    const newNode: WorkflowNode = template
      ? {
          ...template,
          id: newId,
          stepName: preserveStepName
            ? template.stepName
            : `${template.stepName} Copy`,
          status: "Pending",
          executionStatus: "idle",
          lastRan: "Never",
          x: snappedX,
          y: snappedY,
        }
      : {
          id: newId,
          nodeType: "Action",
          stepName: "New Step",
          status: "Pending",
          executionStatus: "idle",
          owner: "You",
          provider: "ChatGPT",
          model: "GPT-5.2",
          prompt: "Define what this node should do.",
          tokenCount: 0,
          lastRan: "Never",
          usedApps: ["ChatGPT"],
          usedSkills: ["Action Planner"],
          files: [],
          x: snappedX,
          y: snappedY,
        }

    pushHistorySnapshot()
    markProjectChanged()
    setNodes((previous) => [...previous, newNode])
    setSelectedNodeId(newId)
    activateNodeChat(newId)
    setEditingTitleNodeId(newId)
    setTitleDraft(newNode.stepName)
    clearWireDraft()
    return newId
  }

  const addNodeFromContextMenu = () => {
    if (selectedNodeId && nodeMap.has(selectedNodeId)) {
      addNodeNextTo(selectedNodeId)
      return
    }

    if (contextMenuPoint) {
      addNodeAtPosition(
        Math.max(16, Math.round(contextMenuPoint.x - NODE_WIDTH / 2)),
        Math.max(16, Math.round(contextMenuPoint.y - 120))
      )
      return
    }

    const viewport = viewportRef.current
    if (!viewport) {
      addNodeAtPosition(WORKSPACE_OFFSET_X, WORKSPACE_OFFSET_Y)
      return
    }

    addNodeAtPosition(
      Math.max(
        16,
        Math.round(
          (viewport.scrollLeft + viewport.clientWidth / 2) / zoom -
            NODE_WIDTH / 2
        )
      ),
      Math.max(
        16,
        Math.round(
          (viewport.scrollTop + viewport.clientHeight / 2) / zoom - 120
        )
      )
    )
  }

  const editSelectedNode = () => {
    const selected = nodeMap.get(selectedNodeId)
    if (!selected) return
    openNodeChatPanel(selected)
  }

  const copySelectedNode = () => {
    const selected = nodeMap.get(selectedNodeId)
    if (!selected) return
    setCopiedNode({ ...selected })
  }

  const duplicateSelectedNode = () => {
    const selected = nodeMap.get(selectedNodeId)
    if (!selected) return
    setCopiedNode({ ...selected })
    addNodeAtPosition(selected.x + 48, selected.y + 48, {
      template: selected,
      preserveStepName: true,
    })
  }

  const pasteCopiedNode = useCallback(() => {
    if (!copiedNode) return

    const pointerPoint = pointerCanvasPointRef.current
    if (pointerPoint) {
      addNodeAtPosition(
        Math.max(16, Math.round(pointerPoint.x - NODE_WIDTH / 2)),
        Math.max(16, Math.round(pointerPoint.y - 120)),
        { template: copiedNode, preserveStepName: true }
      )
      return
    }

    if (contextMenuPoint) {
      addNodeAtPosition(
        Math.max(16, Math.round(contextMenuPoint.x - NODE_WIDTH / 2)),
        Math.max(16, Math.round(contextMenuPoint.y - 120)),
        { template: copiedNode, preserveStepName: true }
      )
      return
    }

    const viewport = viewportRef.current
    if (!viewport) return
    addNodeAtPosition(
      Math.max(
        16,
        Math.round(
          (viewport.scrollLeft + viewport.clientWidth / 2) / zoom -
            NODE_WIDTH / 2
        )
      ),
      Math.max(
        16,
        Math.round(
          (viewport.scrollTop + viewport.clientHeight / 2) / zoom - 120
        )
      ),
      { template: copiedNode, preserveStepName: true }
    )
  }, [addNodeAtPosition, contextMenuPoint, copiedNode, zoom])

  const focusFirstNodeWithAnimation = useCallback(() => {
    const viewport = viewportRef.current
    if (!viewport) return

    const targetNode =
      (selectedNodeId ? nodeMap.get(selectedNodeId) : undefined) ??
      nodesRef.current[0]

    if (focusAnimationFrameRef.current !== null) {
      window.cancelAnimationFrame(focusAnimationFrameRef.current)
      focusAnimationFrameRef.current = null
    }

    const startZoom = zoom
    const targetZoom = 1
    const startLeft = viewport.scrollLeft
    const startTop = viewport.scrollTop

    const targetNodeHeight = targetNode
      ? (nodeHeights[targetNode.id] ?? DEFAULT_NODE_HEIGHT)
      : DEFAULT_NODE_HEIGHT
    const targetCenterX = targetNode
      ? targetNode.x + NODE_WIDTH / 2
      : WORKSPACE_WIDTH / 2
    const targetCenterY = targetNode
      ? targetNode.y + targetNodeHeight / 2
      : WORKSPACE_HEIGHT / 2
    const targetLeft = Math.max(
      0,
      targetCenterX * targetZoom - viewport.clientWidth / 2
    )
    const targetTop = Math.max(
      0,
      targetCenterY * targetZoom - viewport.clientHeight / 2
    )
    const startTime = performance.now()
    const durationMs = 260
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

    const animate = (now: number) => {
      const progress = Math.min(1, (now - startTime) / durationMs)
      const eased = easeOutCubic(progress)

      setZoom(startZoom + (targetZoom - startZoom) * eased)
      viewport.scrollLeft = startLeft + (targetLeft - startLeft) * eased
      viewport.scrollTop = startTop + (targetTop - startTop) * eased

      if (progress < 1) {
        focusAnimationFrameRef.current = window.requestAnimationFrame(animate)
        return
      }

      setZoom(targetZoom)
      viewport.scrollLeft = targetLeft
      viewport.scrollTop = targetTop
      focusAnimationFrameRef.current = null
    }

    focusAnimationFrameRef.current = window.requestAnimationFrame(animate)
  }, [nodeHeights, nodeMap, selectedNodeId, zoom])

  const deleteSelectedNode = () => {
    if (!selectedNodeId || !nodeMap.has(selectedNodeId)) return
    deleteNode(selectedNodeId)
  }

  const setNodeType = (nodeId: string, nodeType: "Action" | "Trigger") => {
    const existingNode = nodeMap.get(nodeId)
    if (!existingNode || existingNode.nodeType === nodeType) return
    pushHistorySnapshot()
    markProjectChanged()
    setNodes((previous) =>
      previous.map((node) =>
        node.id === nodeId ? { ...node, nodeType } : node
      )
    )
  }

  const showEdgeDelete = (edgeId: string) => {
    if (edgeHoverTimeoutRef.current !== null) {
      window.clearTimeout(edgeHoverTimeoutRef.current)
      edgeHoverTimeoutRef.current = null
    }
    setHoveredEdgeId(edgeId)
  }

  const hideEdgeDeleteSoon = (edgeId: string) => {
    if (edgeHoverTimeoutRef.current !== null) {
      window.clearTimeout(edgeHoverTimeoutRef.current)
    }
    edgeHoverTimeoutRef.current = window.setTimeout(() => {
      setHoveredEdgeId((previous) => (previous === edgeId ? null : previous))
      edgeHoverTimeoutRef.current = null
    }, 120)
  }

  const handleStartConnectionMode = (nodeId: string, handle: AnchorSide) => {
    setSelectedNodeId(nodeId)
    if (connectingSourceId === nodeId && connectingSourceHandle === handle) {
      clearWireDraft()
      return
    }
    setConnectingSourceId(nodeId)
    setConnectingSourceHandle(handle)
    const sourceNode = nodeMap.get(nodeId)
    if (!sourceNode) {
      setWireCursor(null)
      return
    }
    const sourceHeight = nodeHeights[sourceNode.id] ?? DEFAULT_NODE_HEIGHT
    const point = getNodeAnchorPoint(sourceNode, sourceHeight, handle)
    setWireCursor(point)
  }

  const handleNodePointerDown = (
    nodeId: string,
    event: ReactPointerEvent<HTMLDivElement>
  ) => {
    if (connectingSourceId) {
      return
    }
    if (isSpacePressed || isPanning) {
      event.preventDefault()
      return
    }
    if (event.button !== 0) return
    const canvas = canvasRef.current
    const targetNode = nodes.find((node) => node.id === nodeId)
    if (!canvas || !targetNode) return

    const canvasRect = canvas.getBoundingClientRect()
    const pointerLocalX = event.clientX - canvasRect.left
    const pointerLocalY = event.clientY - canvasRect.top

    dragStateRef.current = {
      nodeId,
      pointerOffsetX: pointerLocalX - targetNode.x,
      pointerOffsetY: pointerLocalY - targetNode.y,
    }
    setSelectedNodeId(nodeId)
    setDraggingNodeId(nodeId)
  }

  useEffect(() => {
    if (!draggingNodeId) return
    let movedNode = false

    const onPointerMove = (event: PointerEvent) => {
      const dragState = dragStateRef.current
      const canvas = canvasRef.current
      if (!dragState || !canvas) return

      const canvasRect = canvas.getBoundingClientRect()
      const nextX = Math.max(
        CANVAS_GRID_STEP,
        snapToGrid(
          event.clientX - canvasRect.left - dragState.pointerOffsetX,
          CANVAS_GRID_STEP
        )
      )
      const nextY = Math.max(
        CANVAS_GRID_STEP,
        snapToGrid(
          event.clientY - canvasRect.top - dragState.pointerOffsetY,
          CANVAS_GRID_STEP
        )
      )
      if (!movedNode) {
        pushHistorySnapshot()
      }
      movedNode = true

      setNodes((previous) =>
        previous.map((node) =>
          node.id === dragState.nodeId ? { ...node, x: nextX, y: nextY } : node
        )
      )
    }

    const finishDrag = () => {
      if (movedNode) {
        markProjectChanged()
      }
      dragStateRef.current = null
      setDraggingNodeId(null)
    }

    window.addEventListener("pointermove", onPointerMove)
    window.addEventListener("pointerup", finishDrag)
    window.addEventListener("pointercancel", finishDrag)

    return () => {
      window.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("pointerup", finishDrag)
      window.removeEventListener("pointercancel", finishDrag)
    }
  }, [draggingNodeId, markProjectChanged, pushHistorySnapshot])

  useEffect(() => {
    const isEditableTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false
      const tag = target.tagName
      return (
        target.isContentEditable ||
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT"
      )
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space") return
      if (isEditableTarget(event.target)) return
      event.preventDefault()
      setIsSpacePressed(true)
    }

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code !== "Space") return
      setIsSpacePressed(false)
      setIsPanning(false)
      panStateRef.current = null
    }

    const onWindowBlur = () => {
      setIsSpacePressed(false)
      setIsPanning(false)
      panStateRef.current = null
    }

    window.addEventListener("keydown", onKeyDown)
    window.addEventListener("keyup", onKeyUp)
    window.addEventListener("blur", onWindowBlur)

    return () => {
      window.removeEventListener("keydown", onKeyDown)
      window.removeEventListener("keyup", onKeyUp)
      window.removeEventListener("blur", onWindowBlur)
    }
  }, [])

  useEffect(() => {
    const isEditableTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false
      const tag = target.tagName
      return (
        target.isContentEditable ||
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT"
      )
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return

      const hasPrimaryModifier = event.metaKey || event.ctrlKey
      const key = event.key.toLowerCase()

      if (key === "escape" && connectingSourceId) {
        event.preventDefault()
        clearWireDraft()
        return
      }

      if (hasPrimaryModifier && key === "z" && event.shiftKey) {
        if (!canRedo) return
        event.preventDefault()
        handleRedo()
        return
      }

      if (
        (event.ctrlKey && key === "y") ||
        (hasPrimaryModifier && key === "y")
      ) {
        if (!canRedo) return
        event.preventDefault()
        handleRedo()
        return
      }

      if (hasPrimaryModifier && key === "z") {
        if (!canUndo) return
        event.preventDefault()
        handleUndo()
        return
      }

      if (hasPrimaryModifier && key === "n") {
        event.preventDefault()
        addNodeFromContextMenu()
        return
      }

      const isZeroShortcut =
        key === "0" || event.code === "Digit0" || event.code === "Numpad0"
      if (hasPrimaryModifier && isZeroShortcut) {
        event.preventDefault()
        focusFirstNodeWithAnimation()
        return
      }

      if (hasPrimaryModifier && key === "v") {
        if (!canPaste) return
        event.preventDefault()
        pasteCopiedNode()
        return
      }

      if (!hasSelectedNode) return

      if (hasPrimaryModifier && key === "e") {
        event.preventDefault()
        editSelectedNode()
        return
      }

      if (hasPrimaryModifier && key === "c") {
        event.preventDefault()
        copySelectedNode()
        return
      }

      if (hasPrimaryModifier && key === "d") {
        event.preventDefault()
        duplicateSelectedNode()
        return
      }

      if (key === "backspace" || key === "delete") {
        event.preventDefault()
        deleteSelectedNode()
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [
    addNodeFromContextMenu,
    canPaste,
    canRedo,
    canUndo,
    copySelectedNode,
    connectingSourceId,
    deleteSelectedNode,
    duplicateSelectedNode,
    editSelectedNode,
    focusFirstNodeWithAnimation,
    handleRedo,
    handleUndo,
    hasSelectedNode,
    pasteCopiedNode,
  ])

  useEffect(() => {
    if (!isPanning) return

    const onPointerMove = (event: PointerEvent) => {
      const viewport = viewportRef.current
      const panState = panStateRef.current
      if (!viewport || !panState) return

      const deltaX = event.clientX - panState.startClientX
      const deltaY = event.clientY - panState.startClientY
      viewport.scrollLeft = panState.startScrollLeft - deltaX
      viewport.scrollTop = panState.startScrollTop - deltaY
    }

    const stopPanning = () => {
      panStateRef.current = null
      setIsPanning(false)
    }

    window.addEventListener("pointermove", onPointerMove)
    window.addEventListener("pointerup", stopPanning)
    window.addEventListener("pointercancel", stopPanning)

    return () => {
      window.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("pointerup", stopPanning)
      window.removeEventListener("pointercancel", stopPanning)
    }
  }, [isPanning])

  const handleViewportWheel = (event: ReactWheelEvent<HTMLElement>) => {
    if (!event.ctrlKey && !event.metaKey) return

    const viewport = viewportRef.current
    if (!viewport) return
    event.preventDefault()

    const viewportRect = viewport.getBoundingClientRect()
    const pointerX = event.clientX - viewportRect.left
    const pointerY = event.clientY - viewportRect.top
    const worldX = (viewport.scrollLeft + pointerX) / zoom
    const worldY = (viewport.scrollTop + pointerY) / zoom
    const directionScale = event.deltaY < 0 ? 1.1 : 0.9
    const nextZoom = Math.min(2.5, Math.max(0.5, zoom * directionScale))
    if (Math.abs(nextZoom - zoom) < 0.001) return

    setZoom(nextZoom)

    window.requestAnimationFrame(() => {
      const activeViewport = viewportRef.current
      if (!activeViewport) return
      activeViewport.scrollLeft = worldX * nextZoom - pointerX
      activeViewport.scrollTop = worldY * nextZoom - pointerY
    })
  }

  const handleViewportPointerDownCapture = (
    event: ReactPointerEvent<HTMLElement>
  ) => {
    if (!isSpacePressed || event.button !== 0) return
    const viewport = viewportRef.current
    if (!viewport) return

    panStateRef.current = {
      startClientX: event.clientX,
      startClientY: event.clientY,
      startScrollLeft: viewport.scrollLeft,
      startScrollTop: viewport.scrollTop,
    }
    setIsPanning(true)
    event.preventDefault()
    event.stopPropagation()
  }

  useEffect(() => {
    if (!connectingSourceId) return

    const onPointerMove = (event: PointerEvent) => {
      const point = getCanvasPoint(event.clientX, event.clientY)
      if (!point) return
      setWireCursor(point)
    }

    window.addEventListener("pointermove", onPointerMove)

    return () => {
      window.removeEventListener("pointermove", onPointerMove)
    }
  }, [connectingSourceId])

  useEffect(() => {
    return () => {
      if (edgeHoverTimeoutRef.current !== null) {
        window.clearTimeout(edgeHoverTimeoutRef.current)
      }
      if (runTimerRef.current !== null) {
        window.clearTimeout(runTimerRef.current)
      }
      if (publishTimerRef.current !== null) {
        window.clearTimeout(publishTimerRef.current)
      }
      if (autoRunIntervalRef.current !== null) {
        window.clearInterval(autoRunIntervalRef.current)
      }
      if (autoRunTimeoutRef.current !== null) {
        window.clearTimeout(autoRunTimeoutRef.current)
      }
      if (focusAnimationFrameRef.current !== null) {
        window.cancelAnimationFrame(focusAnimationFrameRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!projectId) return

    const onRunWorkflow = (event: Event) => {
      try {
        const detail = (event as CustomEvent<WorkflowControlEventDetail>).detail
        if (!detail || detail.projectId !== projectId) return
        handleRunWorkflow()
      } catch (error) {
        console.error("Failed to run workflow action:", error)
      }
    }

    const onPublishWorkflow = (event: Event) => {
      try {
        const detail = (event as CustomEvent<WorkflowControlEventDetail>).detail
        if (!detail || detail.projectId !== projectId) return
        handlePublishWorkflow()
      } catch (error) {
        console.error("Failed to publish workflow action:", error)
      }
    }

    const onOpenExecutionLog = (event: Event) => {
      try {
        const detail = (event as CustomEvent<WorkflowControlEventDetail>).detail
        if (!detail || detail.projectId !== projectId) return
        setExecutionLogOpen(true)
      } catch (error) {
        console.error("Failed to open workflow execution log:", error)
      }
    }

    const onSetAutoRun = (event: Event) => {
      try {
        const detail = (event as CustomEvent<WorkflowSetAutoRunEventDetail>)
          .detail
        if (!detail || detail.projectId !== projectId) return
        setRunSchedule(detail.schedule)
      } catch (error) {
        console.error("Failed to update workflow auto-run schedule:", error)
      }
    }

    window.addEventListener(WORKFLOW_RUN_EVENT, onRunWorkflow as EventListener)
    window.addEventListener(
      WORKFLOW_PUBLISH_EVENT,
      onPublishWorkflow as EventListener
    )
    window.addEventListener(
      WORKFLOW_OPEN_LOG_EVENT,
      onOpenExecutionLog as EventListener
    )
    window.addEventListener(
      WORKFLOW_SET_AUTORUN_EVENT,
      onSetAutoRun as EventListener
    )

    return () => {
      window.removeEventListener(
        WORKFLOW_RUN_EVENT,
        onRunWorkflow as EventListener
      )
      window.removeEventListener(
        WORKFLOW_PUBLISH_EVENT,
        onPublishWorkflow as EventListener
      )
      window.removeEventListener(
        WORKFLOW_OPEN_LOG_EVENT,
        onOpenExecutionLog as EventListener
      )
      window.removeEventListener(
        WORKFLOW_SET_AUTORUN_EVENT,
        onSetAutoRun as EventListener
      )
    }
  }, [handlePublishWorkflow, handleRunWorkflow, projectId])

  useEffect(() => {
    if (autoRunIntervalRef.current !== null) {
      window.clearInterval(autoRunIntervalRef.current)
      autoRunIntervalRef.current = null
    }
    if (autoRunTimeoutRef.current !== null) {
      window.clearTimeout(autoRunTimeoutRef.current)
      autoRunTimeoutRef.current = null
    }

    if (runSchedule.mode === "at") {
      const runAtMs = new Date(runSchedule.atISO).getTime()
      if (!Number.isFinite(runAtMs)) return
      const delayMs = runAtMs - Date.now()

      if (delayMs <= 0) {
        handleRunWorkflow()
        setRunSchedule({ mode: "off" })
        return
      }

      autoRunTimeoutRef.current = window.setTimeout(() => {
        handleRunWorkflow()
        setRunSchedule({ mode: "off" })
      }, delayMs)

      return () => {
        if (autoRunTimeoutRef.current !== null) {
          window.clearTimeout(autoRunTimeoutRef.current)
          autoRunTimeoutRef.current = null
        }
      }
    }

    const intervalMs = getRunScheduleIntervalMs(runSchedule)
    if (!intervalMs) return

    autoRunIntervalRef.current = window.setInterval(() => {
      handleRunWorkflow()
    }, intervalMs)

    return () => {
      if (autoRunIntervalRef.current !== null) {
        window.clearInterval(autoRunIntervalRef.current)
        autoRunIntervalRef.current = null
      }
    }
  }, [handleRunWorkflow, runSchedule])

  useEffect(() => {
    if (!projectId) return
    const detail: WorkflowStateEventDetail = {
      projectId,
      isRunning: isRunningWorkflow,
      isPublishing: isPublishingWorkflow,
      publishState,
      hasUnpublishedChanges,
      runSchedule,
    }
    try {
      window.dispatchEvent(new CustomEvent(WORKFLOW_STATE_EVENT, { detail }))
    } catch (error) {
      console.error("Failed to broadcast workflow state update:", error)
    }
  }, [
    hasUnpublishedChanges,
    isPublishingWorkflow,
    isRunningWorkflow,
    projectId,
    publishState,
    runSchedule,
  ])

  if (!project && isLoadingProject) {
    return (
      <div className="flex min-h-[calc(100vh-2.5rem)] flex-1 items-center justify-center bg-background px-4 py-10">
        <div className="rounded-xl border border-border bg-card px-5 py-4 text-center">
          <p className="text-sm font-medium text-foreground">
            Loading workflow...
          </p>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex min-h-[calc(100vh-2.5rem)] flex-1 items-center justify-center bg-background px-4 py-10">
        <div className="rounded-xl border border-border bg-card px-5 py-4 text-center">
          <p className="text-sm font-medium text-foreground">
            Project not found.
          </p>
          <Link
            href="/workflow"
            className="mt-2 inline-flex text-sm text-primary hover:underline"
          >
            Back to Workflow
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100dvh-2.5rem)] min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden bg-background">
      <div
        className="flex min-h-0 min-w-0 flex-1 overflow-hidden"
        style={{
          backgroundColor: "var(--background)",
          ...(showPlaygroundDots
            ? {
                backgroundImage:
                  "radial-gradient(color-mix(in srgb, var(--border) 82%, transparent) 0.85px, transparent 0.85px)",
                backgroundSize: `${CANVAS_GRID_STEP}px ${CANVAS_GRID_STEP}px`,
                backgroundPosition: "0 0",
              }
            : undefined),
        }}
      >
        <section
          ref={viewportRef}
          data-workflow-viewport="true"
          data-pan-cursor={
            isPanning ? "grabbing" : isSpacePressed ? "grab" : "default"
          }
          onWheel={handleViewportWheel}
          onPointerDownCapture={handleViewportPointerDownCapture}
          className={cn(
            "relative no-scrollbar h-full min-w-0 flex-1 overflow-auto overscroll-none",
            isPanning
              ? "cursor-grabbing"
              : isSpacePressed
                ? "cursor-grab"
                : "cursor-default"
          )}
        >
          <ContextMenu5Wrapper
            canUndo={canUndo}
            canRedo={canRedo}
            hasSelectedNode={hasSelectedNode}
            canPaste={canPaste}
            onNewNode={addNodeFromContextMenu}
            onEditNode={editSelectedNode}
            onUndo={handleUndo}
            onRedo={handleRedo}
            onCopy={copySelectedNode}
            onPaste={pasteCopiedNode}
            onDuplicate={duplicateSelectedNode}
            onDelete={deleteSelectedNode}
          >
            <div
              ref={canvasRef}
              className="relative"
              onContextMenu={(event) => {
                const point = getCanvasPoint(event.clientX, event.clientY)
                if (point) setContextMenuPoint(point)
                const target = event.target as HTMLElement | null
                const clickedInsideNode = Boolean(
                  target?.closest("[data-workflow-node-card='true']")
                )
                if (!clickedInsideNode) {
                  setSelectedNodeId("")
                }
              }}
              onClick={(event) => {
                if (isPanning) return
                if (connectingSourceId && connectingSourceHandle) {
                  const point =
                    getCanvasPoint(event.clientX, event.clientY) ??
                    pointerCanvasPointRef.current
                  if (point) {
                    const newNodeId = addNodeAtPosition(
                      Math.max(16, Math.round(point.x - NODE_WIDTH / 2)),
                      Math.max(16, Math.round(point.y - 120))
                    )
                    setEdges((previous) => [
                      ...previous,
                      {
                        id: `${connectingSourceId}:${connectingSourceHandle}->${newNodeId}:${getOppositeHandle(connectingSourceHandle)}`,
                        sourceId: connectingSourceId,
                        targetId: newNodeId,
                        sourceHandle: connectingSourceHandle,
                        targetHandle: getOppositeHandle(connectingSourceHandle),
                      },
                    ])
                    return
                  }
                }
                if (connectingSourceId) clearWireDraft()
                setSelectedNodeId("")
              }}
              onPointerMove={(event) => {
                const point = getCanvasPoint(event.clientX, event.clientY)
                if (point) {
                  pointerCanvasPointRef.current = point
                }
              }}
              style={{
                width: `${WORKSPACE_WIDTH}px`,
                height: `${WORKSPACE_HEIGHT}px`,
                zoom,
              }}
            >
              <svg
                className="absolute inset-0 h-full w-full"
                aria-hidden="true"
              >
                {edgeGeometries.map((edge) => {
                  return (
                    <g key={edge.id}>
                      <path
                        d={edge.path}
                        fill="none"
                        stroke="transparent"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={10}
                        pointerEvents="stroke"
                        onPointerEnter={() => showEdgeDelete(edge.id)}
                        onPointerLeave={() => hideEdgeDeleteSoon(edge.id)}
                      />
                      <path
                        d={edge.path}
                        fill="none"
                        style={{ stroke: "var(--muted-foreground)" }}
                        strokeOpacity={0.45}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.6}
                        pointerEvents="none"
                      />
                    </g>
                  )
                })}
                {draftWirePath && (
                  <path
                    d={draftWirePath}
                    fill="none"
                    style={{ stroke: "var(--muted-foreground)" }}
                    strokeOpacity={0.55}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.4}
                    strokeDasharray="6 6"
                  />
                )}
              </svg>

              {hoveredEdgeId &&
                (() => {
                  const hoveredEdge = edgeGeometries.find(
                    (edge) => edge.id === hoveredEdgeId
                  )
                  if (!hoveredEdge) return null
                  return (
                    <button
                      type="button"
                      onPointerEnter={() => showEdgeDelete(hoveredEdge.id)}
                      onPointerLeave={() => hideEdgeDeleteSoon(hoveredEdge.id)}
                      onPointerDown={(event) => event.stopPropagation()}
                      onClick={(event) => {
                        event.stopPropagation()
                        pushHistorySnapshot()
                        markProjectChanged()
                        setEdges((previous) =>
                          previous.filter((edge) => edge.id !== hoveredEdge.id)
                        )
                        setHoveredEdgeId(null)
                      }}
                      className="absolute z-20 inline-flex h-6 w-6 items-center justify-center rounded-full border border-border bg-popover text-muted-foreground shadow-sm transition-colors hover:text-destructive"
                      style={{
                        left: hoveredEdge.midX - 12,
                        top: hoveredEdge.midY - 12,
                      }}
                      aria-label="Delete wire"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )
                })()}

              {nodes.map((node) => {
                const isSelected = node.id === selectedNodeId
                const isHovered = node.id === hoveredNodeId
                const shouldShowHandles =
                  isSelected || isHovered || connectingSourceId === node.id
                const executionState =
                  EXECUTION_STATUS_META[node.executionStatus]
                const appIdentity = getWorkflowNodeAppIdentity(node)
                const handleConfig: Array<{
                  side: AnchorSide
                  className: string
                }> = [
                  {
                    side: "top",
                    className:
                      "absolute -top-2 left-1/2 -translate-x-1/2 inline-flex h-4 w-4 items-center justify-center rounded-full border shadow-sm",
                  },
                  {
                    side: "right",
                    className:
                      "absolute -right-2 top-1/2 -translate-y-1/2 inline-flex h-4 w-4 items-center justify-center rounded-full border shadow-sm",
                  },
                  {
                    side: "bottom",
                    className:
                      "absolute -bottom-2 left-1/2 -translate-x-1/2 inline-flex h-4 w-4 items-center justify-center rounded-full border shadow-sm",
                  },
                  {
                    side: "left",
                    className:
                      "absolute -left-2 top-1/2 -translate-y-1/2 inline-flex h-4 w-4 items-center justify-center rounded-full border shadow-sm",
                  },
                ]

                return (
                  <div
                    key={node.id}
                    ref={(element) => setNodeHeightRef(node.id, element)}
                    role="button"
                    tabIndex={0}
                    data-workflow-node-card="true"
                    onContextMenu={(event) => {
                      const point = getCanvasPoint(event.clientX, event.clientY)
                      if (point) setContextMenuPoint(point)
                      setSelectedNodeId(node.id)
                      activateNodeChat(node.id)
                    }}
                    onPointerEnter={() => setHoveredNodeId(node.id)}
                    onPointerLeave={() =>
                      setHoveredNodeId((previous) =>
                        previous === node.id ? null : previous
                      )
                    }
                    onPointerDown={(event) =>
                      handleNodePointerDown(node.id, event)
                    }
                    onClick={(event) => {
                      event.stopPropagation()
                      if (connectingSourceId) {
                        if (connectingSourceId !== node.id) {
                          toggleConnection(
                            connectingSourceId,
                            node.id,
                            connectingSourceHandle ?? "bottom",
                            "top"
                          )
                        }
                        clearWireDraft()
                        return
                      }
                      setSelectedNodeId(node.id)
                      activateNodeChat(node.id)
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault()
                        setSelectedNodeId(node.id)
                        activateNodeChat(node.id)
                      }
                    }}
                    className={cn(
                      "absolute touch-none !rounded-[16px] border bg-card p-2.5 text-left transition-colors select-none",
                      executionState.borderClass,
                      "hover:border-border",
                      connectingSourceId &&
                        connectingSourceId !== node.id &&
                        "ring-1 ring-border/70"
                    )}
                    style={{
                      left: node.x,
                      top: node.y,
                      width: NODE_WIDTH,
                      cursor:
                        draggingNodeId === node.id ? "grabbing" : "default",
                    }}
                  >
                    {shouldShowHandles &&
                      handleConfig.map((handle) => {
                        const hasWire = edges.some((edge) => {
                          if (edge.sourceId === node.id) {
                            return getEdgeSourceHandle(edge) === handle.side
                          }
                          if (edge.targetId === node.id) {
                            return getEdgeTargetHandle(edge) === handle.side
                          }
                          return false
                        })
                        const isCurrentSourceHandle =
                          connectingSourceId === node.id &&
                          connectingSourceHandle === handle.side
                        return (
                          <button
                            key={`${node.id}-${handle.side}`}
                            type="button"
                            onPointerDown={(event) => event.stopPropagation()}
                            onClick={(event) => {
                              event.stopPropagation()
                              if (
                                connectingSourceId &&
                                connectingSourceHandle
                              ) {
                                if (
                                  connectingSourceId === node.id &&
                                  connectingSourceHandle === handle.side
                                ) {
                                  clearWireDraft()
                                  return
                                }
                                toggleConnection(
                                  connectingSourceId,
                                  node.id,
                                  connectingSourceHandle,
                                  handle.side
                                )
                                clearWireDraft()
                                return
                              }
                              handleStartConnectionMode(node.id, handle.side)
                            }}
                            className={cn(
                              handle.className,
                              "border-border bg-background text-muted-foreground",
                              hasWire && "border-border text-foreground/75",
                              isCurrentSourceHandle &&
                                "border-border bg-muted text-foreground"
                            )}
                            aria-label={`Connect ${handle.side} of ${node.stepName}`}
                          >
                            {hasWire ? (
                              <span className="h-1.5 w-1.5 rounded-full bg-current" />
                            ) : (
                              <Plus className="h-2.5 w-2.5" />
                            )}
                          </button>
                        )
                      })}

                    <div className="flex min-w-0 flex-col gap-1.5">
                      {editingTitleNodeId === node.id ? (
                        <div className="flex items-center gap-1">
                          <Input
                            value={titleDraft}
                            onChange={(event) =>
                              setTitleDraft(event.target.value)
                            }
                            onPointerDown={(event) => event.stopPropagation()}
                            onClick={(event) => event.stopPropagation()}
                            onBlur={() => commitTitleEdit(node.id)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault()
                                commitTitleEdit(node.id)
                              }
                              if (event.key === "Escape") {
                                event.preventDefault()
                                setEditingTitleNodeId(null)
                                setTitleDraft("")
                              }
                            }}
                            className="h-7 rounded-[10px] border-input bg-transparent px-2 text-sm font-semibold focus-visible:border-ring"
                            autoFocus
                          />
                          <button
                            type="button"
                            onPointerDown={(event) => event.stopPropagation()}
                            onMouseDown={(event) => {
                              event.preventDefault()
                              event.stopPropagation()
                            }}
                            onClick={(event) => {
                              event.stopPropagation()
                              commitTitleEdit(node.id)
                            }}
                            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[10px] border border-input bg-transparent text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            aria-label={`Save title for ${node.stepName}`}
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div
                          onDoubleClick={(event) => {
                            event.stopPropagation()
                            startTitleEdit(node)
                          }}
                          className="w-full rounded-[10px] text-left"
                        >
                          <p className="line-clamp-1 text-base font-semibold leading-tight text-foreground">
                            {node.stepName}
                          </p>
                        </div>
                      )}

                      <div className="flex min-w-0 items-center gap-1.5 text-xs font-medium text-muted-foreground">
                        <span className="flex h-4 w-4 shrink-0 items-center justify-center overflow-hidden rounded-[4px] bg-muted/35 text-[9px] font-semibold text-muted-foreground shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)]">
                          {appIdentity.logo ? (
                            <img
                              src={appIdentity.logo}
                              alt=""
                              className="h-3 w-3 object-contain"
                              loading="lazy"
                            />
                          ) : (
                            appIdentity.initials
                          )}
                        </span>
                        <span className="truncate">
                          {appIdentity.name}
                        </span>
                      </div>

                      <div className="flex flex-col items-start gap-1 text-xs font-medium text-muted-foreground">
                        <Badge
                          variant={node.nodeType === "Action" ? "blue" : "green"}
                          size="default"
                        >
                          {node.nodeType}
                        </Badge>

                        <span
                          className="inline-flex min-w-0 items-center gap-1.5"
                          title={`Status: ${executionState.label}`}
                          aria-label={`Status: ${executionState.label}`}
                        >
                          <Clock3
                            className={cn(
                              "h-3.5 w-3.5 shrink-0",
                              node.executionStatus === "running" &&
                                "animate-pulse text-sky-500"
                            )}
                          />
                          <span className="truncate tabular-nums">
                            {node.lastRan}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </ContextMenu5Wrapper>
        </section>
        {showAgentPlanPanel && agentPlan && (
          <aside className="flex h-full w-[380px] shrink-0 flex-col border-l border-border bg-card">
            <div className="border-b border-border px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {agentPlan.name}
                  </p>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                    {agentPlan.description || agentBlueprint?.goal || "Agent generated by Atmet."}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={openAgentEditor}
                    className="h-8 w-8"
                    aria-label="Edit agent"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Badge
                    variant={
                      agentPlan.status === "active"
                        ? "green"
                        : agentPlan.status === "draft"
                          ? "amber"
                          : "blue"
                    }
                  >
                    {agentPlan.status}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
              <div className="rounded-lg border border-border bg-background px-3 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Compiler
                    </p>
                    <p className="mt-1 text-sm font-medium text-foreground">
                      {agentPlan.runtime_config_json?.compileStatus === "ready"
                        ? "Ready"
                        : agentPlan.runtime_config_json?.compileStatus === "needs_connections"
                          ? "Needs connections"
                          : "Not compiled"}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    disabled={isCompilingAgent}
                    onClick={() => void handleCompileAgent()}
                    className="h-8"
                  >
                    {isCompilingAgent ? (
                      <RefreshCcw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Zap className="h-3.5 w-3.5" />
                    )}
                    Compile
                  </Button>
                </div>
                {hasAgentAppTriggers ? (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={isActivatingAgentTriggers}
                      onClick={() => void handleActivateAgentTriggers()}
                      className="h-8 justify-center"
                    >
                      {isActivatingAgentTriggers ? (
                        <RefreshCcw className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Zap className="h-3.5 w-3.5" />
                      )}
                      Activate
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={isTestingAgentEvent}
                      onClick={() => void handleTestAgentEvent()}
                      className="h-8 justify-center"
                    >
                      {isTestingAgentEvent ? (
                        <RefreshCcw className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <PlayCircle className="h-3.5 w-3.5" />
                      )}
                      Test event
                    </Button>
                  </div>
                ) : null}
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-md bg-muted/50 px-2 py-2">
                    <p className="text-[11px] text-muted-foreground">Tools</p>
                    <p className="mt-0.5 text-sm font-medium text-foreground">
                      {agentPlan.tools?.length ?? 0}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {compiledAgentToolCount} compiled
                    </p>
                  </div>
                  <div className="rounded-md bg-muted/50 px-2 py-2">
                    <p className="text-[11px] text-muted-foreground">
                      Triggers
                    </p>
                    <p className="mt-0.5 text-sm font-medium text-foreground">
                      {agentPlan.triggers?.length ?? 0}
                    </p>
                  </div>
                </div>
                {agentCompileError ? (
                  <p className="mt-2 text-xs text-destructive">
                    {agentCompileError}
                  </p>
                ) : null}
                {Array.isArray(agentPlan.runtime_config_json?.missingConnections) &&
                agentPlan.runtime_config_json.missingConnections.length > 0 ? (
                  <p className="mt-2 text-xs leading-5 text-amber-700 dark:text-amber-400">
                    Missing:{" "}
                    {agentPlan.runtime_config_json.missingConnections.join(", ")}
                  </p>
                ) : null}
                {toolCompileFallbacks.length > 0 ? (
                  <p className="mt-2 text-xs leading-5 text-amber-700 dark:text-amber-400">
                    Tool fallback: {toolCompileFallbacks.length} step
                    {toolCompileFallbacks.length === 1 ? "" : "s"} still plan
                    at runtime.
                  </p>
                ) : null}
                {agentPlan.triggers?.some((trigger) => trigger.external_trigger_id) ? (
                  <p className="mt-2 text-xs leading-5 text-emerald-700 dark:text-emerald-400">
                    Active trigger:{" "}
                    {
                      agentPlan.triggers.find(
                        (trigger) => trigger.external_trigger_id
                      )?.external_trigger_id
                    }
                  </p>
                ) : null}
                {agentPlan.triggers?.some((trigger) => trigger.error) ? (
                  <p className="mt-2 text-xs leading-5 text-destructive">
                    Trigger error:{" "}
                    {agentPlan.triggers.find((trigger) => trigger.error)?.error}
                  </p>
                ) : null}
              </div>

              <div className="rounded-lg border border-border bg-background px-3 py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    Runtime
                  </p>
                  <Badge variant={pendingAgentApprovals.length > 0 ? "amber" : "blue"}>
                    {pendingAgentApprovals.length > 0
                      ? "Waiting approval"
                      : hasCompiledAgentTools
                        ? "Live tools"
                        : "Dry run"}
                  </Badge>
                </div>
                <p className="mt-2 text-sm leading-6 text-foreground">
                  Manual runs create persisted run logs. Compiled Composio action steps can execute live when the plan has enough detail; unclear or internal steps are recorded safely.
                </p>
              </div>

              <div className="rounded-lg border border-border bg-background px-3 py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    Goal
                  </p>
                  <Badge variant="blue">
                    {agentBlueprint?.builderSource === "model"
                      ? "AI built"
                      : "Draft"}
                  </Badge>
                </div>
                <p className="mt-2 text-sm leading-6 text-foreground">
                  {agentBlueprint?.goal || agentPlan.goal || "No goal captured yet."}
                </p>
              </div>

              <div className="rounded-lg border border-border bg-background px-3 py-3">
                <p className="text-xs font-medium text-muted-foreground">
                  Trigger
                </p>
                <p className="mt-2 text-sm font-medium text-foreground">
                  {agentBlueprint?.trigger?.type ?? "Manual"}
                </p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {agentBlueprint?.trigger?.description ??
                    "Run manually until an app event or schedule is configured."}
                </p>
              </div>

              <div className="rounded-lg border border-border bg-background px-3 py-3">
                <p className="text-xs font-medium text-muted-foreground">
                  Required apps
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {agentBlueprint?.required_apps?.length ? (
                    agentBlueprint.required_apps.map((app) => (
                      <span
                        key={app}
                        className="inline-flex h-6 items-center rounded-md border border-border bg-card px-2 text-xs text-foreground"
                      >
                        {app}
                      </span>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      No connected app required yet.
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-border bg-background px-3 py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    Agent nodes
                  </p>
                  <span className="text-xs text-muted-foreground">
                    {agentBlueprintNodes.length}
                  </span>
                </div>
                <div className="mt-3 space-y-3">
                  {agentBlueprintNodes.map((node, index) => {
                    const runtimeLabel = formatRuntimeMs(
                      node.runtime?.expected_ms
                    )
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

                    return (
                    <div key={node.id ?? `${node.name}-${index}`} className="flex gap-2">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-muted text-[11px] font-medium text-muted-foreground">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="text-sm font-medium text-foreground">
                            {node.name || `Node ${index + 1}`}
                          </p>
                          <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] capitalize text-muted-foreground">
                            {node.type ?? "action"}
                          </span>
                          {(node.app ?? node.provider) ? (
                            <span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-[11px] text-blue-700">
                              {node.app ?? node.provider}
                            </span>
                          ) : null}
                          {runtimeLabel ? (
                            <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                              ~{runtimeLabel}
                            </span>
                          ) : null}
                          {node.status ? (
                            <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                              {node.status.replaceAll("_", " ")}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                          {node.prompt || "No node description yet."}
                        </p>
                        <div className="mt-2 space-y-1">
                          {actions.slice(0, 2).map((action, actionIndex) => {
                            const actionRuntime = formatRuntimeMs(
                              action.runtime_ms
                            )
                            return (
                              <div
                                key={action.id ?? `${action.name}-${actionIndex}`}
                                className="rounded-md border border-border bg-card px-2 py-1.5"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <p className="truncate text-xs font-medium text-foreground">
                                    {action.name || `Action ${actionIndex + 1}`}
                                  </p>
                                  {actionRuntime ? (
                                    <span className="shrink-0 text-[11px] text-muted-foreground">
                                      ~{actionRuntime}
                                    </span>
                                  ) : null}
                                </div>
                                {action.prompt ? (
                                  <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-muted-foreground">
                                    {action.prompt}
                                  </p>
                                ) : null}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                    )
                  })}
                  {!agentBlueprintNodes.length ? (
                    <p className="text-xs text-muted-foreground">
                      No agent nodes captured yet.
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="rounded-lg border border-border bg-background px-3 py-3">
                <p className="text-xs font-medium text-muted-foreground">
                  Approvals
                </p>
                <p className="mt-2 text-sm font-medium text-foreground">
                  {agentBlueprint?.approval_policy?.mode ?? "design_time"}
                </p>
                <div className="mt-2 space-y-1.5">
                  {(agentBlueprint?.approval_policy?.require_approval_for ?? []).map(
                    (item) => (
                      <p key={item} className="text-xs leading-5 text-muted-foreground">
                        {item}
                      </p>
                    )
                  )}
                  {!agentBlueprint?.approval_policy?.require_approval_for?.length ? (
                    <p className="text-xs text-muted-foreground">
                      No approval rules yet.
                    </p>
                  ) : null}
                </div>
                {pendingAgentApprovals.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    {pendingAgentApprovals.map((approval) => (
                      <div
                        key={approval.id}
                        className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 dark:border-amber-500/30 dark:bg-amber-500/10"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-amber-900 dark:text-amber-100">
                              {approval.action_json?.preview?.title ??
                                approval.action_json?.stepName ??
                                "Pending action"}
                            </p>
                            <p className="mt-1 text-[11px] leading-4 text-amber-800 dark:text-amber-200">
                              {approval.action_json?.preview?.appName ||
                              approval.action_json?.appName
                                ? `${approval.action_json?.preview?.appName ?? approval.action_json?.appName} action`
                                : "Agent action"}
                            </p>
                            {approval.action_json?.preview?.instruction ? (
                              <p className="mt-1 text-[11px] leading-4 text-amber-800 dark:text-amber-200">
                                {approval.action_json.preview.instruction}
                              </p>
                            ) : null}
                          </div>
                          <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[11px] text-amber-900 dark:bg-amber-500/20 dark:text-amber-100">
                            Waiting
                          </span>
                        </div>
                        <div className="mt-2 flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            disabled={resolvingApprovalId === approval.id}
                            onClick={() =>
                              void handleResolveAgentApproval(
                                approval.id,
                                "approved"
                              )
                            }
                            className="h-7 flex-1"
                          >
                            Approve
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={resolvingApprovalId === approval.id}
                            onClick={() =>
                              void handleResolveAgentApproval(
                                approval.id,
                                "rejected"
                              )
                            }
                            className="h-7 flex-1"
                          >
                            Reject
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
                {resolvedAgentApprovals.length > 0 ? (
                  <div className="mt-3 space-y-1.5">
                    {resolvedAgentApprovals.slice(0, 4).map((approval) => (
                      <div
                        key={approval.id}
                        className="flex items-center justify-between gap-2 rounded-lg border border-border/70 bg-card px-2.5 py-2"
                      >
                        <p className="truncate text-xs text-muted-foreground">
                          {approval.action_json?.preview?.title ??
                            approval.action_json?.stepName ??
                            "Resolved action"}
                        </p>
                        <span className="text-[11px] text-muted-foreground">
                          {approval.status}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              {agentBlueprint?.missing_inputs?.length ? (
                <div className="rounded-lg border border-border bg-background px-3 py-3">
                  <p className="text-xs font-medium text-muted-foreground">
                    Missing inputs
                  </p>
                  <div className="mt-2 space-y-1.5">
                    {agentBlueprint.missing_inputs.map((item) => (
                      <p key={item} className="text-xs leading-5 text-amber-700 dark:text-amber-400">
                        {item}
                      </p>
                    ))}
                  </div>
                </div>
              ) : null}

              {agentBlueprint?.safety_notes?.length ? (
                <div className="rounded-lg border border-border bg-background px-3 py-3">
                  <p className="text-xs font-medium text-muted-foreground">
                    Safety notes
                  </p>
                  <div className="mt-2 space-y-1.5">
                    {agentBlueprint.safety_notes.map((item) => (
                      <p key={item} className="text-xs leading-5 text-muted-foreground">
                        {item}
                      </p>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="rounded-lg border border-border bg-background px-3 py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    Memory
                  </p>
                  <span className="text-xs text-muted-foreground">
                    {agentPlan.memory?.length ?? 0}
                  </span>
                </div>
                <div className="mt-3 space-y-2">
                  {agentPlan.memory?.length ? (
                    agentPlan.memory.slice(0, 4).map((memory) => (
                      <div
                        key={memory.id}
                        className="rounded-lg border border-border/70 bg-card px-2.5 py-2"
                      >
                        <p className="text-xs font-medium text-foreground">
                          {memory.scope}.{memory.key}
                        </p>
                        <p className="mt-1 break-words text-[11px] leading-4 text-muted-foreground">
                          {formatAgentMemoryValue(memory.value_json)}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Memory appears after successful runs.
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-border bg-background px-3 py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    Run history
                  </p>
                  <span className="text-xs text-muted-foreground">
                    {agentPlan.runs?.length ?? 0}
                  </span>
                </div>
                <div className="mt-3 space-y-2">
                  {agentPlan.runs?.length ? (
                    agentPlan.runs.slice(0, 5).map((run) => (
                      <div
                        key={run.id}
                        className="rounded-lg border border-border/70 bg-card px-2.5 py-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-medium text-foreground">
                            {run.status}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {new Date(run.created_at).toLocaleTimeString()}
                          </p>
                        </div>
                        {run.error ? (
                          <p className="mt-1 text-xs leading-5 text-destructive">
                            {run.error}
                          </p>
                        ) : null}
                        {getAgentRunSummary(run) ? (
                          <p className="mt-1 text-xs leading-5 text-muted-foreground">
                            {getAgentRunSummary(run)}
                          </p>
                        ) : null}
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Run this agent to create its first runtime log.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </aside>
        )}
        {showTelegramAgentPanel && (
          <aside className="flex h-full w-[360px] shrink-0 flex-col border-l border-border bg-card">
            <div className="border-b border-border px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-background text-sm font-semibold text-muted-foreground">
                    {telegramAgentAvatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={telegramAgentAvatarUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      "TG"
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {telegramAgentBlueprint?.channel?.connectionName ??
                        telegramAgentBlueprint?.agentName ??
                        "Telegram agent"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {telegramWebhookStatus?.bot ??
                        telegramAgentBlueprint?.channel?.bot ??
                        "Connected bot"}
                    </p>
                  </div>
                </div>
                <Badge
                  variant={
                    telegramWebhookStatus?.webhookConfigured ? "green" : "amber"
                  }
                >
                  {telegramWebhookStatus?.webhookConfigured ? "Live" : "Setup"}
                </Badge>
              </div>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
              <div className="rounded-lg border border-border bg-background px-3 py-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Bot
                    </p>
                    <p className="mt-1 text-sm font-medium text-foreground">
                      {telegramWebhookStatus?.bot ??
                        telegramAgentBlueprint?.channel?.bot ??
                        "Telegram"}
                    </p>
                  </div>
                  {telegramBotLink ? (
                    <a
                      href={telegramBotLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                    >
                      Open bot
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  ) : null}
                </div>
                <p className="mt-3 text-xs leading-5 text-muted-foreground">
                  Telegram keeps one chat per bot. This opens the same bot and
                  starts this agent context.
                </p>
              </div>

              <div className="rounded-lg border border-border bg-background px-3 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Webhook
                    </p>
                    <p className="mt-1 text-sm font-medium text-foreground">
                      {telegramWebhookStatus?.webhookConfigured
                        ? "Telegram points to this agent"
                        : "Activation needed"}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    disabled={isTelegramWebhookLoading}
                    onClick={() => void refreshTelegramWebhookStatus()}
                    aria-label="Refresh Telegram webhook status"
                  >
                    <RefreshCcw
                      className={cn(
                        "h-3.5 w-3.5",
                        isTelegramWebhookLoading && "animate-spin"
                      )}
                    />
                  </Button>
                </div>

                <Input
                  readOnly
                  value={
                    telegramWebhookStatus?.expectedWebhookUrl ??
                    telegramAgentBlueprint?.channel?.webhookUrl ??
                    ""
                  }
                  className="mt-3 h-8 bg-card text-xs"
                />

                {telegramWebhookStatus?.lastErrorMessage ? (
                  <p className="mt-2 text-xs text-destructive">
                    {telegramWebhookStatus.lastErrorMessage}
                  </p>
                ) : null}

                {telegramWebhookError ? (
                  <p className="mt-2 text-xs text-destructive">
                    {telegramWebhookError}
                  </p>
                ) : null}

                <Button
                  type="button"
                  className="mt-3 w-full"
                  disabled={
                    isRunningWorkflow ||
                    isActivatingTelegramWebhook ||
                    isActivatingComposioTrigger
                  }
                  onClick={() => handleRunWorkflow()}
                >
                  {isRunningWorkflow ||
                  isActivatingTelegramWebhook ||
                  isActivatingComposioTrigger ? (
                    <RefreshCcw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <PlayCircle className="h-3.5 w-3.5" />
                  )}
                  Run workflow to go live
                </Button>
              </div>

              <div className="rounded-lg border border-border bg-background px-3 py-3">
                <p className="text-xs font-medium text-muted-foreground">
                  Brain
                </p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-foreground">
                    {telegramAgentBlueprint?.brain?.mode === "agent_api"
                      ? "Agent API"
                      : "Atmet model"}
                  </p>
                  <Badge variant="blue">
                    {telegramAgentBlueprint?.behavior?.autoReply === false
                      ? "Manual"
                      : "Auto reply"}
                  </Badge>
                </div>
                {telegramAgentBlueprint?.brain?.mode === "agent_api" &&
                telegramAgentBlueprint.brain.agentApiUrl ? (
                  <p className="mt-2 text-xs break-all text-muted-foreground">
                    {telegramAgentBlueprint.brain.agentApiUrl}
                  </p>
                ) : null}
              </div>

              <div className="rounded-lg border border-border bg-background px-3 py-3">
                <p className="text-xs font-medium text-muted-foreground">
                  Instructions
                </p>
                <p className="mt-2 text-sm leading-6 whitespace-pre-wrap text-foreground">
                  {telegramAgentBlueprint?.behavior?.instructions ??
                    selectedNode?.prompt}
                </p>
              </div>

              <div className="rounded-lg border border-border bg-background px-3 py-3">
                <p className="text-xs font-medium text-muted-foreground">
                  Test
                </p>
                <p className="mt-1 text-sm leading-6 text-foreground">
                  Open the bot, press Start, then send a message. The reply
                  should come from this automation while the webhook badge is
                  Live.
                </p>
              </div>
            </div>
          </aside>
        )}
      </div>
      {isChatOpen && activeChatNode && (
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
          <div
            ref={chatContainerRef}
            className="pointer-events-auto w-[min(760px,calc(100vw-1.5rem))]"
          >
            {mountedChatNodeIds.map((nodeId) => {
              const chatNode = nodes.find((node) => node.id === nodeId)
              if (!chatNode) return null
              return (
                <div
                  key={nodeId}
                  className={nodeId === activeChatNodeId ? "block" : "hidden"}
                >
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-x-3 top-2 z-20 flex items-center justify-between text-xs text-foreground">
                      <span className="truncate">
                        Chatting with{" "}
                        <span className="font-medium">{chatNode.stepName}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsChatOpen(false)}
                        className="pointer-events-auto inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-background/40 hover:text-foreground"
                        aria-label="Close chat"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="pt-5">
                      <AIPrompt
                        chatId={chatNode.chatId ?? null}
                        persistChatListEntry={false}
                        hideGreeting
                        glassComposer
                        userFullName={chatNode.owner}
                        enableCreateAgent={false}
                        onChatCreated={(chatId) =>
                          attachChatToNode(nodeId, chatId)
                        }
                        workflowPlannerContext={{
                          projectId,
                          activeNode: {
                            name: chatNode.stepName,
                            type: chatNode.nodeType,
                            app: chatNode.provider,
                            prompt: chatNode.prompt,
                          },
                          currentNodes: nodes.map((node) => ({
                            name: node.stepName,
                            type: node.nodeType,
                            app: node.provider,
                            prompt: node.prompt,
                          })),
                        }}
                        onWorkflowNodesPlanned={(plannedNodes, reply) =>
                          applyWorkflowNodePlan(nodeId, plannedNodes, reply)
                        }
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <Dialog open={agentEditorOpen} onOpenChange={setAgentEditorOpen}>
        <DialogContent className="max-h-[85vh] w-[min(620px,calc(100vw-2rem))] overflow-hidden p-0 sm:max-w-[620px]">
          <DialogHeader className="border-b border-border px-5 py-4">
            <DialogTitle className="text-lg">
              Edit Agent
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[calc(85vh-128px)] space-y-4 overflow-y-auto px-5 py-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Name
              </label>
              <Input
                value={agentEditorDraft.name}
                onChange={(event) =>
                  setAgentEditorDraft((draft) => ({
                    ...draft,
                    name: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Description
              </label>
              <Textarea
                value={agentEditorDraft.description}
                onChange={(event) =>
                  setAgentEditorDraft((draft) => ({
                    ...draft,
                    description: event.target.value,
                  }))
                }
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Goal
              </label>
              <Textarea
                value={agentEditorDraft.goal}
                onChange={(event) =>
                  setAgentEditorDraft((draft) => ({
                    ...draft,
                    goal: event.target.value,
                  }))
                }
                rows={4}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Instructions
              </label>
              <Textarea
                value={agentEditorDraft.instructions}
                onChange={(event) =>
                  setAgentEditorDraft((draft) => ({
                    ...draft,
                    instructions: event.target.value,
                  }))
                }
                rows={6}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Status
              </label>
              <select
                value={agentEditorDraft.status}
                onChange={(event) =>
                  setAgentEditorDraft((draft) => ({
                    ...draft,
                    status: event.target.value as AgentPlan["status"],
                  }))
                }
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none"
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Approval mode
                </label>
                <select
                  value={agentEditorDraft.approvalMode}
                  onChange={(event) =>
                    setAgentEditorDraft((draft) => ({
                      ...draft,
                      approvalMode: event.target.value,
                    }))
                  }
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none"
                >
                  <option value="design_time">Design time</option>
                  <option value="per_run">Every run</option>
                  <option value="none">None</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Approval rules
                </label>
                <Textarea
                  value={agentEditorDraft.approvalRules}
                  onChange={(event) =>
                    setAgentEditorDraft((draft) => ({
                      ...draft,
                      approvalRules: event.target.value,
                    }))
                  }
                  rows={4}
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setAgentEditorOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isSavingAgentPlan || !agentEditorDraft.name.trim()}
              onClick={() => void handleSaveAgentPlan()}
            >
              {isSavingAgentPlan ? (
                <RefreshCcw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={filesDialogOpen} onOpenChange={setFilesDialogOpen}>
        <DialogContent className="max-w-lg p-0">
          <DialogHeader className="border-b border-border px-5 py-4">
            <DialogTitle className="text-lg">
              Files · {selectedNode?.stepName ?? "Node"}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[420px] space-y-2 overflow-y-auto px-5 py-4">
            {selectedNode?.files.length ? (
              selectedNode.files.map((fileName) => (
                <div
                  key={fileName}
                  className="flex items-center justify-between rounded-lg border border-border/70 bg-card px-3 py-2"
                >
                  <span className="truncate text-sm text-foreground">
                    {fileName}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Attached
                  </span>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
                No files attached to this node yet.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={executionLogOpen} onOpenChange={setExecutionLogOpen}>
        <DialogContent className="max-h-[85vh] w-[min(980px,calc(100vw-2rem))] overflow-hidden p-0 sm:max-w-[980px]">
          <DialogHeader className="border-b border-border px-5 py-4">
            <DialogTitle className="text-lg">
              Execution Log · {project.title}
            </DialogTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Runtime visibility for the current workflow graph and latest node
              activity.
            </p>
          </DialogHeader>
          <div className="max-h-[calc(85vh-72px)] space-y-5 overflow-y-auto px-5 py-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-lg border border-border bg-card px-3 py-3">
                <p className="text-xs font-medium text-muted-foreground">
                  Latest run
                </p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {lastExecutionLabel}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-card px-3 py-3">
                <p className="text-xs font-medium text-muted-foreground">
                  Completion
                </p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {doneSteps}/{nodes.length} steps ({completionPercent}%)
                </p>
              </div>
              <div className="rounded-lg border border-border bg-card px-3 py-3">
                <p className="text-xs font-medium text-muted-foreground">
                  Tokens processed
                </p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {totalTokenCount.toLocaleString()}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-card px-3 py-3">
                <p className="text-xs font-medium text-muted-foreground">
                  Connections
                </p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {edges.length} wire{edges.length === 1 ? "" : "s"}
                </p>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
              <div className="rounded-lg border border-border bg-card p-4">
                <p className="text-sm font-semibold text-foreground">
                  Execution timeline
                </p>
                <div className="mt-3 space-y-3">
                  {executionTimeline.map((event) => (
                    <div key={event.title} className="flex gap-2">
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-muted-foreground/60" />
                      <div>
                        <p className="text-xs font-medium text-foreground">
                          {event.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {event.detail}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-border bg-card p-4">
                <p className="text-sm font-semibold text-foreground">
                  Run metadata
                </p>
                <div className="mt-3 space-y-2 text-xs text-muted-foreground">
                  <p>
                    Execution mix: {idleNodeCount} idle · {runningNodeCount}{" "}
                    running · {successNodeCount} success · {errorNodeCount}{" "}
                    error
                  </p>
                  <p>Publish state: {publishState}</p>
                  <p>Auto-run: {runScheduleLabel}</p>
                  <p>
                    Node types: {actionNodeCount} action · {triggerNodeCount}{" "}
                    trigger
                  </p>
                  {hasComposioTriggerNode ? (
                    <p>
                      Composio triggers:{" "}
                      {composioTriggerError
                        ? composioTriggerError
                        : isActivatingComposioTrigger
                          ? "Activating..."
                          : `${composioTriggerRegistrations.length} ready to register on Run`}
                    </p>
                  ) : null}
                  <p>
                    Coverage: {uniqueAppsCount} apps · {uniqueSkillsCount}{" "}
                    skills · {totalFileCount} files
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-foreground">
                  Node run details
                </p>
                <p className="text-xs text-muted-foreground">
                  {orderedNodes.length} nodes
                </p>
              </div>
              <div className="mt-3 space-y-2">
                {orderedNodes.map((node, index) => (
                  <div
                    key={node.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border/80 bg-background px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {index + 1}. {node.stepName}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {[
                          node.provider,
                          node.owner,
                          node.tokenCount ? `${node.tokenCount} tokens` : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge
                        variant={
                          node.executionStatus === "success"
                            ? "green"
                            : node.executionStatus === "running"
                              ? "amber"
                              : node.executionStatus === "error"
                                ? "red"
                                : "neutral"
                        }
                      >
                        {node.executionStatus === "success"
                          ? "Success"
                          : node.executionStatus === "running"
                            ? "Running"
                            : node.executionStatus === "error"
                              ? "Error"
                              : "Idle"}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground">
                        {node.lastRan}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
