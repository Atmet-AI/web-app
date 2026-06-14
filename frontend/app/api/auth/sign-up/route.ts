import { NextResponse } from "next/server"

type SignUpPayload = {
  name?: string
  email?: string
  password?: string
}

export async function POST(request: Request) {
  await new Promise((resolve) => setTimeout(resolve, 1000))

  // TODO: Replace with real database user creation.
  const body = (await request.json()) as SignUpPayload

  if (body.email === "taken@test.com") {
    return NextResponse.json({ error: "email_taken" }, { status: 409 })
  }

  return NextResponse.json({ success: true, userId: "usr_mock_001" })
}
