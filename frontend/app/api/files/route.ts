import { type NextRequest } from "next/server"
import { randomUUID } from "crypto"
import { getUser } from "@/lib/api/auth"
import { getWorkspaceId } from "@/lib/api/workspace"
import { ok, Errors } from "@/lib/api/response"

const BUCKET = "workspace-files"
const MAX_SIZE_BYTES = 25 * 1024 * 1024 // 25 MB

export async function POST(request: NextRequest) {
  const auth = await getUser()
  if (!auth.ok) return auth.response

  const ws = getWorkspaceId(request)
  if (!ws.ok) return ws.response

  const { supabase, user } = auth

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return Errors.badRequest("Expected multipart/form-data.")
  }

  const file = formData.get("file")
  if (!(file instanceof File)) {
    return Errors.badRequest("Missing required field: file.")
  }

  if (file.size > MAX_SIZE_BYTES) {
    return Errors.badRequest("File exceeds the 25 MB size limit.")
  }

  const messageId = formData.get("message_id")
  const ext = file.name.split(".").pop() ?? ""
  const storagePath = `${ws.workspaceId}/${randomUUID()}${ext ? "." + ext : ""}`

  const arrayBuffer = await file.arrayBuffer()

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, arrayBuffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    })

  if (uploadError) return Errors.internal()

  const { data, error } = await supabase
    .from("file")
    .insert({
      workspace_id: ws.workspaceId,
      uploaded_by: user.id,
      message_id: messageId && typeof messageId === "string" ? messageId : null,
      name: file.name,
      mime_type: file.type || "application/octet-stream",
      size_bytes: file.size,
      storage_path: storagePath,
    })
    .select()
    .single()

  if (error) return Errors.internal()

  return ok({ file: data }, 201)
}
