import { z } from "zod"

export const createInvitationSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(["member"]).default("member"),
})

export const apiKeySchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  expires_at: z.string().datetime().optional(),
})
