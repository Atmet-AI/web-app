import { NextResponse } from "next/server"

import { connectApiKeyIntegration } from "@/lib/integrations-store"

export async function POST(request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params

  let payload: { apiKey?: string; keyName?: string }

  try {
    payload = (await request.json()) as { apiKey?: string; keyName?: string }
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid request body." },
      { status: 400 }
    )
  }

  const result = connectApiKeyIntegration(slug, payload.apiKey ?? "", payload.keyName)

  if (!result.success) {
    return NextResponse.json(result, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
