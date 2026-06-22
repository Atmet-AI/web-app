import { NextResponse } from "next/server"

import {
  TEMP_AUTH_COOKIE,
  TEMP_AUTH_EMAIL,
  TEMP_AUTH_PASSWORD,
  TEMP_AUTH_SESSION,
  TEMP_AUTH_USER,
} from "@/lib/temp-auth"

type SignInPayload = {
  email?: string
  password?: string
}

export async function POST(request: Request) {
  await new Promise((resolve) => setTimeout(resolve, 1000))

  const body = (await request.json()) as SignInPayload
  const email = body.email?.trim().toLowerCase()
  const protocol = request.headers.get("x-forwarded-proto") ?? new URL(request.url).protocol

  if (email !== TEMP_AUTH_EMAIL || body.password !== TEMP_AUTH_PASSWORD) {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 })
  }

  const response = NextResponse.json({
    success: true,
    token: TEMP_AUTH_SESSION,
    user: TEMP_AUTH_USER,
  })

  response.cookies.set({
    name: TEMP_AUTH_COOKIE,
    value: TEMP_AUTH_SESSION,
    httpOnly: true,
    sameSite: "lax",
    secure: protocol.replace(":", "") === "https",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  })

  return response
}
