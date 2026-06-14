import { NextResponse } from "next/server"

export async function POST() {
  await new Promise((resolve) => setTimeout(resolve, 800))

  // TODO: Replace with real verification email sending (e.g., SendGrid).
  return NextResponse.json({ success: true })
}
