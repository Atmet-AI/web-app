import { NextResponse } from "next/server"

import { completeOAuthConnection } from "@/lib/integrations-store"

export async function POST(request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params

  let payload: { code?: string }

  try {
    payload = (await request.json()) as { code?: string }
  } catch {
    return NextResponse.json({ success: false, message: "Invalid request body." }, { status: 400 })
  }

  const code = payload.code?.trim() ?? ""
  const result = completeOAuthConnection(slug, code)

  if (!result.success) {
    return NextResponse.json(
      { success: false, message: "OAuth callback failed. Please try again." },
      { status: 400 }
    )
  }

  return NextResponse.json({ success: true })
}
