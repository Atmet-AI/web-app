import { type NextRequest } from "next/server"
import { randomUUID } from "crypto"
import { getUser } from "@/lib/api/auth"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { ok, Errors } from "@/lib/api/response"

const BUCKET = "avatars"
const MAX_SIZE_BYTES = 5 * 1024 * 1024
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"])

export async function POST(request: NextRequest) {
  const auth = await getUser()
  if (!auth.ok) return auth.response

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return Errors.badRequest("Expected multipart/form-data.")
  }

  const file = formData.get("file")
  const scope = formData.get("scope")
  const ownerId = formData.get("owner_id")

  if (!(file instanceof File)) return Errors.badRequest("Missing required field: file.")
  if (file.size > MAX_SIZE_BYTES) return Errors.badRequest("Image exceeds the 5 MB size limit.")
  if (!ALLOWED_TYPES.has(file.type)) return Errors.badRequest("Unsupported image type.")

  const normalizedScope = scope === "workspace" ? "workspace" : "user"
  const folderOwner =
    typeof ownerId === "string" && ownerId.trim().length > 0
      ? ownerId.trim()
      : auth.user.id
  const ext = file.name.includes(".") ? file.name.split(".").pop()?.toLowerCase() : "jpg"
  const storagePath = `${normalizedScope}/${folderOwner}/${randomUUID()}${ext ? "." + ext : ""}`

  const { data: existingBuckets } = await supabaseAdmin.storage.listBuckets()
  if (!existingBuckets?.some((bucket) => bucket.name === BUCKET)) {
    const { error: bucketError } = await supabaseAdmin.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: MAX_SIZE_BYTES,
      allowedMimeTypes: Array.from(ALLOWED_TYPES),
    })
    if (bucketError) return Errors.internal()
  }

  const arrayBuffer = await file.arrayBuffer()
  const { error: uploadError } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(storagePath, arrayBuffer, {
      contentType: file.type,
      upsert: false,
    })

  if (uploadError) return Errors.internal()

  const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(storagePath)
  return ok({ url: data.publicUrl, path: storagePath }, 201)
}
