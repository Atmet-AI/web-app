import { type NextRequest } from "next/server"

const DEFAULT_PUBLIC_APP_URL = "https://www.atmetai.com"
const APEX_PUBLIC_APP_URL = "https://atmetai.com"

function canonicalizePublicOrigin(origin: string) {
  return origin === APEX_PUBLIC_APP_URL ? DEFAULT_PUBLIC_APP_URL : origin
}

function normalizeBaseUrl(value: string | undefined | null) {
  const trimmed = value?.trim().replace(/\/+$/, "")
  if (!trimmed) return null

  try {
    return canonicalizePublicOrigin(new URL(trimmed).origin)
  } catch {
    return null
  }
}

function isLocalOrigin(origin: string) {
  return /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(origin)
}

export function getPublicAppOrigin(request?: NextRequest) {
  const telegramWebhookOrigin = normalizeBaseUrl(process.env.TELEGRAM_WEBHOOK_BASE_URL)
  if (telegramWebhookOrigin) return telegramWebhookOrigin

  const configuredAppOrigin = normalizeBaseUrl(process.env.NEXT_PUBLIC_APP_URL)
  if (configuredAppOrigin && configuredAppOrigin.startsWith("https://")) {
    return configuredAppOrigin
  }

  if (request && !isLocalOrigin(request.nextUrl.origin)) {
    return canonicalizePublicOrigin(request.nextUrl.origin)
  }

  const vercelOrigin = normalizeBaseUrl(
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : null
  )
  if (vercelOrigin) return vercelOrigin

  return DEFAULT_PUBLIC_APP_URL
}

export function buildPublicUrl(path: string, request?: NextRequest) {
  return new URL(path, getPublicAppOrigin(request)).toString()
}
