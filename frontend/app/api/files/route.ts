import { type NextRequest } from "next/server"
import { randomUUID } from "crypto"
import { getUser } from "@/lib/api/auth"
import { assertWorkspaceMember, getWorkspaceId } from "@/lib/api/workspace"
import { ok, Errors } from "@/lib/api/response"
import { supabaseAdmin } from "@/lib/supabase/admin"

const BUCKET = "workspace-files"

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0
}

function featureRecord(features: unknown) {
  return features && typeof features === "object" && !Array.isArray(features)
    ? (features as Record<string, unknown>)
    : {}
}

async function getWorkspaceFileLimits(workspaceId: string) {
  const [settingsRes, workspaceRes, filesRes] = await Promise.all([
    supabaseAdmin.from("platform_setting").select("value").eq("key", "usage_limits").maybeSingle(),
    supabaseAdmin.from("workspace").select("features").eq("id", workspaceId).maybeSingle(),
    supabaseAdmin.from("file").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId),
  ])

  const globalValue = settingsRes.data?.value && typeof settingsRes.data.value === "object"
    ? settingsRes.data.value as Record<string, unknown>
    : {}
  const globalMaxFileSizeMb = readNumber(globalValue.maxFileSizeMb) || 250
  const globalMaxFilesPerWorkspace = readNumber(globalValue.maxFilesPerWorkspace) || 10000
  const workspaceFeatures = featureRecord(workspaceRes.data?.features)
  const limits = featureRecord(workspaceFeatures.limits)

  return {
    maxFileSizeMb: readNumber(limits.maxFileSizeMb) || globalMaxFileSizeMb,
    maxFilesPerWorkspace: readNumber(limits.maxFilesPerWorkspace) || globalMaxFilesPerWorkspace,
    filesCount: filesRes.count ?? 0,
  }
}

async function ensureWorkspaceFilesBucket() {
  const { data: existingBuckets } = await supabaseAdmin.storage.listBuckets()
  if (existingBuckets?.some((bucket) => bucket.name === BUCKET)) return null

  const { error } = await supabaseAdmin.storage.createBucket(BUCKET, {
    public: false,
    fileSizeLimit: 250 * 1024 * 1024,
  })

  return error
}

export async function POST(request: NextRequest) {
  const auth = await getUser()
  if (!auth.ok) return auth.response

  const ws = getWorkspaceId(request)
  if (!ws.ok) return ws.response

  const { user } = auth

  const isMember = await assertWorkspaceMember(supabaseAdmin, ws.workspaceId, user.id)
  if (!isMember) return Errors.forbidden()

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

  const fileLimits = await getWorkspaceFileLimits(ws.workspaceId)

  if (file.size > fileLimits.maxFileSizeMb * 1024 * 1024) {
    return Errors.badRequest(`File exceeds the ${fileLimits.maxFileSizeMb} MB size limit.`)
  }

  if (fileLimits.filesCount >= fileLimits.maxFilesPerWorkspace) {
    return Errors.badRequest(`Workspace has reached the ${fileLimits.maxFilesPerWorkspace.toLocaleString()} file limit.`)
  }

  const messageId = formData.get("message_id")
  const ext = file.name.split(".").pop() ?? ""
  const storagePath = `${ws.workspaceId}/${randomUUID()}${ext ? "." + ext : ""}`

  const arrayBuffer = await file.arrayBuffer()

  const bucketError = await ensureWorkspaceFilesBucket()
  if (bucketError) return Errors.internal()

  const { error: uploadError } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(storagePath, arrayBuffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    })

  if (uploadError) return Errors.internal()

  const { data, error } = await supabaseAdmin
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
