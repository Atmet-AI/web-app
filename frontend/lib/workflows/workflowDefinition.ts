import { z } from "zod"

const jsonObjectSchema = z.record(z.string(), z.unknown())

export const workflowCapabilitySchema = z.object({
  transport: z.enum(["native", "mcp", "system"]),
  provider: z.string().min(1).max(100),
  key: z.string().min(1).max(200),
  connectionId: z.string().uuid().optional(),
  mcpServerId: z.string().uuid().optional(),
  risk: z.enum(["read", "write", "destructive", "spend"]).optional(),
})

export const workflowNodeSchema = z.object({
  id: z.string().min(1).max(100),
  kind: z.enum(["trigger", "action", "condition", "transform", "ai"]),
  name: z.string().min(1).max(160),
  capability: workflowCapabilitySchema,
  input: jsonObjectSchema.default({}),
  config: jsonObjectSchema.default({}),
  position: z
    .object({
      x: z.number().finite(),
      y: z.number().finite(),
    })
    .optional(),
})

export const workflowEdgeSchema = z.object({
  id: z.string().min(1).max(160),
  source: z.string().min(1).max(100),
  target: z.string().min(1).max(100),
  sourceHandle: z.string().max(80).optional(),
  targetHandle: z.string().max(80).optional(),
  condition: jsonObjectSchema.optional(),
})

export const workflowDefinitionSchema = z
  .object({
    version: z.literal(1),
    nodes: z.array(workflowNodeSchema).min(1).max(250),
    edges: z.array(workflowEdgeSchema).max(1000),
    variables: jsonObjectSchema.default({}),
    metadata: jsonObjectSchema.default({}),
  })
  .superRefine((definition, context) => {
    const nodeIds = new Set<string>()
    for (const [index, node] of definition.nodes.entries()) {
      if (nodeIds.has(node.id)) {
        context.addIssue({
          code: "custom",
          message: `Duplicate node id: ${node.id}`,
          path: ["nodes", index, "id"],
        })
      }
      nodeIds.add(node.id)

      if (node.capability.transport === "native" && !node.capability.connectionId) {
        context.addIssue({
          code: "custom",
          message: "Native capabilities require a connectionId.",
          path: ["nodes", index, "capability", "connectionId"],
        })
      }

      if (node.capability.transport === "mcp" && !node.capability.mcpServerId) {
        context.addIssue({
          code: "custom",
          message: "MCP capabilities require an mcpServerId.",
          path: ["nodes", index, "capability", "mcpServerId"],
        })
      }
    }

    const edgeIds = new Set<string>()
    for (const [index, edge] of definition.edges.entries()) {
      if (edgeIds.has(edge.id)) {
        context.addIssue({
          code: "custom",
          message: `Duplicate edge id: ${edge.id}`,
          path: ["edges", index, "id"],
        })
      }
      edgeIds.add(edge.id)

      if (!nodeIds.has(edge.source)) {
        context.addIssue({
          code: "custom",
          message: `Unknown source node: ${edge.source}`,
          path: ["edges", index, "source"],
        })
      }

      if (!nodeIds.has(edge.target)) {
        context.addIssue({
          code: "custom",
          message: `Unknown target node: ${edge.target}`,
          path: ["edges", index, "target"],
        })
      }

      if (edge.source === edge.target) {
        context.addIssue({
          code: "custom",
          message: "A workflow edge cannot connect a node to itself.",
          path: ["edges", index],
        })
      }
    }
  })

export type WorkflowCapability = z.infer<typeof workflowCapabilitySchema>
export type WorkflowNode = z.infer<typeof workflowNodeSchema>
export type WorkflowEdge = z.infer<typeof workflowEdgeSchema>
export type WorkflowDefinition = z.infer<typeof workflowDefinitionSchema>
