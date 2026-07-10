import { type NextRequest } from "next/server"
import type { SupabaseClient } from "@supabase/supabase-js"
import { z } from "zod"

import { getUser } from "@/lib/api/auth"
import { ok, Errors } from "@/lib/api/response"

const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(40000),
})

const createAgentSchema = z.object({
  sourceMessageId: z.number().optional(),
  messages: z.array(chatMessageSchema).min(1).max(80).optional(),
})

async function isChatParticipant(
  supabase: SupabaseClient,
  chatId: string,
  userId: string
) {
  const { data, error } = await supabase
    .from("chats_users")
    .select("chat_id")
    .eq("chat_id", chatId)
    .eq("user_id", userId)
    .maybeSingle()

  if (error) return null
  return Boolean(data)
}

function compactTitle(value: string, fallback: string) {
  const normalized = value.replace(/\s+/g, " ").trim()
  if (!normalized) return fallback
  return normalized.length > 72 ? `${normalized.slice(0, 72)}...` : normalized
}

function buildNodeDescription(
  messages: Array<{ role: "user" | "assistant"; content: string }>
) {
  const userMessages = messages.filter((m) => m.role === "user")
  const assistantMessages = messages.filter((m) => m.role === "assistant")
  const parts: string[] = []
  if (userMessages.length > 0) {
    const preview = userMessages[0].content.replace(/\s+/g, " ").trim()
    parts.push(preview.length > 120 ? `${preview.slice(0, 120)}...` : preview)
  }
  parts.push(
    `${messages.length} messages (${userMessages.length} user · ${assistantMessages.length} AI)`
  )
  return parts.join(" — ")
}

