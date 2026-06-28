import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { ok, Errors } from "@/lib/api/response"
import { TEMP_AUTH_COOKIE, TEMP_AUTH_ISSUED_AT_COOKIE } from "@/lib/temp-auth"

export async function POST() {
  const supabase = await createClient()

  const { error } = await supabase.auth.signOut()

  if (error) {
    return Errors.internal()
  }

  const response = ok({ success: true }) as NextResponse
  response.cookies.delete(TEMP_AUTH_COOKIE)
  response.cookies.delete(TEMP_AUTH_ISSUED_AT_COOKIE)

  return response
}
