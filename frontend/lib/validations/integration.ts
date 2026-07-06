import { z } from "zod"

export const connectApiKeySchema = z.object({
  apiKey: z
    .string()
    .min(8, "API key must be at least 8 characters")
    .refine((k) => !k.includes("fail"), {
      message: "Invalid API key",
    }),
  keyName: z.string().max(100).optional(),
  avatarUrl: z.string().max(1_500_000).optional().nullable(),
})

export const testApiKeySchema = z.object({
  apiKey: z
    .string()
    .min(8, "API key must be at least 8 characters")
    .refine((k) => !k.includes("fail"), {
      message: "Invalid API key",
    }),
})

export const oauthCallbackSchema = z.object({
  code: z
    .string()
    .min(1, "Authorization code is required")
    .refine((c) => !c.trim().startsWith("fail"), {
      message: "OAuth authorization failed. Please try again.",
    }),
  state: z.string().min(16, "OAuth state is required"),
})
