import { type NextRequest } from "next/server"
import { z } from "zod"

import { getUser } from "@/lib/api/auth"
import { Errors, ok } from "@/lib/api/response"
import { getOpenAIClient } from "@/lib/openai"

const workflowPlannerNodeSchema = z.object({
  type: z.enum(["trigger", "action"]),
  name: z.string().min(1).max(80),
  app: z.string().min(1).max(80),
  provider: z.string().min(1).max(80).optional(),
  prompt: z.string().min(1).max(600),
  runtimeMs: z.number().int().positive().max(900000).default(30000),
  triggerSlug: z.string().max(160).nullable().optional(),
  actions: z
    .array(
      z.object({
        name: z.string().min(1).max(80),
        prompt: z.string().min(1).max(500),
        runtimeMs: z.number().int().positive().max(900000).default(30000),
      })
    )
    .min(1)
    .max(2),
})

const workflowPlannerResponseSchema = z.object({
  shouldBuildWorkflow: z.boolean(),
  reply: z.string().min(1).max(700),
  nodes: z.array(workflowPlannerNodeSchema).max(8).default([]),
})

const workflowPlannerRequestSchema = z.object({
  request: z.string().min(1).max(6000),
  projectId: z.string().max(160).optional(),
  activeNode: z
    .object({
      name: z.string().max(120).optional(),
      type: z.string().max(40).optional(),
      app: z.string().max(80).optional(),
      prompt: z.string().max(1000).optional(),
    })
    .optional(),
  currentNodes: z
    .array(
      z.object({
        name: z.string().max(120),
        type: z.string().max(40),
        app: z.string().max(80),
        prompt: z.string().max(1000).optional(),
      })
    )
    .max(20)
    .optional(),
})

function fallbackPlan(request: string) {
  const wantsWorkflow =
    /\b(agent|workflow|automation|automate|build|create|when|whenever|trigger|watch|send|sync|route)\b/i.test(
      request
    )
  if (!wantsWorkflow) {
    return {
      shouldBuildWorkflow: false,
      reply: "I can help with that in chat.",
      nodes: [],
    }
  }

  const lower = request.toLowerCase()
  const nodes = []
  if (/\b(gmail|email|mailbox|inbox)\b/i.test(request)) {
    nodes.push({
      type: "trigger" as const,
      name: "Watch Gmail",
      app: "Gmail",
      provider: "Gmail",
      prompt: "Watch for matching Gmail messages and pass the email payload to the next node.",
      runtimeMs: 5000,
      triggerSlug: lower.includes("sent")
        ? "GMAIL_EMAIL_SENT_TRIGGER"
        : "GMAIL_NEW_GMAIL_MESSAGE",
      actions: [
        {
          name: "Detect email event",
          prompt: "Receive the Gmail trigger event and identify whether it matches this workflow.",
          runtimeMs: 5000,
        },
      ],
    })
  }

  if (/\btelegram\b/i.test(request)) {
    nodes.push({
      type: "action" as const,
      name: "Send Telegram message",
      app: "Telegram",
      provider: "Telegram",
      prompt: "Send the relevant workflow result to Telegram.",
      runtimeMs: 30000,
      triggerSlug: null,
      actions: [
        {
          name: "Send message",
          prompt: "Create and send the Telegram message using the previous node output.",
          runtimeMs: 30000,
        },
      ],
    })
  }

  if (/\b(chatgpt|openai|gpt|generate\s+(an?\s+)?image|image|content|caption|draft|write)\b/i.test(request)) {
    nodes.push({
      type: "action" as const,
      name: /\bimage|picture|visual\b/i.test(request)
        ? "Generate image"
        : "Generate content",
      app: "ChatGPT",
      provider: "ChatGPT",
      prompt: /\bimage|picture|visual\b/i.test(request)
        ? "Generate an image using the previous node output as context."
        : "Generate content using the previous node output as context.",
      runtimeMs: /\bimage|picture|visual\b/i.test(request) ? 60000 : 20000,
      triggerSlug: null,
      actions: [
        {
          name: /\bimage|picture|visual\b/i.test(request)
            ? "Generate image from context"
            : "Generate content from context",
          prompt: /\b(email|title|subject)\b/i.test(request)
            ? "Use the latest email title/subject from the Gmail node as the generation prompt context."
            : "Use the previous workflow output as generation context.",
          runtimeMs: /\bimage|picture|visual\b/i.test(request) ? 60000 : 20000,
        },
      ],
    })
  }

  if (/\b(x|twitter|tweet|post|publish)\b/i.test(request)) {
    nodes.push({
      type: "action" as const,
      name: "Post to X",
      app: "X",
      provider: "X",
      prompt: "Publish the generated workflow output to X.",
      runtimeMs: 30000,
      triggerSlug: null,
      actions: [
        {
          name: /\bimage|picture|visual\b/i.test(request)
            ? "Post image"
            : "Create post",
          prompt: /\bimage|picture|visual\b/i.test(request)
            ? "Post the generated image from the previous ChatGPT node to X with a concise caption."
            : "Create an X post from the previous workflow output.",
          runtimeMs: 30000,
        },
      ],
    })
  }

  if (nodes.length === 0) {
    nodes.push({
      type: "action" as const,
      name: "Plan task",
      app: "ChatGPT",
      provider: "ChatGPT",
      prompt: "Reason about the request and prepare the next workflow action.",
      runtimeMs: 15000,
      triggerSlug: null,
      actions: [
        {
          name: "Reason about task",
          prompt: request,
          runtimeMs: 15000,
        },
      ],
    })
  }

  return {
    shouldBuildWorkflow: true,
    reply: `I planned ${nodes.length} workflow node${nodes.length === 1 ? "" : "s"} for this agent.`,
    nodes,
  }
}

