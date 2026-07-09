import { NextResponse, type NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"

import { getAccessPolicies, isIpAllowed, sessionTimeoutSeconds } from "@/lib/api/access-policies"
import { TEMP_AUTH_COOKIE, TEMP_AUTH_ISSUED_AT_COOKIE, TEMP_AUTH_SESSION } from "@/lib/temp-auth"

const PUBLIC_PATHS = new Set([
  "/sign-in",
  "/landing-page",
  "/waitlist",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/auth/callback",
])
const REDIRECT_WHEN_SIGNED_IN_PATHS = new Set(["/sign-in", "/waitlist"])
const PUBLIC_API_PATHS = new Set([
  "/api/waitlist",
  "/api/auth/sign-in",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/auth/resend-verification",
])

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.has(pathname) || pathname.startsWith("/invite/")
}

function isPublicApiPath(pathname: string) {
  return (
    PUBLIC_API_PATHS.has(pathname) ||
    pathname.startsWith("/api/telegram/webhook/") ||
    pathname.startsWith("/api/composio/webhook") ||
    (pathname.startsWith("/api/invitations/") && !pathname.endsWith("/revoke"))
  )
}

function isPublicAsset(pathname: string) {
  return (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/Logos/") ||
    pathname.startsWith("/public/") ||
    pathname === "/favicon.ico" ||
    /\.[a-zA-Z0-9]+$/.test(pathname)
  )
}

function getClientIp(request: NextRequest) {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    ""
  )
}

function isApiPath(pathname: string) {
  return pathname.startsWith("/api/")
}

function clearSession(response: NextResponse) {
  response.cookies.delete(TEMP_AUTH_COOKIE)
  response.cookies.delete(TEMP_AUTH_ISSUED_AT_COOKIE)
  return response
}

async function hasSupabaseSession(request: NextRequest, response: NextResponse) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) return false

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options)
        })
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  return Boolean(user)
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const response = NextResponse.next()

  if (isPublicAsset(pathname)) {
    return NextResponse.next()
  }

  const accessPolicies = await getAccessPolicies()
  if (accessPolicies.ipEnabled && !isIpAllowed(getClientIp(request), accessPolicies)) {
    if (isApiPath(pathname)) {
      return NextResponse.json(
        { error: { code: "ip_not_allowed", message: "This network is not allowed to access Atmet." } },
        { status: 403 }
      )
    }

    return new NextResponse("This network is not allowed to access Atmet.", { status: 403 })
  }

  if (isPublicApiPath(pathname)) {
    return NextResponse.next()
  }

  if ((pathname === "/" || pathname === "/onboarding") && request.nextUrl.searchParams.has("code")) {
    const resetUrl = new URL("/reset-password", request.url)
    resetUrl.search = request.nextUrl.search
    return NextResponse.redirect(resetUrl)
  }

  const isSignedIn = request.cookies.get(TEMP_AUTH_COOKIE)?.value === TEMP_AUTH_SESSION
  const issuedAt = Number(request.cookies.get(TEMP_AUTH_ISSUED_AT_COOKIE)?.value ?? 0)
  const sessionMaxAgeMs = sessionTimeoutSeconds(accessPolicies.sessionTimeout) * 1000
  const isSessionExpired = isSignedIn && (!issuedAt || Date.now() - issuedAt > sessionMaxAgeMs)
  const isSupabaseSignedIn = isSignedIn ? false : await hasSupabaseSession(request, response)
  const hasAnySession = isSignedIn || isSupabaseSignedIn

  if (isSessionExpired) {
    if (isApiPath(pathname)) {
      return clearSession(
        NextResponse.json(
          { error: { code: "session_expired", message: "Your session has expired. Please sign in again." } },
          { status: 401 }
        )
      )
    }

    if (isPublicPath(pathname)) {
      return clearSession(NextResponse.next())
    }

    return clearSession(NextResponse.redirect(new URL("/sign-in", request.url)))
  }

  if (isPublicPath(pathname)) {
    if (!hasAnySession || !REDIRECT_WHEN_SIGNED_IN_PATHS.has(pathname)) {
      return response
    }

    return NextResponse.redirect(new URL("/ai-core", request.url))
  }

  if (!hasAnySession) {
    return NextResponse.redirect(new URL("/sign-in", request.url))
  }

  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
}
