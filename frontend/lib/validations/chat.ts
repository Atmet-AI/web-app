import { z } from "zod"

export const createChatSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
})

export const updateChatSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  status: z.enum(["active", "archived"]).optional(),
})

export const sendMessageSchema = z.object({
  content: z.string().max(20000).default(""),
  editMessageId: z.string().uuid("Invalid edited message ID").optional(),
  attachments: z
    .array(
      z.object({
        id: z.string(),
        fileId: z.string().uuid().optional(),
        name: z.string().min(1).max(255),
        kind: z.enum(["image", "excel", "pdf", "document", "archive", "text", "other"]),
      })
    )
    .optional()
    .default([]),
}).refine(
  (value) => value.content.trim().length > 0 || value.attachments.length > 0,
  "Message content or an attachment is required."
)

export const addChatUserSchema = z.object({
  user_id: z.string().uuid("Invalid user ID"),
})

export const removeChatUserSchema = z.object({
  user_id: z.string().uuid("Invalid user ID"),
})

export const linkResourceSchema = z.object({
  id: z.string().uuid("Invalid resource ID"),
})
