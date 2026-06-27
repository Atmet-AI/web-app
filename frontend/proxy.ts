import { NextResponse, type NextRequest } from "next/server"

import { TEMP_AUTH_COOKIE, TEMP_AUTH_SESSION } from "@/lib/temp-auth"

const PUBLIC_PATHS = new Set([
  "/sign-in",
  "/landing-page",
  "/waitlist",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
])
const REDIRECT_WHEN_SIGNED_IN_PATHS = new Set(["/sign-in", "/waitlist"])
const PUBLIC_API_PATHS = new Set([
  "/api/waitlist",
  "/api/auth/sign-in",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/auth/resend-verification",
])

function isPublicAsset(pathname: string) {
  return (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/Logos/") ||
    pathname.startsWith("/public/") ||
    pathname === "/favicon.ico" ||
    /\.[a-zA-Z0-9]+$/.test(pathname)
  )
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (isPublicAsset(pathname) || PUBLIC_API_PATHS.has(pathname)) {
    return NextResponse.next()
  }

  if (pathname === "/onboarding" && request.nextUrl.searchParams.has("code")) {
    const resetUrl = new URL("/reset-password", request.url)
    resetUrl.search = request.nextUrl.search
    return NextResponse.redirect(resetUrl)
  }

  const isSignedIn = request.cookies.get(TEMP_AUTH_COOKIE)?.value === TEMP_AUTH_SESSION

  if (PUBLIC_PATHS.has(pathname)) {
    if (!isSignedIn || !REDIRECT_WHEN_SIGNED_IN_PATHS.has(pathname)) {
      return NextResponse.next()
    }

    return NextResponse.redirect(new URL("/ai-core", request.url))
  }

  if (!isSignedIn) {
    return NextResponse.redirect(new URL("/sign-in", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
}
