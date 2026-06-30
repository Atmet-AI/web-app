import { type NextRequest } from "next/server"
import { getUser } from "@/lib/api/auth"
import { assertWorkspaceAdmin } from "@/lib/api/workspace"
import { ok, Errors } from "@/lib/api/response"
import { supabaseAdmin } from "@/lib/supabase/admin"

const BUCKET = "workspace-files"

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getUser()
  if (!auth.ok) return auth.response

  const { user } = auth
  const { id } = await params

  const { data: file } = await supabaseAdmin
    .from("file")
    .select("workspace_id, uploaded_by, storage_path")
    .eq("id", id)
    .maybeSingle()

  if (!file) return Errors.notFound("File")

  const isUploader = file.uploaded_by === user.id
  const isAdmin = await assertWorkspaceAdmin(supabaseAdmin, file.workspace_id, user.id)

  if (!isUploader && !isAdmin) return Errors.forbidden()

  // Delete from Supabase Storage
  await supabaseAdmin.storage.from(BUCKET).remove([file.storage_path])

  // Delete DB record
  await supabaseAdmin.from("file").delete().eq("id", id)

  return ok({ success: true })
}
