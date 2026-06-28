import { randomUUID } from "crypto"
import { type NextRequest } from "next/server"

import { Errors, ok } from "@/lib/api/response"
import { supabaseAdmin } from "@/lib/supabase/admin"

const BUCKET = "avatars"
const MAX_SIZE_BYTES = 5 * 1024 * 1024
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
])

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  const { data: invitation, error: invitationError } = await supabaseAdmin
    .from("invitation")
    .select("id, email, status, expires_at")
    .eq("token", token)
    .eq("status", "pending")
    .maybeSingle()

  if (invitationError || !invitation) return Errors.notFound("Invitation")
  if (new Date(invitation.expires_at) < new Date()) {
    await supabaseAdmin
      .from("invitation")
      .update({ status: "expired" })
      .eq("id", invitation.id)
    return Errors.notFound("Invitation")
  }

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
    return Errors.badRequest("Image exceeds the 5 MB size limit.")
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return Errors.badRequest("Unsupported image type.")
  }

  const ext = file.name.includes(".")
    ? file.name.split(".").pop()?.toLowerCase()
    : "jpg"
  const safeEmail = invitation.email.replace(/[^a-zA-Z0-9._-]/g, "_")
  const storagePath = `invites/${safeEmail}/${randomUUID()}${ext ? "." + ext : ""}`

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
