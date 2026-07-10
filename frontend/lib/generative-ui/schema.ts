import { z } from "zod"

const scalarValueSchema = z.union([z.string(), z.number(), z.boolean(), z.null()])

export const atmetUiActionSchema = z.object({
  type: z.enum(["app_tool", "workflow_action", "chat_submit"]),
  app: z.string().min(1).max(80).optional(),
  tool: z.string().min(1).max(120).optional(),
  label: z.string().min(1).max(80).optional(),
  requiresConfirmation: z.boolean().default(true),
  params: z.record(z.string(), z.unknown()).optional(),
})

export const atmetUiFieldSchema = z.object({
  id: z.string().min(1).max(64),
  label: z.string().min(1).max(80),
  type: z.enum(["text", "email", "textarea", "select", "date", "time", "number"]),
  value: z.string().max(4000).optional(),
  placeholder: z.string().max(160).optional(),
  required: z.boolean().optional(),
  options: z.array(z.string().max(120)).max(40).optional(),
})

const tableSchema = z.object({
  kind: z.literal("table"),
  title: z.string().max(120).optional(),
  description: z.string().max(280).optional(),
  columns: z
    .array(
      z.object({
        key: z.string().min(1).max(64),
        label: z.string().min(1).max(80),
      })
    )
    .min(1)
    .max(12),
  rows: z.array(z.record(z.string(), scalarValueSchema)).max(100),
})

const chartSchema = z.object({
  kind: z.literal("chart"),
  title: z.string().max(120).optional(),
  description: z.string().max(280).optional(),
  chartType: z.enum(["bar", "line"]),
  xKey: z.string().min(1).max(64),
  yKeys: z.array(z.string().min(1).max(64)).min(1).max(4),
  data: z.array(z.record(z.string(), scalarValueSchema)).max(80),
})

const codeSchema = z.object({
  kind: z.literal("code"),
  title: z.string().max(120).optional(),
  filename: z.string().max(160).optional(),
  language: z.string().min(1).max(32),
  code: z.string().min(1).max(12000),
})

const formSchema = z.object({
  kind: z.literal("form"),
  title: z.string().min(1).max(120),
  description: z.string().max(280).optional(),
  fields: z.array(atmetUiFieldSchema).min(1).max(16),
  submit: z.object({
    label: z.string().min(1).max(60),
    action: atmetUiActionSchema,
  }),
})

const fileListSchema = z.object({
  kind: z.literal("file_list"),
  title: z.string().max(120).optional(),
  description: z.string().max(280).optional(),
  files: z
    .array(
      z.object({
        id: z.string().max(160).optional(),
        name: z.string().min(1).max(220),
        url: z.string().url().optional(),
        kind: z.string().max(80).optional(),
        owner: z.string().max(160).optional(),
        updatedAt: z.string().max(80).optional(),
      })
    )
    .max(100),
})

export const atmetUiPayloadSchema = z.object({
  type: z.literal("atmet_ui"),
  version: z.literal(1),
  surface: z.enum(["chat", "workflow_node", "app_profile", "agent_builder"]),
  appName: z.string().max(80).optional(),
  appSlug: z.string().max(80).optional(),
  component: z.discriminatedUnion("kind", [
    tableSchema,
    chartSchema,
    codeSchema,
    formSchema,
    fileListSchema,
  ]),
})

export type AtmetUiPayload = z.infer<typeof atmetUiPayloadSchema>
export type AtmetUiAction = z.infer<typeof atmetUiActionSchema>
export type AtmetUiField = z.infer<typeof atmetUiFieldSchema>

export const ATMET_UI_PREFIX = "::ATMET_UI::"

export function serializeAtmetUiPayload(payload: AtmetUiPayload) {
  return `${ATMET_UI_PREFIX}${JSON.stringify(payload)}`
}

export function parseAtmetUiPayload(content: string): AtmetUiPayload | null {
  if (!content.startsWith(ATMET_UI_PREFIX)) return null

  try {
    const parsed = JSON.parse(content.slice(ATMET_UI_PREFIX.length))
    const result = atmetUiPayloadSchema.safeParse(parsed)
    return result.success ? result.data : null
  } catch {
    return null
  }
}
