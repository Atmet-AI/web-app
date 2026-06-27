import { z } from "zod"

export const createWorkspaceSchema = z.object({
  name: z.string().min(1, "Workspace name is required").max(100),
  plan: z.enum(["free", "pro", "enterprise"]).optional().default("free"),
})

export const updateWorkspaceSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  plan: z.enum(["free", "pro", "enterprise"]).optional(),
  avatar_url: z.string().url().nullable().optional(),
})

export const inviteMemberSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(["member"]).default("member"),
})

export const updateMemberRoleSchema = z.object({
  role: z.enum(["member"]),
})
