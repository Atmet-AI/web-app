import { NextResponse } from "next/server"

type SignInPayload = {
  email?: string
  password?: string
}

export async function POST(request: Request) {
  await new Promise((resolve) => setTimeout(resolve, 1000))

  // TODO: Replace with real credential validation and JWT issuance.
  const body = (await request.json()) as SignInPayload

  if (body.password === "wrong") {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 })
  }

  if (body.email === "unverified@test.com") {
    return NextResponse.json({ error: "unverified_email" }, { status: 403 })
  }

  return NextResponse.json({
    success: true,
    token: `mock_token_${Date.now()}`,
    user: {
      id: "usr_mock_001",
      name: "Amir Haddad",
      email: body.email ?? "",
      role: "Owner",
    },
  })
}
