import { type NextRequest, NextResponse } from "next/server"

import { getAccessPolicies, isEmailDomainBlocked, sessionTimeoutSeconds } from "@/lib/api/access-policies"
import { Errors } from "@/lib/api/response"
import { createClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import {
  TEMP_AUTH_COOKIE,
  TEMP_AUTH_EMAIL,
  TEMP_AUTH_ISSUED_AT_COOKIE,
  TEMP_AUTH_PASSWORD,
  TEMP_AUTH_SESSION,
  TEMP_AUTH_USER,
} from "@/lib/temp-auth"
import { signInSchema } from "@/lib/validations/auth"

type SignInPayload = {
  email?: string
  password?: string
  otp?: string
}

type AuthListUser = Awaited<
  ReturnType<typeof supabaseAdmin.auth.admin.listUsers>
>["data"]["users"][number]

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

async function findAuthUserByEmail(email: string): Promise<AuthListUser | null> {
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage: 100,
    })

    if (error) return null

    const user = data.users.find(
      (candidate) => candidate.email?.toLowerCase() === email
    )
    if (user) return user
    if (data.users.length < 100) return null
  }

  return null
}

function isFirstLoginUser(user: AuthListUser) {
  return Boolean(user.email) && user.user_metadata?.password_set !== true
}

async function ensureApprovedAuthUser(
  email: string,
  fullName: string
): Promise<{ user: AuthListUser | null; error: string | null }> {
  const existingUser = await findAuthUserByEmail(email)
  if (existingUser) {
    let user = existingUser
    if (!existingUser.email_confirmed_at) {
      const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
        existingUser.id,
        {
          email_confirm: true,
          user_metadata: {
            ...existingUser.user_metadata,
            full_name: existingUser.user_metadata?.full_name ?? fullName,
            password_set: existingUser.user_metadata?.password_set ?? false,
          },
        }
      )

      if (error) return { user: null, error: error.message }
      user = data.user
    }

    await supabaseAdmin.from("users").upsert(
      {
        id: user.id,
        email: user.email ?? email,
        full_name: user.user_metadata?.full_name ?? fullName,
        platform_role: "user",
        onboarding_completed: user.user_metadata?.password_set === true,
        status: user.user_metadata?.password_set === true ? "active" : "inactive",
      },
      { onConflict: "id" }
    )

    return { user, error: null }
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      password_set: false,
    },
  })

  if (error) return { user: null, error: error.message }

  await supabaseAdmin.from("users").upsert(
    {
      id: data.user.id,
      email: data.user.email ?? email,
      full_name: fullName,
      platform_role: "user",
      onboarding_completed: false,
      status: "inactive",
    },
    { onConflict: "id" }
  )

  return { user: data.user, error: null }
}

async function getApprovedWaitlistEntry(email: string) {
  const { data } = await supabaseAdmin
    .from("waitlist")
    .select("email, name, status")
    .eq("email", email)
    .eq("status", "approved")
    .maybeSingle()

  return data
}

function buildSignedInResponse(user: {
  id: string
  email?: string
  user_metadata?: { full_name?: string }
}, maxAge: number) {
  const response = NextResponse.json({
    data: {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name ?? null,
      },
    },
  })

  response.cookies.set({
    name: TEMP_AUTH_COOKIE,
    value: TEMP_AUTH_SESSION,
    httpOnly: true,
    sameSite: "lax",
    secure: APP_URL.startsWith("https://"),
    path: "/",
    maxAge,
  })
  response.cookies.set({
    name: TEMP_AUTH_ISSUED_AT_COOKIE,
    value: Date.now().toString(),
    httpOnly: true,
    sameSite: "lax",
    secure: APP_URL.startsWith("https://"),
    path: "/",
    maxAge,
  })

  return response
}

export async function POST(request: NextRequest) {
  let body: SignInPayload
  try {
    body = (await request.json()) as SignInPayload
  } catch {
    return Errors.badRequest("Invalid JSON body.")
  }

  const email = body.email?.trim().toLowerCase()
  if (!email) return Errors.validationError("Invalid email address")

  const accessPolicies = await getAccessPolicies()
  if (isEmailDomainBlocked(email, accessPolicies)) {
    return Errors.forbidden("This email domain is not allowed to access Atmet.")
  }
  const sessionMaxAge = sessionTimeoutSeconds(accessPolicies.sessionTimeout)

  if (body.otp) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: body.otp.trim(),
      type: "email",
    })

    if (error || !data.user) {
      return Errors.unauthorized("Invalid or expired OTP.")
    }

    return buildSignedInResponse(data.user, sessionMaxAge)
  }

  if (!body.password) {
    const authUser = await findAuthUserByEmail(email)
    const approvedEntry = await getApprovedWaitlistEntry(email)

    if (
      ((approvedEntry && (!authUser || isFirstLoginUser(authUser))) ||
        (authUser && isFirstLoginUser(authUser))) &&
      email !== TEMP_AUTH_EMAIL
    ) {
      if (approvedEntry && !authUser) {
        const ensured = await ensureApprovedAuthUser(email, approvedEntry.name)
        if (ensured.error || !ensured.user) {
          return Errors.badRequest(`OTP setup failed: ${ensured.error ?? "Unable to prepare this account."}`)
        }
      }

      const supabase = await createClient()
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false,
        },
      })

      if (error) {
        console.error("OTP email error:", error.message)
        return Errors.badRequest(`OTP email was not sent: ${error.message}`)
      }

      return NextResponse.json({
        data: {
          status: "otp_sent",
        },
      })
    }

    return NextResponse.json({
      data: {
        status: "password_required",
      },
    })
  }

  if (email === TEMP_AUTH_EMAIL && body.password === TEMP_AUTH_PASSWORD) {
    return buildSignedInResponse(
      {
        id: TEMP_AUTH_USER.id,
        email: TEMP_AUTH_USER.email,
        user_metadata: { full_name: TEMP_AUTH_USER.name },
      },
      sessionMaxAge
    )
  }

  const parsed = signInSchema.safeParse({ email, password: body.password })
  if (!parsed.success) {
    return Errors.validationError(parsed.error.issues[0].message)
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data)

  if (error) {
    if (error.message.toLowerCase().includes("email not confirmed")) {
      return Errors.forbidden("Please verify your email first.")
    }
    return Errors.unauthorized("Incorrect email or password.")
  }

  if (!data.user) return Errors.unauthorized("Incorrect email or password.")

  return buildSignedInResponse(data.user, sessionMaxAge)
}
