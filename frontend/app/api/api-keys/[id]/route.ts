import { type NextRequest } from "next/server"
import { getUser } from "@/lib/api/auth"
import { assertWorkspaceAdmin } from "@/lib/api/workspace"
import { ok, Errors } from "@/lib/api/response"

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getUser()
  if (!auth.ok) return auth.response

  const { supabase, user } = auth
  const { id } = await params

  const { data: key } = await supabase
    .from("api_key")
    .select("workspace_id, created_by")
    .eq("id", id)
    .maybeSingle()

  if (!key) return Errors.notFound("API key")

  const isCreator = key.created_by === user.id
  const isAdmin = await assertWorkspaceAdmin(supabase, key.workspace_id, user.id)

  if (!isCreator && !isAdmin) return Errors.forbidden()

  const { error } = await supabase.from("api_key").delete().eq("id", id)

  if (error) return Errors.internal()

  return ok({ success: true })
}
