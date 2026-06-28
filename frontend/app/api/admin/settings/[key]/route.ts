import { type NextRequest } from "next/server"
import { z } from "zod"

import { getAdminUser } from "@/lib/api/admin"
import { Errors, ok } from "@/lib/api/response"
import { supabaseAdmin } from "@/lib/supabase/admin"

const allowedKeys = new Set(["role_permissions", "access_policies"])

const settingSchema = z.object({
  value: z.record(z.string(), z.unknown()),
})

function defaultSetting(key: string) {
  if (key === "role_permissions") {
    return {
      Owner: {
        aiChatAccess: true,
        workflowCreation: true,
        workflowPublishing: true,
        skillCreation: true,
        fileUpload: true,
        appConnections: true,
        adminConsoleAccess: false,
        apiKeyAccess: false,
        billingAccess: false,
      },
      Member: {
        aiChatAccess: true,
        workflowCreation: true,
        workflowPublishing: false,
        skillCreation: true,
        fileUpload: true,
        appConnections: true,
        adminConsoleAccess: false,
        apiKeyAccess: false,
        billingAccess: false,
      },
    }
  }

  return {
    blockedDomains: [],
    mfaMode: "Optional",
    sessionTimeout: "8 hours",
    ipEnabled: false,
    ipAllowlist: "",
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const admin = await getAdminUser()
  if (!admin.ok) return admin.response

  const { key } = await params
  if (!allowedKeys.has(key)) return Errors.notFound("Admin setting")

  const { data, error } = await supabaseAdmin
    .from("platform_setting")
    .select("key, value, updated_at")
    .eq("key", key)
    .maybeSingle()

  if (error) return Errors.internal()

  return ok({ setting: data ?? { key, value: defaultSetting(key), updated_at: null } })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const admin = await getAdminUser("super_admin")
  if (!admin.ok) return admin.response

  const { key } = await params
  if (!allowedKeys.has(key)) return Errors.notFound("Admin setting")

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Errors.badRequest("Invalid JSON body.")
  }

  const parsed = settingSchema.safeParse(body)
  if (!parsed.success) {
    return Errors.validationError(parsed.error.issues[0].message)
  }

  const { data, error } = await supabaseAdmin
    .from("platform_setting")
    .upsert(
      {
        key,
        value: parsed.data.value,
        updated_by: admin.user.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" }
    )
    .select("key, value, updated_at")
    .single()

  if (error) return Errors.internal()

  return ok({ setting: data })
}
