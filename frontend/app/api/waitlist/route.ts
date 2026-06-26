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

  const { fullName, email, profileType, company, companySize, role, country, referral, notes } = parsed.data

  // Check for duplicate email
  const { data: existing } = await supabaseAdmin
    .from("waitlist")
    .select("id, status")
    .eq("email", email.toLowerCase())
    .maybeSingle()

  if (existing) {
    if (existing.status === "approved") {
      return Errors.conflict("This email has already been approved. Check your inbox for the invitation.")
    }
    if (existing.status === "pending") {
      return Errors.conflict("This email is already on the waitlist. We'll reach out soon.")
    }
  }

  const { error } = await supabaseAdmin
    .from("waitlist")
    .insert({
      name: fullName,
      email: email.toLowerCase(),
      profile_type: profileType ?? null,
      company: company ?? null,
      company_size: companySize ?? null,
      role: role ?? null,
      country: country ?? null,
      referral: referral ?? null,
      notes: notes ?? null,
    })

  if (error) {
    return Errors.internal()
  }

  return ok({ success: true }, 201)
}
