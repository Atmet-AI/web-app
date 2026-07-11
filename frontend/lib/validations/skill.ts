import { z } from "zod"

export const createSkillSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
  definition: z.record(z.string(), z.unknown()).optional(),
  type: z.enum(["action", "trigger", "tool", "agent"]),
  image_url: z.string().url().optional().nullable(),
  status: z.literal("active").optional().default("active"),
})

export const updateSkillSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  definition: z.record(z.string(), z.unknown()).optional(),
  type: z.enum(["action", "trigger", "tool", "agent"]).optional(),
  image_url: z.string().url().optional().nullable(),
  status: z.literal("active").optional(),
})
