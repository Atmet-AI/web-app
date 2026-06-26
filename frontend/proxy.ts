import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

const PROTECTED_ROUTES = [
  "/ai-core",
  "/dashboard",
  "/workflow",
  "/apps",
  "/skills",
  "/settings",
  "/integrations",
  "/onboarding",
]

const AUTH_ROUTES = [
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/verify-email",
  "/waitlist",
]

const PUBLIC_API_PREFIXES = [
  "/api/auth/",
  "/api/invitations/",
  "/api/waitlist",
]

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session — required by @supabase/ssr on every request
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isAuthRoute = AUTH_ROUTES.some((r) => pathname.startsWith(r))
  const isProtectedRoute = PROTECTED_ROUTES.some((r) => pathname.startsWith(r))
  const isPublicApi = PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p))
  const isApiRoute = pathname.startsWith("/api/")

  // Unauthenticated user hitting a protected page → redirect to sign-in
  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone()
    url.pathname = "/sign-in"
    url.searchParams.set("redirect", pathname)
    return NextResponse.redirect(url)
  }

  // Unauthenticated user hitting a protected API route → 401 JSON
  if (!user && isApiRoute && !isPublicApi) {
    return NextResponse.json(
      { error: { code: "unauthorized", message: "Authentication required." } },
      { status: 401 }
    )
  }

  // Authenticated user hitting auth pages → redirect to app
  if (user && isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = "/ai-core"
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
