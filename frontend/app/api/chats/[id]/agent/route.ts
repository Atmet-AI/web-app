import { type NextRequest } from "next/server"
import type { SupabaseClient } from "@supabase/supabase-js"
import { z } from "zod"

import { getUser } from "@/lib/api/auth"
import { ok, Errors } from "@/lib/api/response"
import { getOpenAIClient } from "@/lib/openai"

const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(40000),
})

const createAgentSchema = z.object({
  sourceMessageId: z.number().optional(),
  messages: z.array(chatMessageSchema).min(1).max(80).optional(),
})

const agentBuilderStepSchema = z.object({
  id: z.string().min(1),
  node_id: z.string().min(1).optional(),
  action_id: z.string().min(1).optional(),
  name: z.string().min(1).max(120),
  type: z.enum(["trigger", "action", "approval", "decision", "memory"]),
  provider: z.string().max(80).nullable().optional(),
  app: z.string().max(80).nullable().optional(),
  trigger_slug: z.string().max(160).nullable().optional(),
  prompt: z.string().max(1000),
  runtime_ms: z.number().int().positive().max(900000).optional(),
  status: z.enum(["draft", "needs_connection", "needs_input", "ready"]).default("draft"),
})

const agentBuilderNodeActionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(120),
  prompt: z.string().max(1000),
  tool_hint: z.string().max(160).nullable().optional(),
  runtime_ms: z.number().int().positive().max(900000).default(30000),
})

const agentBuilderNodeSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(120),
  type: z.enum(["trigger", "action"]),
  app: z.string().max(80).nullable().optional(),
  provider: z.string().max(80).nullable().optional(),
  trigger_slug: z.string().max(160).nullable().optional(),
  prompt: z.string().max(1000),
  runtime: z
    .object({
      expected_ms: z.number().int().positive().max(900000).default(30000),
      timeout_ms: z.number().int().positive().max(900000).default(120000),
    })
    .default({ expected_ms: 30000, timeout_ms: 120000 }),
  actions: z.array(agentBuilderNodeActionSchema).min(1).max(2),
  status: z.enum(["draft", "needs_connection", "needs_input", "ready"]).default("draft"),
})

const agentBuilderBlueprintSchema = z.object({
  name: z.string().min(1).max(72),
  goal: z.string().min(1).max(1000),
  summary: z.string().min(1).max(500),
  trigger: z
    .object({
      type: z.string().max(80),
      description: z.string().max(500),
    })
    .nullable(),
  required_apps: z.array(z.string().min(1).max(80)).max(20).default([]),
  nodes: z.array(agentBuilderNodeSchema).max(8).default([]),
  steps: z.array(agentBuilderStepSchema).max(12).default([]),
  approval_policy: z.object({
    require_approval_for: z.array(z.string().min(1).max(120)).max(12),
    mode: z.enum(["design_time", "per_run", "none"]),
  }),
  missing_inputs: z.array(z.string().min(1).max(160)).max(12).default([]),
  safety_notes: z.array(z.string().min(1).max(200)).max(12).default([]),
}).refine((blueprint) => blueprint.nodes.length > 0 || blueprint.steps.length > 0, {
  message: "Blueprint needs at least one node or step.",
})

type AgentBuilderBlueprint = z.infer<typeof agentBuilderBlueprintSchema>
type AgentBuilderNode = z.infer<typeof agentBuilderNodeSchema>
type AgentBuilderStep = z.infer<typeof agentBuilderStepSchema>

async function isChatParticipant(
  supabase: SupabaseClient,
  chatId: string,
  userId: string
) {
  const { data, error } = await supabase
    .from("chats_users")
    .select("chat_id")
    .eq("chat_id", chatId)
    .eq("user_id", userId)
    .maybeSingle()

  if (error) return null
  return Boolean(data)
}

function compactTitle(value: string, fallback: string) {
  const normalized = value.replace(/\s+/g, " ").trim()
  if (!normalized) return fallback
  return normalized.length > 72 ? `${normalized.slice(0, 72)}...` : normalized
}

