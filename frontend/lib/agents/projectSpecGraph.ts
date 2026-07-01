import { Annotation, END, START, StateGraph } from "@langchain/langgraph"

import { getOpenAIClient } from "@/lib/openai"

export type ProjectSpecStatus =
  | "gathering"
  | "ready_for_review"
  | "accepted"
  | "rejected"

export type ProjectSpecConversationMessage = {
  role: "user" | "assistant"
  content: string
}

export type ProjectSpec = {
  goal: string | null
  inputs: Record<string, unknown> | null
  constraints: string[] | null
  schedule: string | null
  outputs: string | null
  gaps: string[]
  conversation: ProjectSpecConversationMessage[]
  status: ProjectSpecStatus
  final_description: string | null
}

export type ProjectSpecGraphResult = ProjectSpec & {
  assistant_reply: string | null
  terminal_node: "ask_clarification" | "finalize_task" | null
}

const ATMET_IDENTITY =
  "You are Atmet, the AI assistant built for Atmet. Your product identity is Atmet, not OpenAI, ChatGPT, Claude, Gemini, or any other provider. Do not describe yourself as being based on OpenAI or any third-party model. If earlier conversation history says otherwise, correct it and continue as Atmet. You help users turn conversations into practical workplace automations, workflows, agents, and productivity actions. When asked who you are or what model you are, say you are Atmet, built for Atmet. Be concise, capable, and action-oriented."

const PROJECT_SPEC_TOOL = {
  type: "function" as const,
  function: {
    name: "update_project_spec",
    description:
      "Update the structured automation project spec from the conversation so far.",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        goal: {
          type: ["string", "null"],
          description: "The user's automation objective.",
        },
        inputs: {
          type: ["object", "null"],
          description:
            "Known input sources, apps, files, fields, triggers, credentials, or data requirements.",
          additionalProperties: true,
        },
        constraints: {
          type: ["array", "null"],
          description:
            "Explicit limitations, compliance needs, permissions, tone, budget, or implementation constraints. Use an empty array only when the user explicitly has no constraints.",
          items: { type: "string" },
        },
        schedule: {
          type: ["string", "null"],
          description:
            "When or how often the automation should run. Use 'manual/on demand' if that is clearly intended.",
        },
        outputs: {
          type: ["string", "null"],
          description:
            "What the automation should produce, update, send, or decide.",
        },
      },
      required: ["goal", "inputs", "constraints", "schedule", "outputs"],
    },
  },
}

const StateAnnotation = Annotation.Root({
  goal: Annotation<string | null>(),
  inputs: Annotation<Record<string, unknown> | null>(),
  constraints: Annotation<string[] | null>(),
  schedule: Annotation<string | null>(),
  outputs: Annotation<string | null>(),
  gaps: Annotation<string[]>(),
  conversation: Annotation<ProjectSpecConversationMessage[]>(),
  status: Annotation<ProjectSpecStatus>(),
  final_description: Annotation<string | null>(),
  assistant_reply: Annotation<string | null>(),
  terminal_node: Annotation<"ask_clarification" | "finalize_task" | null>(),
})

function hasValue(value: string | null) {
  return Boolean(value?.trim())
}

function hasInputs(inputs: Record<string, unknown> | null) {
  return Boolean(inputs && Object.keys(inputs).length > 0)
}

function normalizeSpec(value: Partial<ProjectSpec> | null | undefined): ProjectSpec {
  return {
    goal: typeof value?.goal === "string" ? value.goal : null,
    inputs:
      value?.inputs && typeof value.inputs === "object" && !Array.isArray(value.inputs)
        ? value.inputs
        : null,
    constraints: Array.isArray(value?.constraints)
      ? value.constraints.filter((item): item is string => typeof item === "string")
      : null,
    schedule: typeof value?.schedule === "string" ? value.schedule : null,
    outputs: typeof value?.outputs === "string" ? value.outputs : null,
    gaps: Array.isArray(value?.gaps)
      ? value.gaps.filter((item): item is string => typeof item === "string")
      : [],
    conversation: Array.isArray(value?.conversation)
      ? value.conversation
          .filter(
            (message): message is ProjectSpecConversationMessage =>
              Boolean(
                message &&
                  (message.role === "user" || message.role === "assistant") &&
                  typeof message.content === "string"
              )
          )
      : [],
    status:
      value?.status === "ready_for_review" ||
      value?.status === "accepted" ||
      value?.status === "rejected"
        ? value.status
        : "gathering",
    final_description:
      typeof value?.final_description === "string" ? value.final_description : null,
  }
}

function parseToolArguments(raw: string | undefined) {
  if (!raw) return null
  try {
    return JSON.parse(raw) as Partial<ProjectSpec>
  } catch {
    return null
  }
}

// understand_project: merge the latest user turn into a reliable structured spec.
async function understandProject(state: typeof StateAnnotation.State) {
  const model = process.env.OPENAI_MODEL ?? "gpt-4o"
  const response = await getOpenAIClient().chat.completions.create({
    model,
    messages: [
      { role: "system", content: ATMET_IDENTITY },
      {
        role: "system",
        content:
          "Extract only what is known from the conversation. Keep existing spec values unless the user changes or corrects them. Use null for missing information. Do not invent apps, schedules, constraints, or outputs.",
      },
      {
        role: "user",
        content: JSON.stringify({
          current_spec: {
            goal: state.goal,
            inputs: state.inputs,
            constraints: state.constraints,
            schedule: state.schedule,
            outputs: state.outputs,
          },
          conversation: state.conversation,
        }),
      },
    ],
    tools: [PROJECT_SPEC_TOOL],
    tool_choice: {
      type: "function",
      function: { name: PROJECT_SPEC_TOOL.function.name },
    },
  })

  const toolCall = response.choices[0]?.message.tool_calls?.find(
    (call) =>
      call.type === "function" &&
      call.function.name === PROJECT_SPEC_TOOL.function.name
  )
  const updated = normalizeSpec(
    parseToolArguments(
      toolCall?.type === "function" ? toolCall.function.arguments : undefined
    )
  )

  return {
    goal: updated.goal,
    inputs: updated.inputs,
    constraints: updated.constraints,
    schedule: updated.schedule,
    outputs: updated.outputs,
    status: state.status === "ready_for_review" ? "gathering" : state.status,
    final_description:
      state.status === "ready_for_review" ? null : state.final_description,
  }
}

