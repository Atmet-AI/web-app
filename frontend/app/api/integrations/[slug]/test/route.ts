import { NextResponse } from "next/server"

import { testApiKeyConnection } from "@/lib/integrations-store"

export async function POST(request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params

  let payload: { apiKey?: string }

  try {
    payload = (await request.json()) as { apiKey?: string }
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid request body." },
      { status: 400 }
    )
  }

  const result = testApiKeyConnection(slug, payload.apiKey ?? "")

  if (!result.success) {
    return NextResponse.json(result, { status: 400 })
  }

  return NextResponse.json(result)
}