function buildNodeDescription(
  messages: Array<{ role: "user" | "assistant"; content: string }>
) {
  const userMessages = messages.filter((m) => m.role === "user")
  const assistantMessages = messages.filter((m) => m.role === "assistant")
  const parts: string[] = []
  if (userMessages.length > 0) {
    const preview = userMessages[0].content.replace(/\s+/g, " ").trim()
    parts.push(preview.length > 120 ? `${preview.slice(0, 120)}...` : preview)
  }
  parts.push(
    `${messages.length} messages (${userMessages.length} user · ${assistantMessages.length} AI)`
  )
  return parts.join(" — ")
}

function buildTranscriptPreview(
  messages: Array<{ role: "user" | "assistant"; content: string }>
) {
  return messages
    .slice(-30)
    .map((message) => ({
      role: message.role,
      content:
        message.content.length > 3000
          ? `${message.content.slice(0, 3000)}...`
          : message.content,
    }))
}

function estimateRuntimeMs(type: "trigger" | "action", prompt: string) {
  const words = prompt.split(/\s+/).filter(Boolean).length
  if (type === "trigger") return 5000
  if (/\b(send|create|update|append|post|message|email)\b/i.test(prompt)) {
    return 30000
  }
  return Math.min(60000, Math.max(15000, words * 700))
}

function stepsToNodes(steps: AgentBuilderStep[]): AgentBuilderNode[] {
  return steps.map((step, index) => {
    const type = step.type === "trigger" ? "trigger" : "action"
    const runtimeMs = step.runtime_ms ?? estimateRuntimeMs(type, step.prompt)
    return {
      id: step.node_id ?? `node-${index + 1}`,
      name: step.name,
      type,
      app: step.app ?? step.provider ?? null,
      provider: step.provider ?? step.app ?? null,
      trigger_slug: step.trigger_slug ?? null,
      prompt: step.prompt,
      runtime: {
        expected_ms: runtimeMs,
        timeout_ms: Math.max(60000, runtimeMs * 3),
      },
      actions: [
        {
          id: step.action_id ?? `action-${index + 1}`,
          name: step.name,
          prompt: step.prompt,
          tool_hint: step.trigger_slug ?? null,
          runtime_ms: runtimeMs,
        },
      ],
      status: step.status,
    }
  })
}

function nodesToSteps(nodes: AgentBuilderNode[]): AgentBuilderStep[] {
  return nodes.flatMap((node, nodeIndex) =>
    node.actions.map((action, actionIndex) => ({
      id: `${node.id}-${action.id}`,
      node_id: node.id,
      action_id: action.id,
      name:
        node.actions.length > 1
          ? `${node.name}: ${action.name}`
          : node.name,
      type: node.type,
      provider: node.provider ?? node.app ?? null,
      app: node.app ?? node.provider ?? null,
      trigger_slug: node.type === "trigger" ? node.trigger_slug ?? null : null,
      prompt: action.prompt || node.prompt,
      runtime_ms: action.runtime_ms ?? node.runtime.expected_ms,
      status: node.status,
    }))
  )
}

function normalizeAgentBuilderBlueprint(
  blueprint: AgentBuilderBlueprint
): AgentBuilderBlueprint {
  const nodes =
    blueprint.nodes.length > 0 ? blueprint.nodes : stepsToNodes(blueprint.steps)
  return {
    ...blueprint,
    nodes,
    steps: nodesToSteps(nodes),
    required_apps:
      blueprint.required_apps.length > 0
        ? blueprint.required_apps
        : Array.from(
            new Set(
              nodes
                .map((node) => node.app ?? node.provider)
                .filter((value): value is string => Boolean(value))
            )
          ),
  }
}

