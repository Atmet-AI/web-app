import { NextResponse } from "next/server"

import { disconnectIntegration, getIntegration } from "@/lib/integrations-store"

export async function GET(_: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params
  const integration = getIntegration(slug)

  if (!integration) {
    return NextResponse.json({ message: "Integration not found." }, { status: 404 })
  }

  return NextResponse.json(integration)
}

export async function DELETE(_: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params
  const result = disconnectIntegration(slug)

  if (!result.success) {
    return NextResponse.json({ success: false, message: "Integration not found." }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
