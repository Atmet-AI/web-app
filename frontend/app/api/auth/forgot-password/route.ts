import { type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { ok, Errors } from "@/lib/api/response"
import { forgotPasswordSchema } from "@/lib/validations/auth"

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
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin).replace(/\/$/, "")

  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${appUrl}/reset-password`,
  })

  // Always return success to avoid leaking which emails are registered
  return ok({ success: true })
}
