import { type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { ok, Errors } from "@/lib/api/response"
import { resetPasswordSchema } from "@/lib/validations/auth"

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Errors.badRequest("Invalid JSON body.")
  }

  const parsed = resetPasswordSchema.safeParse(body)
  if (!parsed.success) {
    return Errors.validationError(parsed.error.issues[0].message)
  }

  const { password } = parsed.data
  const supabase = await createClient()

  const { error } = await supabase.auth.updateUser({
    password,
    data: { password_set: true },
  })

  if (error) {
    return Errors.badRequest(error.message)
  }

  return ok({ success: true })
}
