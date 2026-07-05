import { type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { ok, Errors } from "@/lib/api/response"
import { signUpSchema } from "@/lib/validations/auth"

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Errors.badRequest("Invalid JSON body.")
  }

  const parsed = signUpSchema.safeParse(body)
  if (!parsed.success) {
    return Errors.validationError(parsed.error.issues[0].message)
  }

  const { name, email, password } = parsed.data
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: name },
    },
  })

  if (error) {
    if (error.message.toLowerCase().includes("already registered")) {
      return Errors.conflict("An account with this email already exists.")
    }
    if (error.message.toLowerCase().includes("password")) {
      return Errors.validationError(error.message)
    }
    return Errors.internal()
  }

  return ok({ userId: data.user?.id }, 201)
}
