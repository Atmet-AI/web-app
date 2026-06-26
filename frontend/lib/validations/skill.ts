import { z } from "zod"

export const createSkillSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
  definition: z.record(z.string(), z.unknown()).optional(),
  type: z.enum(["action", "trigger", "tool", "agent"]),
  status: z.enum(["active", "inactive"]).optional().default("active"),
})

export const updateSkillSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  definition: z.record(z.string(), z.unknown()).optional(),
  type: z.enum(["action", "trigger", "tool", "agent"]).optional(),
  status: z.enum(["active", "inactive"]).optional(),
})
