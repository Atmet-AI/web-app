import { type NextRequest } from "next/server"
import { z } from "zod"

import { getUser } from "@/lib/api/auth"
import { ok, Errors } from "@/lib/api/response"
import { assertWorkspaceMember, getWorkspaceId } from "@/lib/api/workspace"
import { createComposioMcpSession, getComposioUserId } from "@/lib/integrations/composio"
import { buildPublicUrl } from "@/lib/public-url"

const sessionSchema = z.object({
  toolkits: z.array(z.string().min(1).max(100)).max(25).optional(),
  callbackPath: z.string().startsWith("/").max(500).optional(),
})

export async function POST(request: NextRequest) {
  const auth = await getUser()
  if (!auth.ok) return auth.response

  const ws = getWorkspaceId(request)
  if (!ws.ok) return ws.response

  const isMember = await assertWorkspaceMember(auth.supabase, ws.workspaceId, auth.user.id)
  if (!isMember) return Errors.forbidden()

  const body = await request.json().catch(() => ({}))
  const parsed = sessionSchema.safeParse(body)
  if (!parsed.success) {
    return Errors.validationError(parsed.error.issues[0]?.message ?? "Invalid Composio session request.")
  }

  try {
    const session = await createComposioMcpSession({
      workspaceId: ws.workspaceId,
      userId: auth.user.id,
      toolkits: parsed.data.toolkits,
      callbackUrl: buildPublicUrl(parsed.data.callbackPath ?? "/integrations", request),
    })

    return ok({
      composioUserId: getComposioUserId(ws.workspaceId, auth.user.id),
      session,
    })
  } catch (error) {
    console.error("Composio session creation failed", error)
    return Errors.badRequest(error instanceof Error ? error.message : "Unable to create Composio session.")
  }
}
