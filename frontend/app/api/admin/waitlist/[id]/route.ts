import { type NextRequest } from "next/server"
import { getUser } from "@/lib/api/auth"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { ok, Errors } from "@/lib/api/response"
import { z } from "zod"

const actionSchema = z.object({
  action: z.enum(["approve", "reject"]),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getUser()
  if (!auth.ok) return auth.response

  const { data: profile } = await auth.supabase
    .from("users")
    .select("platform_role")
    .eq("id", auth.user.id)
    .single()

  if (!["super_admin", "admin"].includes(profile?.platform_role ?? "")) {
    return Errors.forbidden("Admin access required.")
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Errors.badRequest("Invalid JSON body.")
  }

  const parsed = actionSchema.safeParse(body)
  if (!parsed.success) {
    return Errors.validationError(parsed.error.issues[0].message)
  }

  const { id } = await params
  const { action } = parsed.data

  const { data: entry } = await supabaseAdmin
    .from("waitlist")
    .select("id, email, name, status")
    .eq("id", id)
    .maybeSingle()

  if (!entry) return Errors.notFound("Waitlist entry")
  if (entry.status !== "pending") {
    return Errors.badRequest("This request has already been reviewed.")
  }

  const newStatus = action === "approve" ? "approved" : "rejected"

  const { error: updateError } = await supabaseAdmin
    .from("waitlist")
    .update({
      status: newStatus,
      reviewed_by: auth.user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id)

  if (updateError) return Errors.internal()

  return ok({ success: true, status: newStatus })
}