async function draftAgentBlueprintWithModel({
  messages,
  fallbackName,
  detectedTrigger,
}: {
  messages: Array<{ role: "user" | "assistant"; content: string }>
  fallbackName: string
  detectedTrigger: ReturnType<typeof detectComposioTrigger>
}): Promise<AgentBuilderBlueprint | null> {
  try {
    const completion = await getOpenAIClient().chat.completions.create({
      model: process.env.OPENAI_MODEL ?? "gpt-4o",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: [
            "You are Atmet's Agent Builder.",
            "Convert the user's conversation into a deployable workspace agent blueprint.",
            "Return only valid JSON. Do not include markdown.",
            "The agent is not a chatbot only: it needs goal, trigger, apps, steps, approvals, missing inputs, and safety notes.",
            "Model the workflow as app-grouped nodes. Each node represents one app, is either trigger or action, has runtime estimates, and contains one or two app actions.",
            "For example: Gmail received email to Telegram message should be exactly two nodes: Gmail trigger, Telegram action.",
            "If the user already mentioned an app or skill, include it directly in the node model. Do not add a missing input, approval rule, or safety note just to ask whether the mentioned app or skill may be used.",
            "Only use missing_inputs for required operational details like inbox, channel, recipient, spreadsheet, or schedule. OAuth connection can be represented by needs_connection status.",
            "Use short practical node names. Mark nodes that need a connected app as needs_connection.",
          ].join(" "),
        },
        {
          role: "user",
          content: JSON.stringify({
            fallbackName,
            detectedTrigger,
            expectedShape: {
              name: "short agent name",
              goal: "what this agent owns",
              summary: "one sentence explanation",
              trigger: {
                type: "manual | schedule | webhook | app_event | none",
                description: "when the agent should run",
              },
              required_apps: ["Gmail", "HubSpot"],
              nodes: [
                {
                  id: "node-1",
                  name: "Watch for new invoices",
                  type: "trigger",
                  provider: "Gmail",
                  app: "Gmail",
                  trigger_slug: "GMAIL_NEW_GMAIL_MESSAGE",
                  prompt: "What this app node does",
                  runtime: {
                    expected_ms: 5000,
                    timeout_ms: 60000,
                  },
                  actions: [
                    {
                      id: "action-1",
                      name: "Detect matching email",
                      prompt: "Read the incoming Gmail event and identify invoices.",
                      tool_hint: "Gmail trigger",
                      runtime_ms: 5000,
                    },
                  ],
                  status: "needs_connection",
                },
              ],
              steps: [],
              approval_policy: {
                require_approval_for: [
                  "sending external messages",
                  "updating CRM records",
                ],
                mode: "design_time",
              },
              missing_inputs: ["Which inbox should the agent watch?"],
              safety_notes: ["Review risky external writes before activation."],
            },
            transcript: buildTranscriptPreview(messages),
          }),
        },
      ],
    })

    const content = completion.choices[0]?.message?.content
    if (!content) return null

    const parsed = agentBuilderBlueprintSchema.safeParse(JSON.parse(content))
    if (!parsed.success) {
      console.error("Agent Builder returned invalid blueprint", parsed.error.issues)
      return null
    }

    return parsed.data
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("Agent Builder model fallback used:", message)
    return null
  }
}

function buildFallbackAgentBlueprint({
  agentName,
  description,
  firstUserMessage,
  requiredApps,
  steps,
}: {
  agentName: string
  description: string
  firstUserMessage: string
  requiredApps: string[]
  steps: Array<{
    name: string
    nodeType: "Trigger" | "Action"
    provider: string
    model?: string
    prompt: string
    usedApps: string[]
  }>
}): AgentBuilderBlueprint {
  const fallbackSteps = steps.map((step, index) => ({
    id: `step-${index + 1}`,
    name: step.name,
    type: step.nodeType.toLowerCase() as "trigger" | "action",
    provider: step.provider,
    app: step.usedApps[0] ?? null,
    trigger_slug: step.nodeType === "Trigger" ? step.model ?? null : null,
    prompt: step.prompt,
    runtime_ms: estimateRuntimeMs(
      step.nodeType.toLowerCase() as "trigger" | "action",
      step.prompt
    ),
    status: step.usedApps.length > 0 ? "needs_connection" as const : "draft" as const,
  }))

  return normalizeAgentBuilderBlueprint({
    name: agentName,
    goal: firstUserMessage || agentName,
    summary: description,
    trigger: steps.some((step) => step.nodeType === "Trigger")
      ? {
          type: "app_event",
          description: steps.find((step) => step.nodeType === "Trigger")?.prompt ?? "Run when the connected app event happens.",
        }
      : {
          type: "manual",
          description: "Run manually until a trigger is configured.",
        },
    required_apps: requiredApps,
    nodes: stepsToNodes(fallbackSteps),
    steps: fallbackSteps,
    approval_policy: {
      require_approval_for: [
        "external messages",
        "record updates",
        "destructive actions",
      ],
      mode: "design_time",
    },
    missing_inputs: [],
    safety_notes: ["Review tool permissions before activating this agent."],
  })
}

