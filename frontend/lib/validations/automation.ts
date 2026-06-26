import { z } from "zod"

export const createAutomationSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
  script_key: z.string().max(20000).optional(),
  status: z.enum(["active", "inactive", "draft"]).optional().default("draft"),
})

export const updateAutomationSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  script_key: z.string().max(20000).optional(),
  status: z.enum(["active", "inactive", "draft"]).optional(),
})
