import { createClient } from "@/lib/supabase/server"
import { ok, Errors } from "@/lib/api/response"

export async function POST() {
  const supabase = await createClient()

  const { error } = await supabase.auth.signOut()

  if (error) {
    return Errors.internal()
  }

  return ok({ success: true })
}
