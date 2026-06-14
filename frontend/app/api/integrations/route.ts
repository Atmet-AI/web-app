import { NextResponse } from "next/server"

import { listIntegrations } from "@/lib/integrations-store"

export async function GET() {
  return NextResponse.json(listIntegrations())
}
