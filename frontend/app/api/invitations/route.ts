import { type NextRequest } from "next/server"
import { getUser } from "@/lib/api/auth"
import { ok, Errors } from "@/lib/api/response"
import { supabaseAdmin } from "@/lib/supabase/admin"

export async function GET(_request: NextRequest) {
  const auth = await getUser()
  if (!auth.ok) return auth.response

  const email = auth.user.email?.trim().toLowerCase()
  if (!email) return Errors.badRequest("Your account does not have an email address.")

  const { data, error } = await supabaseAdmin
    .from("invitation")
    .select("id, token, role, status, expires_at, created_at, workspace:workspace_id(id, name, avatar_url), inviter:invited_by(full_name, email)")
    .eq("email", email)
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })

  if (error) return Errors.internal()

  return ok({ invitations: data ?? [] })
}
