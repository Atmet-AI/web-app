import { NextResponse, type NextRequest } from "next/server"

import { createClient } from "@/lib/supabase/server"

function safeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/ai-core"
  }

  return value
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const next = safeNextPath(url.searchParams.get("next"))

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return NextResponse.redirect(new URL(next, request.url))
    }
  }

  const errorUrl = new URL("/reset-password", request.url)
  errorUrl.searchParams.set("error", "invalid_recovery_link")
  return NextResponse.redirect(errorUrl)
}
