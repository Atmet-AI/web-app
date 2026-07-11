import { randomUUID } from "crypto"
import { type NextRequest } from "next/server"
import { getAdminUser } from "@/lib/api/admin"
import { ok, Errors } from "@/lib/api/response"
import { supabaseAdmin } from "@/lib/supabase/admin"

const BUCKET = "skill-assets"
const MAX_FOLDER_FILES = 100
const MAX_TOTAL_BYTES = 50 * 1024 * 1024
const MAX_COVER_BYTES = 5 * 1024 * 1024
const COVER_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"])
const SKILL_TYPES = new Set(["action", "trigger", "tool", "agent"])
const SKILL_CATEGORIES = new Set([
  "Writing",
  "Research",
  "Analysis",
  "Data",
  "Automation",
  "Productivity",
  "Communication",
  "Sales",
  "Marketing",
  "Support",
  "Engineering",
  "Finance",
  "Operations",
  "Legal",
  "HR",
])

function textValue(formData: FormData, key: string) {
  const value = formData.get(key)
  return typeof value === "string" ? value.trim() : ""
}

function safePath(value: string, fallback: string) {
  const cleaned = value
    .split("/")
    .map((part) => part.trim().replace(/[^a-zA-Z0-9._ -]/g, "-"))
    .filter(Boolean)
    .join("/")

  return cleaned || fallback
}

function extensionFor(fileName: string) {
  const ext = fileName.includes(".") ? fileName.split(".").pop()?.toLowerCase() : ""
  return ext ? `.${ext}` : ""
}

async function ensureBucket() {
  const { data: buckets } = await supabaseAdmin.storage.listBuckets()
  if (buckets?.some((bucket) => bucket.name === BUCKET)) return null

  const { error } = await supabaseAdmin.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: MAX_TOTAL_BYTES,
  })

  return error
}

export async function POST(request: NextRequest) {
  const admin = await getAdminUser("super_admin")
  if (!admin.ok) return admin.response

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return Errors.badRequest("Expected multipart/form-data.")
  }

  const name = textValue(formData, "name")
  const description = textValue(formData, "description")
  const category = textValue(formData, "category") || "Automation"
  const type = textValue(formData, "type") || "tool"

  if (!name) return Errors.badRequest("Skill name is required.")
  if (name.length > 100) return Errors.badRequest("Skill name is too long.")
  if (description.length > 500) return Errors.badRequest("Description is too long.")
  if (!SKILL_CATEGORIES.has(category)) return Errors.badRequest("Invalid skill category.")
  if (!SKILL_TYPES.has(type)) return Errors.badRequest("Invalid skill type.")

  const folderFiles = formData.getAll("files").filter((file): file is File => file instanceof File)
  if (folderFiles.length === 0) return Errors.badRequest("Upload a skill folder.")
  if (folderFiles.length > MAX_FOLDER_FILES) {
    return Errors.badRequest(`Upload up to ${MAX_FOLDER_FILES} files per skill folder.`)
  }

  const totalBytes = folderFiles.reduce((sum, file) => sum + file.size, 0)
  if (totalBytes > MAX_TOTAL_BYTES) return Errors.badRequest("Skill folder exceeds the 50 MB limit.")

  const pathsRaw = textValue(formData, "paths")
  let relativePaths: string[] = []
  try {
    relativePaths = pathsRaw ? JSON.parse(pathsRaw) : []
  } catch {
    return Errors.badRequest("Invalid folder file manifest.")
  }

  const cover = formData.get("image")
  if (cover instanceof File) {
    if (cover.size > MAX_COVER_BYTES) return Errors.badRequest("Cover image exceeds the 5 MB limit.")
    if (cover.size > 0 && !COVER_TYPES.has(cover.type)) return Errors.badRequest("Unsupported cover image type.")
  }

  const bucketError = await ensureBucket()
  if (bucketError) return Errors.internal()

  const skillId = randomUUID()
  const basePath = `system/${skillId}`
  let imageUrl: string | null = null

  if (cover instanceof File && cover.size > 0) {
    const coverPath = `${basePath}/cover${extensionFor(cover.name) || ".png"}`
    const { error: uploadCoverError } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(coverPath, await cover.arrayBuffer(), {
        contentType: cover.type || "image/png",
        upsert: false,
      })

    if (uploadCoverError) return Errors.internal()
    imageUrl = supabaseAdmin.storage.from(BUCKET).getPublicUrl(coverPath).data.publicUrl
  }

  const uploadedFiles = []

  for (let index = 0; index < folderFiles.length; index += 1) {
    const file = folderFiles[index]
    const relativePath = safePath(relativePaths[index] || file.name, file.name || `file-${index + 1}`)
    const storagePath = `${basePath}/package/${relativePath}`

    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(storagePath, await file.arrayBuffer(), {
        contentType: file.type || "application/octet-stream",
        upsert: true,
      })

    if (uploadError) return Errors.internal()

    uploadedFiles.push({
      name: file.name,
      path: relativePath,
      mime_type: file.type || "application/octet-stream",
      size_bytes: file.size,
      storage_path: storagePath,
    })
  }

  const definition = {
    source: "folder_upload",
    category,
    package: {
      bucket: BUCKET,
      base_path: `${basePath}/package`,
      file_count: uploadedFiles.length,
      total_size_bytes: totalBytes,
      files: uploadedFiles,
    },
  }

  const { data, error } = await supabaseAdmin
    .from("skill")
    .insert({
      id: skillId,
      workspace_id: null,
      created_by: admin.user.id,
      name,
      description: description || null,
      definition,
      type,
      scope: "system",
      image_url: imageUrl,
      status: "active",
    })
    .select("id, workspace_id, name, description, definition, type, scope, image_url, status, created_by, created_at, updated_at")
    .single()

  if (error) return Errors.internal()

  return ok({ skill: data }, 201)
}
