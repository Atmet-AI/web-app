import { createClient } from "@/lib/supabase/server"
import { Errors } from "@/lib/api/response"
import type { User } from "@supabase/supabase-js"
import type { SupabaseClient } from "@supabase/supabase-js"

type AuthResult =
  | { ok: true; user: User; supabase: SupabaseClient }
  | { ok: false; response: ReturnType<typeof Errors.unauthorized> }

export async function getUser(): Promise<AuthResult> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return { ok: false, response: Errors.unauthorized() }
  }

  return { ok: true, user, supabase }
}