export async function POST(request: NextRequest) {
  const auth = await getUser()
  if (!auth.ok) return auth.response

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Errors.badRequest("Invalid JSON body.")
  }

  const parsed = workflowPlannerRequestSchema.safeParse(body)
  if (!parsed.success) {
    return Errors.validationError(parsed.error.issues[0].message)
  }

  try {
    const completion = await getOpenAIClient().chat.completions.create({
      model: process.env.OPENAI_AGENT_MODEL ?? process.env.OPENAI_MODEL ?? "gpt-4o",
      temperature: 0.15,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: [
            "You are Atmet's workflow node planner.",
            "Your job is to convert a user's agent/workflow request into app-grouped playground nodes.",
            "Only set shouldBuildWorkflow=true when the user asks to build, automate, plan, change, or add workflow/agent nodes. For small talk or ordinary questions, return shouldBuildWorkflow=false.",
            "Each node represents exactly one app or skill. Each node is either trigger or action.",
            "Use trigger nodes for phrases like when, whenever, on new, received, watch, monitor, every time.",
            "Use action nodes for work done after the trigger.",
            "Do not create vague filler nodes. Do not create a generic ChatGPT node unless the workflow really needs reasoning, extraction, classification, summarization, or drafting.",
            "Normally create one or two app actions inside each node.",
            "Treat ChatGPT/OpenAI as a normal connected app node when the user wants generated content, image generation, summarization, extraction, classification, or drafting.",
            "Treat X/Twitter as a normal connected app node when the user wants to post, tweet, publish, reply, or share media.",
            "For a request like: whenever Gmail receives an email, generate an image with ChatGPT based on the email title, then post it on X. Output exactly three nodes: Gmail trigger, ChatGPT image-generation action, X post action.",
            "Return JSON only with: shouldBuildWorkflow, reply, nodes.",
            "Node shape: {type:'trigger|action',name,app,provider,prompt,runtimeMs,triggerSlug,actions:[{name,prompt,runtimeMs}]}",
            "Example request: automate emails received in Gmail and send them to Telegram. Output two nodes: Gmail trigger, Telegram action.",
          ].join(" "),
        },
        {
          role: "user",
          content: JSON.stringify({
            request: parsed.data.request,
            activeNode: parsed.data.activeNode ?? null,
            currentNodes: parsed.data.currentNodes ?? [],
          }),
        },
      ],
    })

    const content = completion.choices[0]?.message?.content
    if (!content) return ok({ plan: fallbackPlan(parsed.data.request) })

    const plan = workflowPlannerResponseSchema.safeParse(JSON.parse(content))
    if (!plan.success) {
      return ok({ plan: fallbackPlan(parsed.data.request) })
    }

    return ok({ plan: plan.data })
  } catch (error) {
    console.error("Workflow node planner fallback used", error)
    return ok({ plan: fallbackPlan(parsed.data.request) })
  }
}