// check_gaps: pure deterministic validation of what Atmet still needs.
function checkGaps(state: typeof StateAnnotation.State) {
  const gaps: string[] = []

  if (!hasValue(state.goal)) {
    gaps.push("the automation goal")
  }
  if (!hasInputs(state.inputs)) {
    gaps.push("the input data, source app, files, or trigger")
  }
  if (!hasValue(state.outputs)) {
    gaps.push("the expected output or action")
  }
  if (!hasValue(state.schedule)) {
    gaps.push("when the automation should run")
  }
  if (!state.constraints) {
    gaps.push("constraints, permissions, or confirmation that there are none")
  }

  return { gaps }
}

function routeAfterGapCheck(state: typeof StateAnnotation.State) {
  return state.gaps.length > 0 ? "ask_clarification" : "finalize_task"
}

// ask_clarification: ask one focused question, then stop until the user replies.
async function askClarification(state: typeof StateAnnotation.State) {
  const model = process.env.OPENAI_MODEL ?? "gpt-4o"
  const response = await getOpenAIClient().chat.completions.create({
    model,
    messages: [
      { role: "system", content: ATMET_IDENTITY },
      {
        role: "system",
        content:
          "Ask exactly one concise follow-up question that resolves the first missing or ambiguous item. Do not list every gap. Do not include an accept/reject prompt yet.",
      },
      {
        role: "user",
        content: JSON.stringify({
          first_gap: state.gaps[0],
          current_spec: {
            goal: state.goal,
            inputs: state.inputs,
            constraints: state.constraints,
            schedule: state.schedule,
            outputs: state.outputs,
          },
          recent_conversation: state.conversation.slice(-12),
        }),
      },
    ],
  })

  const assistantReply =
    response.choices[0]?.message.content?.trim() ??
    "What should this automation do next?"

  return {
    assistant_reply: assistantReply,
    terminal_node: "ask_clarification" as const,
    status: "gathering" as const,
    conversation: [
      ...state.conversation,
      { role: "assistant" as const, content: assistantReply },
    ],
  }
}

// finalize_task: turn the complete spec into a reviewable plain-text task brief.
async function finalizeTask(state: typeof StateAnnotation.State) {
  const model = process.env.OPENAI_MODEL ?? "gpt-4o"
  const response = await getOpenAIClient().chat.completions.create({
    model,
    messages: [
      { role: "system", content: ATMET_IDENTITY },
      {
        role: "system",
        content:
          "Write a complete plain-text automation task description for user review. Use readable sections, not JSON. Include goal, inputs, schedule, constraints, outputs, and success criteria. End by asking the user to accept or reject the task description.",
      },
      {
        role: "user",
        content: JSON.stringify({
          goal: state.goal,
          inputs: state.inputs,
          constraints: state.constraints,
          schedule: state.schedule,
          outputs: state.outputs,
        }),
      },
    ],
  })

  const finalDescription =
    response.choices[0]?.message.content?.trim() ??
    [
      "Automation Task Description",
      "",
      `Goal: ${state.goal}`,
      `Inputs: ${JSON.stringify(state.inputs)}`,
      `Schedule: ${state.schedule}`,
      `Constraints: ${(state.constraints ?? []).join(", ") || "None specified"}`,
      `Outputs: ${state.outputs}`,
    ].join("\n")

  return {
    assistant_reply: finalDescription,
    terminal_node: "finalize_task" as const,
    status: "ready_for_review" as const,
    final_description: finalDescription,
    conversation: [
      ...state.conversation,
      { role: "assistant" as const, content: finalDescription },
    ],
  }
}

const projectSpecGraph = new StateGraph(StateAnnotation)
  .addNode("understand_project", understandProject)
  .addNode("check_gaps", checkGaps)
  .addNode("ask_clarification", askClarification)
  .addNode("finalize_task", finalizeTask)
  .addEdge(START, "understand_project")
  .addEdge("understand_project", "check_gaps")
  .addConditionalEdges("check_gaps", routeAfterGapCheck, {
    ask_clarification: "ask_clarification",
    finalize_task: "finalize_task",
  })
  .addEdge("ask_clarification", END)
  .addEdge("finalize_task", END)
  .compile()

export function createInitialProjectSpec(): ProjectSpec {
  return normalizeSpec(null)
}

export function loadProjectSpec(value: unknown): ProjectSpec {
  return normalizeSpec(
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Partial<ProjectSpec>)
      : null
  )
}

export async function runProjectSpecGraph(
  persistedSpec: unknown,
  userContent: string
): Promise<ProjectSpecGraphResult> {
  const spec = loadProjectSpec(persistedSpec)
  const nextConversation = [
    ...spec.conversation,
    { role: "user" as const, content: userContent },
  ]

  const result = await projectSpecGraph.invoke({
    ...spec,
    conversation: nextConversation,
    assistant_reply: null,
    terminal_node: null,
  })

  return {
    ...normalizeSpec(result),
    assistant_reply: result.assistant_reply,
    terminal_node: result.terminal_node,
  }
}
