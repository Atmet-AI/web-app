import { z } from "zod"

const jsonObjectSchema = z.record(z.string(), z.unknown())

export const agentStatusSchema = z.enum(["draft", "active", "paused", "archived"])

export const defaultAgentBlueprint = {
  version: 2,
  source: "playground",
  nodes: [
    {
      id: "node-1",
      name: "New node",
      type: "action",
      app: "Atmet",
      provider: "Atmet",
      prompt: "Describe what this agent should do.",
      runtime: {
        expected_ms: 15000,
        timeout_ms: 60000,
      },
      actions: [
        {
          id: "action-1",
          name: "Plan this node",
          prompt: "Describe the task for this node or ask Atmet to build the workflow.",
          runtime_ms: 15000,
        },
      ],
      status: "ready",
    },
  ],
  steps: [
    {
      id: "node-1-action-1",
      node_id: "node-1",
      action_id: "action-1",
      name: "New node",
      type: "action",
      provider: "Atmet",
      app: "Atmet",
      prompt: "Describe what this agent should do.",
      runtime_ms: 15000,
      status: "ready",
    },
  ],
  required_apps: [],
  approval_policy: {},
} as const

export const createAgentSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
  goal: z.string().max(1000).optional(),
  instructions: z.string().max(8000).optional(),
  template_id: z.string().uuid().nullable().optional(),
  status: agentStatusSchema.optional().default("draft"),
  blueprint_json: jsonObjectSchema.optional().default(defaultAgentBlueprint),
  runtime_config_json: jsonObjectSchema.optional().default({}),
})

export const updateAgentSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  goal: z.string().max(1000).nullable().optional(),
  instructions: z.string().max(8000).nullable().optional(),
  template_id: z.string().uuid().nullable().optional(),
  status: agentStatusSchema.optional(),
  blueprint_json: jsonObjectSchema.optional(),
  runtime_config_json: jsonObjectSchema.optional(),
})

export function agentStatusToAutomationStatus(status: z.infer<typeof agentStatusSchema>) {
  if (status === "active") return "active"
  if (status === "draft") return "draft"
  return "inactive"
}
