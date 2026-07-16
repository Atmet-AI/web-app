import { type NextRequest } from "next/server"
import { z } from "zod"

import { getAdminUser } from "@/lib/api/admin"
import { Errors, ok } from "@/lib/api/response"
import { supabaseAdmin } from "@/lib/supabase/admin"

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z.string().min(1).max(120).nullable().optional(),
  avatar_url: z.string().nullable().optional(),
  plan: z.enum(["free", "pro", "enterprise"]).optional(),
  status: z.enum(["active", "suspended", "cancelled"]).optional(),
  country: z.string().nullable().optional(),
  monthly_token_cap: z.number().int().positive().nullable().optional(),
  seat_limit: z.number().int().positive().nullable().optional(),
  features: z.record(z.string(), z.unknown()).optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminUser("super_admin")
  if (!admin.ok) return admin.response

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Errors.badRequest("Invalid JSON body.")
  }

  const parsed = updateSchema.safeParse(body)
  if (!parsed.success)
    return Errors.validationError(parsed.error.issues[0].message)

  const { id } = await params
  const { data, error } = await supabaseAdmin
    .from("workspace")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select(
      "id, name, slug, plan, status, owner_id, avatar_url, country, monthly_token_cap, seat_limit, features, created_at, updated_at"
    )
    .single()

  if (error || !data) return Errors.notFound("Workspace")

  if (
    parsed.data.status === "suspended" ||
    parsed.data.status === "cancelled"
  ) {
    const { error: memberError } = await supabaseAdmin
      .from("workspace_member")
      .update({ status: "suspended" })
      .eq("workspace_id", id)
    if (memberError) return Errors.internal()
  }

  if (parsed.data.status === "active") {
    const { error: memberError } = await supabaseAdmin
      .from("workspace_member")
      .update({ status: "active" })
      .eq("workspace_id", id)
    if (memberError) return Errors.internal()
  }

  return ok({ workspace: data })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminUser("super_admin")
  if (!admin.ok) return admin.response

  const { id } = await params
  const { error } = await supabaseAdmin.from("workspace").delete().eq("id", id)
  if (error) return Errors.internal()

  return ok({ success: true })
}
