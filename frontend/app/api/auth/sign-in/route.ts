import { type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { ok, Errors } from "@/lib/api/response"
import { signInSchema } from "@/lib/validations/auth"

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Errors.badRequest("Invalid JSON body.")
  }

  const parsed = signInSchema.safeParse(body)
  if (!parsed.success) {
    return Errors.validationError(parsed.error.issues[0].message)
  }

  const { email, password } = parsed.data
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    if (error.message.toLowerCase().includes("email not confirmed")) {
      return Errors.forbidden("Please verify your email before signing in.")
    }
    return Errors.unauthorized("Invalid email or password.")
  }

  const { data: profile } = await supabase
    .from("users")
    .select("full_name, status, platform_role")
    .eq("id", data.user.id)
    .maybeSingle()

  return ok({
    user: {
      id: data.user.id,
      email: data.user.email,
      full_name: profile?.full_name ?? null,
      status: profile?.status ?? "active",
      platform_role: profile?.platform_role ?? "user",
    },
  })
}
