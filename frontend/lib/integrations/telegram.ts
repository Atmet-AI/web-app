import "server-only"

type TelegramApiResponse<T> =
  | { ok: true; result: T }
  | { ok: false; description?: string }

export type TelegramBotInfo = {
  id: number
  is_bot: boolean
  first_name: string
  username?: string
}

export type TelegramMessage = {
  message_id: number
  chat: {
    id: number | string
    type?: string
    title?: string
    username?: string
    first_name?: string
    last_name?: string
  }
  text?: string
  caption?: string
}

export type TelegramUpdate = {
  update_id: number
  message?: TelegramMessage
}

export type TelegramWebhookInfo = {
  url: string
  has_custom_certificate: boolean
  pending_update_count: number
  last_error_date?: number
  last_error_message?: string
  max_connections?: number
  allowed_updates?: string[]
}

function getTelegramApiUrl(botToken: string, method: string) {
  return `https://api.telegram.org/bot${botToken}/${method}`
}

async function callTelegramApi<T>(
  botToken: string,
  method: string,
  payload?: Record<string, unknown>
): Promise<T> {
  const response = await fetch(getTelegramApiUrl(botToken, method), {
    method: payload ? "POST" : "GET",
    headers: payload ? { "Content-Type": "application/json" } : undefined,
    body: payload ? JSON.stringify(payload) : undefined,
    cache: "no-store",
  })

  const data = (await response.json()) as TelegramApiResponse<T>

  if (!response.ok) {
    throw new Error("Telegram request failed.")
  }

  if (!data.ok) {
    throw new Error(data.description ?? "Telegram request failed.")
  }

  return data.result
}

export async function getTelegramBotInfo(botToken: string): Promise<TelegramBotInfo> {
  return callTelegramApi<TelegramBotInfo>(botToken, "getMe")
}

export function formatTelegramBotAccount(bot: TelegramBotInfo) {
  return bot.username ? `@${bot.username}` : bot.first_name
}

export async function sendTelegramMessage(
  botToken: string,
  input: {
    chatId: string | number
    text: string
  }
) {
  return callTelegramApi<TelegramMessage>(botToken, "sendMessage", {
    chat_id: input.chatId,
    text: input.text,
    disable_web_page_preview: true,
  })
}

export async function setTelegramWebhook(
  botToken: string,
  webhookUrl: string
) {
  return callTelegramApi<true>(botToken, "setWebhook", {
    url: webhookUrl,
    allowed_updates: ["message"],
  })
}

export async function getTelegramWebhookInfo(botToken: string) {
  return callTelegramApi<TelegramWebhookInfo>(botToken, "getWebhookInfo")
}

export async function sendTelegramPhoto(
  botToken: string,
  input: {
    chatId: string | number
    imageUrl: string
    caption?: string
  }
) {
  return callTelegramApi<TelegramMessage>(botToken, "sendPhoto", {
    chat_id: input.chatId,
    photo: input.imageUrl,
    caption: input.caption,
  })
}
