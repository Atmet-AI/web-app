import { type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { ok, Errors } from "@/lib/api/response"
import { forgotPasswordSchema } from "@/lib/validations/auth"

function isLocalUrl(value: string) {
  return /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?/i.test(value)
}

function getAppUrl(request: NextRequest) {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()
  const requestOrigin = request.nextUrl.origin

  if (!configuredUrl) return requestOrigin.replace(/\/$/, "")
  if (isLocalUrl(configuredUrl) && !isLocalUrl(requestOrigin)) {
    return requestOrigin.replace(/\/$/, "")
  }

  return configuredUrl.replace(/\/$/, "")
}

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Errors.badRequest("Invalid JSON body.")
  }

  const parsed = forgotPasswordSchema.safeParse(body)
  if (!parsed.success) {
    return Errors.validationError(parsed.error.issues[0].message)
  }

  const { email } = parsed.data
  const supabase = await createClient()
  const appUrl = getAppUrl(request)

  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${appUrl}/reset-password`,
  })

  // Always return success to avoid leaking which emails are registered
  return ok({ success: true })
}
