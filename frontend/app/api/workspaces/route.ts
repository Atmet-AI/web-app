import { type NextRequest } from "next/server"
import { getUser } from "@/lib/api/auth"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { ok, Errors } from "@/lib/api/response"
import { createWorkspaceSchema } from "@/lib/validations/workspace"

export async function GET() {
  const auth = await getUser()
  if (!auth.ok) return auth.response

  const { user } = auth

  const { data, error } = await supabaseAdmin
    .from("workspace_member")
    .select("role, status, workspace:workspace_id(id, name, plan, status, owner_id, avatar_url, country, created_at, owner:owner_id(email, phone_country))")
    .eq("user_id", user.id)
    .eq("status", "active")

  if (error) {
    return Errors.internal()
  }

  // Flatten: { role, workspace: { id, name... } } → { id, name, role, ... }
  const workspaces = (data ?? [])
    .map((row) => {
      const ws = Array.isArray(row.workspace) ? row.workspace[0] : row.workspace
      return { ...ws, role: row.role }
    })
    .filter((workspace) => workspace.status === "active")

  return ok({ workspaces })
}

export async function POST(request: NextRequest) {
  const auth = await getUser()
  if (!auth.ok) return auth.response

  const { user } = auth

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Errors.badRequest("Invalid JSON body.")
  }

  const parsed = createWorkspaceSchema.safeParse(body)
  if (!parsed.success) {
    return Errors.validationError(parsed.error.issues[0].message)
  }

  const { name, plan, avatar_url, country } = parsed.data

  // Ensure a users profile row exists — trigger may not have fired for manually-created accounts
  const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(user.id)
  if (authUser?.user) {
    await supabaseAdmin.from("users").upsert(
      {
        id: user.id,
        email: authUser.user.email ?? user.email ?? "",
        full_name: authUser.user.user_metadata?.full_name ?? null,
      },
      { onConflict: "id", ignoreDuplicates: true }
    )
  }

  // Insert workspace (admin client bypasses RLS for the FK constraint)
  const { data: workspace, error: wsError } = await supabaseAdmin
    .from("workspace")
    .insert({
      name,
      plan,
      avatar_url: avatar_url ?? null,
      country: country ?? null,
      owner_id: user.id,
    })
    .select()
    .single()

  if (wsError) {
    console.error("Workspace insert error:", wsError)
    return Errors.internal()
  }

  // Auto-add creator as owner — must use admin client (user isn't a member yet, RLS blocks INSERT)
  const { error: memberError } = await supabaseAdmin.from("workspace_member").insert({
    workspace_id: workspace.id,
    user_id: user.id,
    role: "owner",
    status: "active",
  })

  if (memberError) {
    console.error("Workspace member insert error:", memberError)
    // Workspace was created; don't fail the whole request
  }

  return ok({ workspace }, 201)
}