function detectComposioTrigger(
  messages: Array<{ role: "user" | "assistant"; content: string }>
) {
  const transcript = messages.map((message) => message.content).join("\n")
  if (
    !/\b(when|whenever|every\s+time|trigger|watch|listen|monitor|on\s+new|received|arrives?|incoming|sent)\b/i.test(
      transcript
    )
  ) {
    return null
  }

  if (/\b(gmail|email|mailbox|inbox)\b/i.test(transcript)) {
    if (/\b(sent|send\s+from\s+my\s+gmail|outgoing)\b/i.test(transcript)) {
      return {
        provider: "Gmail",
        appName: "Gmail",
        name: "Email sent",
        slug: "GMAIL_EMAIL_SENT_TRIGGER",
        description:
          "Composio Gmail trigger for messages sent by the connected mailbox.",
      }
    }

    return {
      provider: "Gmail",
      appName: "Gmail",
      name: "New Gmail message",
      slug: "GMAIL_NEW_GMAIL_MESSAGE",
      description:
        "Composio Gmail trigger for newly received messages in the connected mailbox.",
    }
  }

  if (/\b(google\s*calendar|calendar|event|meeting)\b/i.test(transcript)) {
    if (
      /\b(starting|starts?\s+soon|before\s+an?\s+event|minutes?\s+before)\b/i.test(
        transcript
      )
    ) {
      return {
        provider: "Google Calendar",
        appName: "Google Calendar",
        name: "Calendar event starting soon",
        slug: "GOOGLECALENDAR_EVENT_STARTING_SOON_TRIGGER",
        description:
          "Composio Google Calendar trigger for events starting soon.",
      }
    }

    if (/\b(cancel|cancelled|canceled|deleted|removed)\b/i.test(transcript)) {
      return {
        provider: "Google Calendar",
        appName: "Google Calendar",
        name: "Calendar event canceled or deleted",
        slug: "GOOGLECALENDAR_EVENT_CANCELED_DELETED_TRIGGER",
        description:
          "Composio Google Calendar trigger for canceled or deleted events.",
      }
    }

    if (/\b(update|updated|changed|modified|change)\b/i.test(transcript)) {
      return {
        provider: "Google Calendar",
        appName: "Google Calendar",
        name: "Calendar event updated",
        slug: "GOOGLECALENDAR_GOOGLE_CALENDAR_EVENT_UPDATED_TRIGGER",
        description: "Composio Google Calendar trigger for updated events.",
      }
    }

    return {
      provider: "Google Calendar",
      appName: "Google Calendar",
      name: "Calendar event created",
      slug: "GOOGLECALENDAR_GOOGLE_CALENDAR_EVENT_CREATED_TRIGGER",
      description: "Composio Google Calendar trigger for newly created events.",
    }
  }

  if (/\b(google\s*sheets?|spreadsheet|worksheet|sheet)\b/i.test(transcript)) {
    if (/\b(row|rows)\b/i.test(transcript)) {
      return {
        provider: "Google Sheets",
        appName: "Google Sheets",
        name: "New Google Sheets row",
        slug: "GOOGLESHEETS_NEW_ROWS_TRIGGER",
        description: "Composio Google Sheets trigger for new rows in a sheet.",
      }
    }

    if (/\b(cell|range|value|values)\b/i.test(transcript)) {
      return {
        provider: "Google Sheets",
        appName: "Google Sheets",
        name: "Google Sheets cell range changed",
        slug: "GOOGLESHEETS_CELL_RANGE_VALUES_CHANGED_TRIGGER",
        description:
          "Composio Google Sheets trigger for changed values in a range.",
      }
    }

    return {
      provider: "Google Sheets",
      appName: "Google Sheets",
      name: "New Google spreadsheet created",
      slug: "GOOGLESHEETS_NEW_SPREADSHEET_CREATED_TRIGGER",
      description:
        "Composio Google Sheets trigger for newly created spreadsheets.",
    }
  }

  if (/\b(google\s*docs?|document|documents|doc)\b/i.test(transcript)) {
    if (/\b(keyword|phrase|contains?|appears?)\b/i.test(transcript)) {
      return {
        provider: "Google Docs",
        appName: "Google Docs",
        name: "Google Docs keyword detected",
        slug: "GOOGLEDOCS_KEYWORD_DETECTED_TRIGGER",
        description:
          "Composio Google Docs trigger for a keyword detected in a document.",
      }
    }

    if (/\b(update|updated|changed|modified|edit|edited)\b/i.test(transcript)) {
      return {
        provider: "Google Docs",
        appName: "Google Docs",
        name: "Google Doc updated",
        slug: "GOOGLEDOCS_DOCUMENT_UPDATED_TRIGGER",
        description: "Composio Google Docs trigger for updated documents.",
      }
    }

    return {
      provider: "Google Docs",
      appName: "Google Docs",
      name: "Google Doc created",
      slug: "GOOGLEDOCS_DOCUMENT_CREATED_TRIGGER",
      description: "Composio Google Docs trigger for newly created documents.",
    }
  }

  if (/\b(google\s*drive|drive|file|folder)\b/i.test(transcript)) {
    if (/\b(comment|commented|reply)\b/i.test(transcript)) {
      return {
        provider: "Google Drive",
        appName: "Google Drive",
        name: "Drive comment added",
        slug: "GOOGLEDRIVE_COMMENT_ADDED_TRIGGER",
        description: "Composio Google Drive trigger for new comments on files.",
      }
    }

    if (/\b(delete|deleted|trash|trashed|removed)\b/i.test(transcript)) {
      return {
        provider: "Google Drive",
        appName: "Google Drive",
        name: "Drive file deleted or trashed",
        slug: "GOOGLEDRIVE_FILE_DELETED_OR_TRASHED_TRIGGER",
        description:
          "Composio Google Drive trigger for deleted or trashed files.",
      }
    }

    if (/\b(update|updated|changed|modified|edit|edited)\b/i.test(transcript)) {
      return {
        provider: "Google Drive",
        appName: "Google Drive",
        name: "Drive file updated",
        slug: "GOOGLEDRIVE_FILE_UPDATED_TRIGGER",
        description: "Composio Google Drive trigger for updated files.",
      }
    }

    return {
      provider: "Google Drive",
      appName: "Google Drive",
      name: "Drive file created",
      slug: "GOOGLEDRIVE_FILE_CREATED_TRIGGER",
      description: "Composio Google Drive trigger for new files.",
    }
  }

  if (
    /\b(github|pull\s*request|PR\b|issue|repository|repo|branch|commit|workflow|action\s*run|release|star)\b/i.test(
      transcript
    )
  ) {
    if (/\b(pull\s*request|PR\b)\b/i.test(transcript)) {
      if (
        /\b(update|updated|changed|modified|review|reviewed)\b/i.test(
          transcript
        )
      ) {
        return {
          provider: "GitHub",
          appName: "GitHub",
          name: "GitHub pull request updated",
          slug: "GITHUB_PULL_REQUEST_UPDATED",
          description: "Composio GitHub trigger for updated pull requests.",
        }
      }

      return {
        provider: "GitHub",
        appName: "GitHub",
        name: "GitHub pull request created",
        slug: "GITHUB_PULL_REQUEST_CREATED",
        description: "Composio GitHub trigger for newly created pull requests.",
      }
    }

    if (/\b(issue|issues)\b/i.test(transcript)) {
      if (/\b(assign|assigned)\b/i.test(transcript)) {
        return {
          provider: "GitHub",
          appName: "GitHub",
          name: "GitHub issue assigned",
          slug: "GITHUB_ISSUE_ASSIGNED_TO_ME_TRIGGER",
          description:
            "Composio GitHub trigger for issues assigned to the connected user.",
        }
      }

      return {
        provider: "GitHub",
        appName: "GitHub",
        name: "GitHub issue created",
        slug: "GITHUB_ISSUE_CREATED_TRIGGER",
        description: "Composio GitHub trigger for newly created issues.",
      }
    }

    if (/\b(branch|branches)\b/i.test(transcript)) {
      return {
        provider: "GitHub",
        appName: "GitHub",
        name: "GitHub branch changed",
        slug: "GITHUB_BRANCH_CHANGED_TRIGGER",
        description: "Composio GitHub trigger for branch changes.",
      }
    }

    if (/\b(workflow|actions?|run|job)\b/i.test(transcript)) {
      return {
        provider: "GitHub",
        appName: "GitHub",
        name: "GitHub workflow run created",
        slug: "GITHUB_WORKFLOW_RUN_CREATED",
        description: "Composio GitHub trigger for new workflow runs.",
      }
    }

    if (/\b(star|stargazer)\b/i.test(transcript)) {
      return {
        provider: "GitHub",
        appName: "GitHub",
        name: "GitHub star added",
        slug: "GITHUB_STAR_ADDED_EVENT",
        description:
          "Composio GitHub trigger for newly added repository stars.",
      }
    }

    return {
      provider: "GitHub",
      appName: "GitHub",
      name: "GitHub commit event",
      slug: "GITHUB_COMMIT_EVENT",
      description: "Composio GitHub trigger for repository commits.",
    }
  }

  return null
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getUser()
  if (!auth.ok) return auth.response

  const { supabase, user } = auth
  const { id: chatId } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Errors.badRequest("Invalid JSON body.")
  }

  const parsed = createAgentSchema.safeParse(body)
  if (!parsed.success)
    return Errors.validationError(parsed.error.issues[0].message)

  const canAccessChat = await isChatParticipant(supabase, chatId, user.id)
  if (canAccessChat === null) return Errors.internal()
  if (!canAccessChat) return Errors.notFound("Chat")

  const { data: chat, error: chatError } = await supabase
    .from("chat")
    .select("id, workspace_id, title")
    .eq("id", chatId)
    .maybeSingle()

  if (chatError || !chat) return Errors.notFound("Chat")

  let sourceMessages = parsed.data.messages

  if (!sourceMessages || sourceMessages.length === 0) {
    const { data: dbMessages, error: messagesError } = await supabase
      .from("message")
      .select("role, content")
      .eq("chat_id", chatId)
      .in("role", ["user", "assistant"])
      .order("created_at", { ascending: true })
      .limit(40)

    if (messagesError) return Errors.internal()

    sourceMessages = (dbMessages ?? [])
      .filter(
        (message) => message.role === "user" || message.role === "assistant"
      )
      .map((message) => ({
        role: message.role as "user" | "assistant",
        content: message.content,
      }))
  }

  const cleanedMessages = (sourceMessages ?? []).filter((message) =>
    message.content.trim()
  )
  if (cleanedMessages.length === 0) {
    return Errors.badRequest(
      "This chat does not have enough messages to create an agent."
    )
  }

  const firstUserMessage = cleanedMessages.find(
    (message) => message.role === "user"
  )
  const agentName = compactTitle(
    firstUserMessage?.content ?? chat.title,
    "AI agent"
  )
  const totalTokens = cleanedMessages.reduce(
    (sum, m) => sum + Math.max(1, Math.ceil(m.content.length / 4)),
    0
  )
  const composioTrigger = detectComposioTrigger(cleanedMessages)

  const steps = [
    ...(composioTrigger
      ? [
          {
            name: composioTrigger.name,
            status: "In review" as const,
            owner: "Composio",
            nodeType: "Trigger" as const,
            provider: composioTrigger.provider,
            model: composioTrigger.slug,
            prompt: composioTrigger.description,
            tokenCount: 0,
            usedApps: [composioTrigger.appName],
            usedSkills: [],
            files: [],
            chatId: chatId,
          },
        ]
      : []),
    {
      name: agentName,
      status: "In review" as const,
      owner: "Atmet AI",
      nodeType: "Action" as const,
      provider: "Atmet",
      model: "",
      prompt: buildNodeDescription(cleanedMessages),
      tokenCount: totalTokens,
      usedApps: composioTrigger ? [composioTrigger.appName] : [],
      usedSkills: [],
      files: [],
      chatId: chatId,
    },
  ]

  const blueprint = {
    version: 2,
    source: "chat-agent",
    sourceChatId: chat.id,
    sourceMessageId: parsed.data.sourceMessageId ?? null,
    createdAt: new Date().toISOString(),
    steps,
  }

  const { data: automation, error: automationError } = await supabase
    .from("automation")
    .insert({
      workspace_id: chat.workspace_id,
      created_by: user.id,
      name: agentName,
      description: buildNodeDescription(cleanedMessages),
      script_key: JSON.stringify(blueprint),
      status: "draft",
    })
    .select()
    .single()

  if (automationError || !automation) return Errors.internal()

  await supabase.from("chats_automation").insert({
    chat_id: chat.id,
    automation_id: automation.id,
  })

  return ok({ automation }, 201)
}
