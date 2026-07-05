import { z } from "zod"

// Basic cron expression: 5 fields separated by spaces
const cronRegex = /^(\*|[0-9,\-*/]+)\s+(\*|[0-9,\-*/]+)\s+(\*|[0-9,\-*/]+)\s+(\*|[0-9,\-*/]+)\s+(\*|[0-9,\-*/]+)$/

export const createScheduleSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  cron_expression: z
    .string()
    .regex(cronRegex, "Invalid cron expression (must have 5 fields)"),
  timezone: z.string().max(100).optional().default("UTC"),
  automation_id: z.string().uuid("Invalid automation ID").optional(),
  status: z.enum(["active", "paused", "disabled"]).optional().default("active"),
})

export const updateScheduleSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  cron_expression: z
    .string()
    .regex(cronRegex, "Invalid cron expression (must have 5 fields)")
    .optional(),
  timezone: z.string().max(100).optional(),
  automation_id: z.string().uuid().nullable().optional(),
  status: z.enum(["active", "paused", "disabled"]).optional(),
})
