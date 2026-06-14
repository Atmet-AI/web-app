import { NextResponse } from "next/server"

import { initOAuthConnection } from "@/lib/integrations-store"

export async function POST(request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params
  const result = initOAuthConnection(slug, request.url)

  if (!result) {
    return NextResponse.json(
      { message: "OAuth initialization is not available for this integration." },
      { status: 400 }
    )
  }

  return NextResponse.json(result)
}