function detectComposioTrigger(
  messages: Array<{ role: "user" | "assistant"; content: string }>
) {
  const transcript = messages.map((message) => message.content).join("\n")
  if (
    !/\b(when|whenever|every\s+time|trigger|watch|listen|monitor|on\s+new|received|arrives?|incoming|sent)\b/i.test(
      transcript
    )
  ) {
    return null
  }

  if (/\b(gmail|email|mailbox|inbox)\b/i.test(transcript)) {
    if (/\b(sent|send\s+from\s+my\s+gmail|outgoing)\b/i.test(transcript)) {
      return {
        provider: "Gmail",
        appName: "Gmail",
        name: "Email sent",
        slug: "GMAIL_EMAIL_SENT_TRIGGER",
        description:
          "Composio Gmail trigger for messages sent by the connected mailbox.",
      }
    }

    return {
      provider: "Gmail",
      appName: "Gmail",
      name: "New Gmail message",
      slug: "GMAIL_NEW_GMAIL_MESSAGE",
      description:
        "Composio Gmail trigger for newly received messages in the connected mailbox.",
    }
  }

  if (/\b(google\s*calendar|calendar|event|meeting)\b/i.test(transcript)) {
    if (
      /\b(starting|starts?\s+soon|before\s+an?\s+event|minutes?\s+before)\b/i.test(
        transcript
      )
    ) {
      return {
        provider: "Google Calendar",
        appName: "Google Calendar",
        name: "Calendar event starting soon",
        slug: "GOOGLECALENDAR_EVENT_STARTING_SOON_TRIGGER",
        description:
          "Composio Google Calendar trigger for events starting soon.",
      }
    }

    if (/\b(cancel|cancelled|canceled|deleted|removed)\b/i.test(transcript)) {
      return {
        provider: "Google Calendar",
        appName: "Google Calendar",
        name: "Calendar event canceled or deleted",
        slug: "GOOGLECALENDAR_EVENT_CANCELED_DELETED_TRIGGER",
        description:
          "Composio Google Calendar trigger for canceled or deleted events.",
      }
    }

    if (/\b(update|updated|changed|modified|change)\b/i.test(transcript)) {
      return {
        provider: "Google Calendar",
        appName: "Google Calendar",
        name: "Calendar event updated",
        slug: "GOOGLECALENDAR_GOOGLE_CALENDAR_EVENT_UPDATED_TRIGGER",
        description: "Composio Google Calendar trigger for updated events.",
      }
    }

    return {
      provider: "Google Calendar",
      appName: "Google Calendar",
      name: "Calendar event created",
      slug: "GOOGLECALENDAR_GOOGLE_CALENDAR_EVENT_CREATED_TRIGGER",
      description: "Composio Google Calendar trigger for newly created events.",
    }
  }

  if (/\b(google\s*sheets?|spreadsheet|worksheet|sheet)\b/i.test(transcript)) {
    if (/\b(row|rows)\b/i.test(transcript)) {
      return {
        provider: "Google Sheets",
        appName: "Google Sheets",
        name: "New Google Sheets row",
        slug: "GOOGLESHEETS_NEW_ROWS_TRIGGER",
        description: "Composio Google Sheets trigger for new rows in a sheet.",
      }
    }

    if (/\b(cell|range|value|values)\b/i.test(transcript)) {
      return {
        provider: "Google Sheets",
        appName: "Google Sheets",
        name: "Google Sheets cell range changed",
        slug: "GOOGLESHEETS_CELL_RANGE_VALUES_CHANGED_TRIGGER",
        description:
          "Composio Google Sheets trigger for changed values in a range.",
      }
    }

    return {
      provider: "Google Sheets",
      appName: "Google Sheets",
      name: "New Google spreadsheet created",
      slug: "GOOGLESHEETS_NEW_SPREADSHEET_CREATED_TRIGGER",
      description:
        "Composio Google Sheets trigger for newly created spreadsheets.",
    }
  }

  if (/\b(google\s*docs?|document|documents|doc)\b/i.test(transcript)) {
    if (/\b(keyword|phrase|contains?|appears?)\b/i.test(transcript)) {
      return {
        provider: "Google Docs",
        appName: "Google Docs",
        name: "Google Docs keyword detected",
        slug: "GOOGLEDOCS_KEYWORD_DETECTED_TRIGGER",
        description:
          "Composio Google Docs trigger for a keyword detected in a document.",
      }
    }

    if (/\b(update|updated|changed|modified|edit|edited)\b/i.test(transcript)) {
      return {
        provider: "Google Docs",
        appName: "Google Docs",
        name: "Google Doc updated",
        slug: "GOOGLEDOCS_DOCUMENT_UPDATED_TRIGGER",
        description: "Composio Google Docs trigger for updated documents.",
      }
    }

    return {
      provider: "Google Docs",
      appName: "Google Docs",
      name: "Google Doc created",
      slug: "GOOGLEDOCS_DOCUMENT_CREATED_TRIGGER",
      description: "Composio Google Docs trigger for newly created documents.",
    }
  }

  if (/\b(google\s*drive|drive|file|folder)\b/i.test(transcript)) {
    if (/\b(comment|commented|reply)\b/i.test(transcript)) {
      return {
        provider: "Google Drive",
        appName: "Google Drive",
        name: "Drive comment added",
        slug: "GOOGLEDRIVE_COMMENT_ADDED_TRIGGER",
        description: "Composio Google Drive trigger for new comments on files.",
      }
    }

    if (/\b(delete|deleted|trash|trashed|removed)\b/i.test(transcript)) {
      return {
        provider: "Google Drive",
        appName: "Google Drive",
        name: "Drive file deleted or trashed",
        slug: "GOOGLEDRIVE_FILE_DELETED_OR_TRASHED_TRIGGER",
        description:
          "Composio Google Drive trigger for deleted or trashed files.",
      }
    }

    if (/\b(update|updated|changed|modified|edit|edited)\b/i.test(transcript)) {
      return {
        provider: "Google Drive",
        appName: "Google Drive",
        name: "Drive file updated",
        slug: "GOOGLEDRIVE_FILE_UPDATED_TRIGGER",
        description: "Composio Google Drive trigger for updated files.",
      }
    }

    return {
      provider: "Google Drive",
      appName: "Google Drive",
      name: "Drive file created",
      slug: "GOOGLEDRIVE_FILE_CREATED_TRIGGER",
      description: "Composio Google Drive trigger for new files.",
    }
  }

  if (
    /\b(github|pull\s*request|PR\b|issue|repository|repo|branch|commit|workflow|action\s*run|release|star)\b/i.test(
      transcript
    )
  ) {
    if (/\b(pull\s*request|PR\b)\b/i.test(transcript)) {
      if (
        /\b(update|updated|changed|modified|review|reviewed)\b/i.test(
          transcript
        )
      ) {
        return {
          provider: "GitHub",
          appName: "GitHub",
          name: "GitHub pull request updated",
          slug: "GITHUB_PULL_REQUEST_UPDATED",
          description: "Composio GitHub trigger for updated pull requests.",
        }
      }

      return {
        provider: "GitHub",
        appName: "GitHub",
        name: "GitHub pull request created",
        slug: "GITHUB_PULL_REQUEST_CREATED",
        description: "Composio GitHub trigger for newly created pull requests.",
      }
    }

    if (/\b(issue|issues)\b/i.test(transcript)) {
      if (/\b(assign|assigned)\b/i.test(transcript)) {
        return {
          provider: "GitHub",
          appName: "GitHub",
          name: "GitHub issue assigned",
          slug: "GITHUB_ISSUE_ASSIGNED_TO_ME_TRIGGER",
          description:
            "Composio GitHub trigger for issues assigned to the connected user.",
        }
      }

      return {
        provider: "GitHub",
        appName: "GitHub",
        name: "GitHub issue created",
        slug: "GITHUB_ISSUE_CREATED_TRIGGER",
        description: "Composio GitHub trigger for newly created issues.",
      }
    }

    if (/\b(branch|branches)\b/i.test(transcript)) {
      return {
        provider: "GitHub",
        appName: "GitHub",
        name: "GitHub branch changed",
        slug: "GITHUB_BRANCH_CHANGED_TRIGGER",
        description: "Composio GitHub trigger for branch changes.",
      }
    }

    if (/\b(workflow|actions?|run|job)\b/i.test(transcript)) {
      return {
        provider: "GitHub",
        appName: "GitHub",
        name: "GitHub workflow run created",
        slug: "GITHUB_WORKFLOW_RUN_CREATED",
        description: "Composio GitHub trigger for new workflow runs.",
      }
    }

    if (/\b(star|stargazer)\b/i.test(transcript)) {
      return {
        provider: "GitHub",
        appName: "GitHub",
        name: "GitHub star added",
        slug: "GITHUB_STAR_ADDED_EVENT",
        description:
          "Composio GitHub trigger for newly added repository stars.",
      }
    }

    return {
      provider: "GitHub",
      appName: "GitHub",
      name: "GitHub commit event",
      slug: "GITHUB_COMMIT_EVENT",
      description: "Composio GitHub trigger for repository commits.",
    }
  }

  return null
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getUser()
  if (!auth.ok) return auth.response

  const { supabase, user } = auth
  const { id: chatId } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Errors.badRequest("Invalid JSON body.")
  }

  const parsed = createAgentSchema.safeParse(body)
  if (!parsed.success)
    return Errors.validationError(parsed.error.issues[0].message)

  const canAccessChat = await isChatParticipant(supabase, chatId, user.id)
  if (canAccessChat === null) return Errors.internal()
  if (!canAccessChat) return Errors.notFound("Chat")

  const { data: chat, error: chatError } = await supabase
    .from("chat")
    .select("id, workspace_id, title")
    .eq("id", chatId)
    .maybeSingle()

  if (chatError || !chat) return Errors.notFound("Chat")

  let sourceMessages = parsed.data.messages

  if (!sourceMessages || sourceMessages.length === 0) {
    const { data: dbMessages, error: messagesError } = await supabase
      .from("message")
      .select("role, content")
      .eq("chat_id", chatId)
      .in("role", ["user", "assistant"])
      .order("created_at", { ascending: true })
      .limit(40)

    if (messagesError) return Errors.internal()

    sourceMessages = (dbMessages ?? [])
      .filter(
        (message) => message.role === "user" || message.role === "assistant"
      )
      .map((message) => ({
        role: message.role as "user" | "assistant",
        content: message.content,
      }))
  }

  const cleanedMessages = (sourceMessages ?? []).filter((message) =>
    message.content.trim()
  )
  if (cleanedMessages.length === 0) {
    return Errors.badRequest(
      "This chat does not have enough messages to create an agent."
    )
  }

  const firstUserMessage = cleanedMessages.find(
    (message) => message.role === "user"
  )
  const agentName = compactTitle(
    firstUserMessage?.content ?? chat.title,
    "AI agent"
  )
  const totalTokens = cleanedMessages.reduce(
    (sum, m) => sum + Math.max(1, Math.ceil(m.content.length / 4)),
    0
  )
  const composioTrigger = detectComposioTrigger(cleanedMessages)

  const steps = [
    ...(composioTrigger
      ? [
          {
            name: composioTrigger.name,
            status: "In review" as const,
            owner: "Composio",
            nodeType: "Trigger" as const,
            provider: composioTrigger.provider,
            model: composioTrigger.slug,
            prompt: composioTrigger.description,
            tokenCount: 0,
            usedApps: [composioTrigger.appName],
            usedSkills: [],
            files: [],
            chatId: chatId,
          },
        ]
      : []),
    {
      name: agentName,
      status: "In review" as const,
      owner: "Atmet AI",
      nodeType: "Action" as const,
      provider: "Atmet",
      model: "",
      prompt: buildNodeDescription(cleanedMessages),
      tokenCount: totalTokens,
      usedApps: composioTrigger ? [composioTrigger.appName] : [],
      usedSkills: [],
      files: [],
      chatId: chatId,
    },
  ]

  const blueprint = {
    version: 2,
    source: "chat-agent",
    sourceChatId: chat.id,
    sourceMessageId: parsed.data.sourceMessageId ?? null,
    createdAt: new Date().toISOString(),
    steps,
  }
  const description = buildNodeDescription(cleanedMessages)
  const requiredApps = Array.from(
    new Set(steps.flatMap((step) => step.usedApps ?? []))
  )
  const modelDraft = await draftAgentBlueprintWithModel({
    messages: cleanedMessages,
    fallbackName: agentName,
    detectedTrigger: composioTrigger,
  })
  const builderSource = modelDraft ? "model" : "fallback"
  const modelBlueprint = normalizeAgentBuilderBlueprint(
    modelDraft ??
      buildFallbackAgentBlueprint({
      agentName,
      description,
      firstUserMessage: firstUserMessage?.content ?? agentName,
      requiredApps,
      steps,
      })
  )

  const finalAgentName = compactTitle(modelBlueprint.name, agentName)
  const finalDescription = modelBlueprint.summary || description
  const agentBlueprint = {
    version: 1,
    source: "chat-agent",
    builderSource,
    sourceChatId: chat.id,
    sourceMessageId: parsed.data.sourceMessageId ?? null,
    builder: modelBlueprint,
    goal: modelBlueprint.goal,
    trigger: modelBlueprint.trigger,
    required_apps: modelBlueprint.required_apps,
    nodes: modelBlueprint.nodes,
    steps: modelBlueprint.steps,
    approval_policy: modelBlueprint.approval_policy,
    missing_inputs: modelBlueprint.missing_inputs,
    safety_notes: modelBlueprint.safety_notes,
  }

  const { data: automation, error: automationError } = await supabase
    .from("automation")
    .insert({
      workspace_id: chat.workspace_id,
      created_by: user.id,
      name: finalAgentName,
      description: finalDescription,
      script_key: JSON.stringify(blueprint),
      status: "draft",
    })
    .select()
    .single()

  if (automationError || !automation) return Errors.internal()

  const { data: agent, error: agentError } = await supabase
    .from("agent")
    .insert({
      workspace_id: chat.workspace_id,
      created_by: user.id,
      legacy_automation_id: automation.id,
      name: finalAgentName,
      description: finalDescription,
      goal: modelBlueprint.goal,
      status: "draft",
      instructions: [
        modelBlueprint.goal,
        "",
        "Nodes:",
        ...modelBlueprint.nodes.map((node, index) => {
          const runtimeSeconds = Math.round(node.runtime.expected_ms / 1000)
          return `${index + 1}. ${node.name} (${node.type}, ${node.app ?? node.provider ?? "Atmet"}, ~${runtimeSeconds}s): ${node.prompt}`
        }),
      ].join("\n"),
      blueprint_json: agentBlueprint,
      runtime_config_json: {
        modelLayer: "atmet",
        executionMode: "draft",
        builder: builderSource,
      },
    })
    .select()
    .single()

  if (agentError || !agent) {
    console.error("Unable to create agent from chat", agentError)
    await supabase.from("automation").delete().eq("id", automation.id)
    return Errors.internal()
  }

  await supabase.from("chats_automation").insert({
    chat_id: chat.id,
    automation_id: automation.id,
  })

  return ok({ automation, agent }, 201)
}
