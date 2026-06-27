import { type NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { ok, Errors } from "@/lib/api/response"
import { z } from "zod"

const waitlistSchema = z.object({
  fullName: z.string().min(2, "Name is required"),
  email: z.string().email("Valid email required"),
  profileType: z.enum(["company", "solo"]).optional(),
  company: z.string().optional(),
  companySize: z.string().optional(),
  role: z.string().optional(),
  country: z.string().optional(),
  referral: z.string().optional(),
  notes: z.string().optional(),
})

async function hasProfileForEmail(email: string) {
  const { data } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle()

  return Boolean(data)
}

function toWaitlistRow(data: z.infer<typeof waitlistSchema>, normalizedEmail: string) {
  return {
    name: data.fullName,
    email: normalizedEmail,
    profile_type: data.profileType ?? null,
    company: data.company ?? null,
    company_size: data.companySize ?? null,
    role: data.role ?? null,
    country: data.country ?? null,
    referral: data.referral ?? null,
    notes: data.notes ?? null,
    status: "pending",
    reviewed_by: null,
    reviewed_at: null,
  }
}

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Errors.badRequest("Invalid JSON body.")
  }

  const parsed = waitlistSchema.safeParse(body)
  if (!parsed.success) {
    return Errors.validationError(parsed.error.issues[0].message)
  }

  const { email } = parsed.data
  const normalizedEmail = email.toLowerCase()

  // Check for duplicate email
  const { data: existing } = await supabaseAdmin
    .from("waitlist")
    .select("id, status")
    .eq("email", normalizedEmail)
    .maybeSingle()

  if (existing) {
    if (existing.status === "approved") {
      const profileExists = await hasProfileForEmail(normalizedEmail)
      if (profileExists) {
        return Errors.conflict("This email has already been approved. Sign in to continue.")
      }

      const { error: updateError } = await supabaseAdmin
        .from("waitlist")
        .update(toWaitlistRow(parsed.data, normalizedEmail))
        .eq("id", existing.id)

      if (updateError) return Errors.internal()

      return ok({ success: true }, 201)
    }

    if (existing.status === "pending" || existing.status === "rejected") {
      const { error: updateError } = await supabaseAdmin
        .from("waitlist")
        .update(toWaitlistRow(parsed.data, normalizedEmail))
        .eq("id", existing.id)

      if (updateError) return Errors.internal()

      return ok({ success: true }, 201)
    }
  }

  const { error } = await supabaseAdmin
    .from("waitlist")
    .insert(toWaitlistRow(parsed.data, normalizedEmail))

  if (error) {
    return Errors.internal()
  }

  return ok({ success: true }, 201)
}
