import { z } from "zod"

export const createChatSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
})

export const updateChatSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  status: z.enum(["active", "archived"]).optional(),
})

export const sendMessageSchema = z.object({
  content: z.string().min(1, "Message content is required"),
})

export const addChatUserSchema = z.object({
  user_id: z.string().uuid("Invalid user ID"),
})

export const removeChatUserSchema = z.object({
  user_id: z.string().uuid("Invalid user ID"),
})

export const linkResourceSchema = z.object({
  id: z.string().uuid("Invalid resource ID"),
})
