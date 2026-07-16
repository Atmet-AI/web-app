import { type NextRequest } from "next/server"
import { getUser } from "@/lib/api/auth"
import { ok, Errors } from "@/lib/api/response"
import { updateAutomationSchema } from "@/lib/validations/automation"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getUser()
  if (!auth.ok) return auth.response

  const { supabase } = auth
  const { id } = await params

  const { data, error } = await supabase
    .from("automation")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  if (error || !data) return Errors.notFound("Automation")

  const { data: chatLinks } = await supabase
    .from("chats_automation")
    .select("chat_id")
    .eq("automation_id", id)

  const chatIds = Array.from(
    new Set((chatLinks ?? []).map((link) => link.chat_id).filter(Boolean))
  )

  const { data: chatUsers } = chatIds.length
    ? await supabase
        .from("chats_users")
        .select("user:user_id(id, email, full_name, avatar_url, status)")
        .in("chat_id", chatIds)
    : { data: [] }

  const { data: agent } = await supabase
    .from("agent")
    .select(
      "id, name, description, goal, status, instructions, blueprint_json, runtime_config_json, created_at, updated_at, tools:agent_tool(id, provider, tool_name, connection_id, permissions_json), triggers:agent_trigger(id, type, provider, event_type, status, config_json, external_trigger_id, error, last_received_at, last_run_at), memory:agent_memory(id, scope, key, value_json, updated_at), approvals:agent_approval(id, run_id, status, action_json, requested_at, resolved_at), runs:agent_run(id, status, input_json, output_json, queued_at, started_at, finished_at, error, created_at)"
    )
    .eq("legacy_automation_id", id)
    .maybeSingle()

  return ok({ automation: data, agent: agent ?? null, chatUsers: chatUsers ?? [] })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getUser()
  if (!auth.ok) return auth.response

  const { supabase } = auth
  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Errors.badRequest("Invalid JSON body.")
  }

  const parsed = updateAutomationSchema.safeParse(body)
  if (!parsed.success) return Errors.validationError(parsed.error.issues[0].message)

  const { data, error } = await supabase
    .from("automation")
    .update(parsed.data)
    .eq("id", id)
    .select()
    .single()

  if (error || !data) return Errors.notFound("Automation")

  return ok({ automation: data })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getUser()
  if (!auth.ok) return auth.response

  const { supabase } = auth
  const { id } = await params

  const { error } = await supabase.from("automation").delete().eq("id", id)

  if (error) return Errors.internal()

  return ok({ success: true })
}
