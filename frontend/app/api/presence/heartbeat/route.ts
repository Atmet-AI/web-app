import { getUser } from "@/lib/api/auth"
import { Errors, ok } from "@/lib/api/response"
import { supabaseAdmin } from "@/lib/supabase/admin"

export async function POST() {
  const auth = await getUser()
  if (!auth.ok) return auth.response

  const { error } = await supabaseAdmin.from("user_presence").upsert(
    {
      user_id: auth.user.id,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  )

  if (error) return Errors.internal()

  return ok({ success: true })
}
