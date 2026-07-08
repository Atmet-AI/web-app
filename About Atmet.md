# About Atmet

> This document is the source of truth for Atmet's vision and architecture.
> It is written for two audiences: (1) the team building Atmet, and (2) any AI agent
> (Claude Code, Cursor, etc.) that is asked to work on this codebase. If you are an AI
> agent: read this whole file before designing or implementing anything in Atmet.

---

## 1. What Atmet Is

Atmet is an **agent-powered automation platform**. A user describes what they want in
plain language ("when someone sends an email address to my Telegram channel, generate
an image and email it to them"), and Atmet's agent plans the workflow, asks the user
for any missing choices through small, minimal UI panels, connects the needed apps, and
then runs the workflow automatically — forever, on triggers, without the user present.

Atmet is **not** a library of pre-built recipes. It is closer to Gumloop
(https://www.gumloop.com) than to a template gallery: the agent should be able to do
**anything the connected app's API allows**, not only the use cases we thought of.

---

## 2. The Core Principle: Capability-First, Not Use-Case-First

**The mistake to avoid** (and the one the current prototype makes): building each
integration as a hand-written list of 2–3 triggers and 2–3 actions chosen for imagined
use cases. Nobody can enumerate every use case of Telegram or Gmail. Whatever list we
write will always be too small.

**The rule instead:** an integration exposes the app's **full API surface** to the
agent, plus a small curated layer on top for UX. Concretely, every integration has
three levels:

1. **Primitive level (full power).** One or two generic tools that can call *any*
   endpoint of the provider's API using the user's stored credentials. Examples:
   - `telegram.call(method, params)` — the Telegram Bot API is uniform
     (`POST https://api.telegram.org/bot<token>/<method>`), so this single tool covers
     *every* Telegram method that exists now or is added later.
   - `google.request(service, method, path, params)` — Google APIs are described by
     machine-readable discovery documents, so one authenticated request tool + the
     discovery doc covers all of Gmail and Drive.
   - `openai.request(path, body)` — covers chat, images, embeddings, everything.
2. **Curated level (good UX).** A short list of the most common actions/triggers with
   friendly names, descriptions, and typed input schemas ("Send email", "New message
   in channel"). These are shortcuts that map onto the primitive level — they exist for
   discoverability and nice UI, not as the boundary of what is possible.
3. **Knowledge level.** Each integration ships a reference document (the provider's
   API method list / scopes / limits) that is given to the agent as context. The agent
   reads the docs and composes primitive calls for anything not covered by the curated
   level. This is how "unlimited use cases" works: **the agent + the docs + a generic
   authenticated call = the whole API**, without us remembering anything.

**Safety guardrail:** primitive-level calls that are destructive or outward-facing
(sending messages, deleting files, spending API credits) require a one-time user
confirmation when the workflow is being designed, shown in plain language ("This
workflow will send emails from your Gmail account — allow?"). Once approved, the
workflow runs unattended.

---

## 3. How Platforms Like Gumloop Do It (the layers, demystified)

The question "is it MCP or API or OAuth?" has a simple answer: **it is all of them, at
different layers.** They are not alternatives; they stack:

| Layer | Technology | What it answers |
|---|---|---|
| **Authorization** | OAuth 2.0 (Gmail/Drive/most SaaS), bot tokens (Telegram), API keys (OpenAI) | "May Atmet act as this user?" Produces tokens we store encrypted and refresh automatically. |
| **Capability** | The provider's REST API | "What can be done at all?" Everything Atmet does to an app is ultimately an HTTPS call to that app's API with the user's token. |
| **Discovery** | Tool catalog / function-calling schemas / MCP | "How does the agent know what it can do?" Each capability is described as a tool with a JSON schema. MCP (Model Context Protocol) is a standard way to package such tool catalogs so any agent can consume them — useful, but optional; an internal tool catalog works the same way. |
| **Intelligence** | An LLM with tool-use (the Atmet agent) | "Which tools, in what order, with what parameters?" The agent plans the workflow from the user's natural-language request. |
| **Interaction** | Generative UI (see §4) | "How does the agent ask the user for choices?" Not with plain text questions — with small typed UI panels. |
| **Time** | Triggers: webhooks + polling (see §5) | "How does a workflow start by itself?" |

So: **OAuth is how the user connects an app. The API is what the app can do. Tools/MCP
are how the agent sees it. The LLM decides. Generative UI collects input. Webhooks
wake it up.** Gumloop's magic is just these six layers done well.

### The two halves: builder agent vs. run-time engine (the most important separation)
"An agent that builds agent workflows" is **two separate systems**, and mixing them
up is the most common design mistake:

1. **The builder agent (design time).** An LLM loop that talks to the user and
   *produces an artifact*: a workflow definition (a JSON step graph stored in
   `workflows.definition`). Its tools are **platform meta-tools**, not only
   integration tools:
   - `list_connections()` and `get_tool_catalog(provider)` — see what the user has
     connected and what each app can do (§2's three levels);
   - `request_user_input(type, purpose)` — emits a generative-UI request (§4);
   - `draft_workflow(definition)` / `update_workflow(id, changes)`;
   - `test_step(step, sample_input)` — execute one step for real, right now, and
     show the user the result (this "try it live while building" feel is a large
     part of what makes Gumloop feel magical);
   - `activate_workflow(id)` — only after the plain-language approval (§2).
2. **The run-time engine (execution).** Executes the *saved definition*
   deterministically on every trigger event — **no LLM re-planning on each run**.
   LLM calls happen only where the definition itself contains an AI step ("extract
   the email address", "generate the image"). This keeps runs cheap, fast,
   predictable, and debuggable in `run_steps`.

In one sentence: **the builder agent compiles the user's intent into a workflow;
the engine runs that workflow forever.** Never make the builder agent the thing
that runs on every trigger.

---

## 4. Generative UI (the "it opened a picker for my Drive files" experience)

When the agent needs input from the user, it must not ask in free text. It emits a
**structured input request**, and the frontend renders the matching component. This is
what makes Gumloop feel magical and it is straightforward to build:

1. Agent decides it needs a value, e.g. `{ "need": "drive_file", "purpose": "the sheet to email" }`.
2. The frontend has a registry of input components keyed by type:
   - `drive_file` → a file picker that calls our backend (`GET /api/tools/drive/list-files`),
     which uses the user's stored Google token to list real files.
   - `contact` / `email_address` → contact picker or validated email field.
   - `telegram_chat` → list of chats/channels the user's bot can see.
   - `text`, `select`, `secret` (for API keys), `schedule` (cron picker), `preview`
     (e.g. rendered draft email with an Approve button).
3. The user picks; the value flows back into the agent's plan; the agent continues.

**Design rule:** these panels are minimal and use Atmet's own design system (shadcn/ui
components already in `frontend/`). They are Atmet UI showing the app's *data* — never
an embed of the app's own UI.

Every curated action/trigger declares its inputs with one of these types, so UI
generation is automatic. For primitive-level calls, the agent maps API parameters onto
the same input types.

---

## 5. Triggers, Webhooks, and Polling (currently missing — must be built)

A **trigger** is a stored subscription: *"for user U, on connection C, when event E
matching filter F happens, start workflow W."* Triggers live in the **backend
database** and are evaluated by the backend — never in the frontend. Today Atmet has
no backend at all (`backend/` is empty), so nothing real can trigger; this is the top
priority for alpha.

There are three ways an event reaches us:

### Webhooks (push — preferred where the provider supports it)
A webhook is a URL **we host** that the external app calls when something happens.
Flow: we expose `POST /api/webhooks/{provider}/{webhook_id}`, register that URL with
the provider, and the provider POSTs us events in real time.
- **Gmail:** `users.watch` + Google Cloud Pub/Sub push → we get a ping when the
  mailbox changes, then fetch details with `history.list`.
- **Drive:** `files.watch` / `changes.watch` channels (must be renewed periodically).
- **Telegram bots** (only when a workflow uses a bot): `setWebhook` → Telegram POSTs
  updates to us. Verify with the secret token header.

### Persistent connections (Telegram personal account)
The Telegram User API (MTProto) doesn't use webhooks: a worker keeps an
authenticated connection open per connected account and receives updates the moment
they happen — exactly like the Telegram app on your phone. Downstream flow is the
same as a webhook: store event → match triggers → enqueue run.

### Polling (pull — fallback)
A scheduled job (every 1–5 min) asks the API "anything new since cursor X?", using
stored cursors (Telegram `update_id` offset, Gmail `historyId`, Drive page token) and
deduplication. Use polling when a webhook is impractical; use it also as a safety net.

**Local development note:** providers can only call public URLs, so use a tunnel
(ngrok / cloudflared) to receive webhooks on localhost.

### What happens after an event arrives
```
provider → webhook endpoint → verify signature → store raw event →
match against triggers table (filters, e.g. regex "contains an email address") →
enqueue a run → worker executes the workflow steps → log every step in run history
```
The webhook endpoint must respond fast (store + enqueue, nothing else) and execution
must happen in a background worker with retries.

---

## 6. Backend Data Model (minimum for alpha)

```
users            id, email, ...
connections      id, user_id, provider, auth_type (oauth|apikey|bot_token),
                 encrypted_credentials, scopes, status, expires_at, created_at
integrations     (static catalog, can live in code) provider, auth config,
                 curated tools, trigger types, docs reference
workflows        id, user_id, name, description, definition (JSON graph of steps),
                 status (draft|active|paused), created_at
triggers         id, workflow_id, connection_id, provider, event_type,
                 filter (JSON, e.g. {"regex": "email"}), delivery (webhook|polling),
                 external_ref (e.g. Telegram webhook id / Gmail watch id), cursor
runs             id, workflow_id, trigger_event_id, status
                 (queued|running|succeeded|failed), started_at, finished_at, error
run_steps        id, run_id, step_name, tool_called, input, output, status, duration
webhook_events   id, provider, webhook_id, headers, payload, received_at, processed
```

**Security rules (non-negotiable):**
- All tokens/keys encrypted at rest; never sent to the frontend; never logged.
- OAuth refresh handled server-side and automatically.
- Webhook endpoints verify provider signatures/secret tokens.
- BYOK ("bring your own key", e.g. the user's own OpenAI key) is stored exactly like
  any other connection credential and used only for that user's runs.

---

## 7. Alpha Scope — Exactly Four Integrations

No other apps in alpha. Depth over breadth.

| Integration | Auth | Trigger transport | Primitive tool | Notes |
|---|---|---|---|---|
| **Telegram** | Personal account: phone login (User API / MTProto) | MTProto live updates over a persistent connection | `telegram.user_call(method, params)` | The integration IS the user's own account. Bots are not the integration — see below. |
| **Gmail** | OAuth 2.0 (Google) | `users.watch` + Pub/Sub, or polling `history.list` | `google.request(...)` | Scopes: `gmail.send`, `gmail.readonly` (add `gmail.modify` only if needed). |
| **Google Drive** | OAuth 2.0 (same Google connection) | `changes.watch` or polling | `google.request(...)` | File picker UI = `files.list` with the user's token. |
| **ChatGPT (OpenAI)** | API key — **BYOK, the user's own key** | none (it's an action-only integration) | `openai.request(path, body)` | Curated actions: generate text, generate image. The user's key pays for usage. |

### The Telegram integration = the user's personal account
Connecting Telegram to Atmet means connecting the **user's own account** via the
Telegram User API (MTProto). Login flow: the user enters their phone number in
Atmet → Telegram sends a login code inside the Telegram app → the user enters the
code (plus 2FA password if set) → the backend stores an **encrypted session** that
sees everything the user sees (private DMs, groups, channels) and can act as the
user. Implemented with GramJS (Node) or Telethon (Python), using Atmet's
`api_id`/`api_hash` from https://my.telegram.org. Events arrive over a **persistent
MTProto connection** held by a worker (not a webhook). This is the most sensitive
credential in the whole system: full account access — encrypted at rest, never sent
to the frontend, never logged, respectful of Telegram rate limits (aggressive
automation can get accounts flagged).

**What about Telegram bots?** A bot is **not an Atmet integration feature** — anyone
can ask any LLM how to make a bot. If a workflow happens to need one (e.g. a public
chatbot that strangers talk to), Atmet simply *helps the user set it up*: the agent
shows a generative-UI panel with the BotFather steps and a token field, stores the
token like any other credential, and calls the Bot API for that workflow. That is
assistance inside a workflow, not the integration. The connected identity of the
Telegram integration is always the user's personal account.

Note: "ChatGPT" here means the OpenAI API as a *step inside workflows* — it is a
different thing from the LLM that powers the Atmet agent itself (which is Atmet's
own infrastructure choice, e.g. the Anthropic API).

---

## 8. The Flagship Use Case (must work end-to-end in alpha)

> "I want auto-generated images sent by email to anyone who sends their email address
> in my Telegram channel, using my own ChatGPT API key."

1. **User asks Atmet in chat.** The agent recognizes it needs: Telegram (trigger),
   OpenAI (image generation, BYOK), Gmail (send).
2. **Connections check.** For each missing connection, generative UI panels appear:
   Telegram connect panel (phone-number login → code arrives inside Telegram) →
   Google OAuth button → OpenAI key field (`secret` input).
3. **Trigger setup.** Agent asks (via a `telegram_chat` picker) what to watch —
   personal DMs and/or one of the user's channels — the MTProto listener subscribes
   and a `triggers` row is written with filter `{ "match": "email_address" }`
   (regex for an email inside message text).
4. **Workflow definition** saved as a step graph:
   `trigger(telegram message) → extract email (regex/LLM) → openai.images.generate
   (user's key) → gmail.send (attachment: the image, to: extracted email)`.
5. **Confirmation.** One plain-language approval: "This will send emails from
   you@gmail.com and use your OpenAI key. Activate?" → workflow status `active`.
6. **Runtime.** Someone posts "my email is sara@example.com" in the channel →
   Telegram POSTs our webhook → filter matches → run enqueued → worker executes the
   three steps → `run_steps` records each call → user sees the run in the dashboard.

If any part of this flow cannot work in the current design, the design is wrong.

---

## 9. Current State of the Repository (July 2026)

- `frontend/` — Next.js + shadcn/ui. Pages exist for dashboard, integrations, apps,
  workflow, skills, ai-core, auth. **All data is mock:**
  - `frontend/lib/integrations-store.ts` — in-memory, hardcoded integrations with
    fixed trigger/action lists (the exact use-case-first pattern §2 forbids), fake
    OAuth and fake API-key testing. Also lists apps outside alpha scope (Slack,
    Notion, HubSpot, GitHub, Jira, Asana, Salesforce, Discord, X) — these should be
    removed or hidden for alpha and replaced by the four alpha integrations
    (Telegram is currently missing entirely).
  - `frontend/lib/workflow-projects.ts` — decorative mock workflow data.
- `backend/` — **empty.** No API, no database, no webhook receiver, no worker, no
  agent runtime. Everything in §5–§6 is to be built.
- The frontend prototype is valuable as the design system and page structure; the
  real product logic must move behind a backend API.

## 10. Build Order for Alpha

1. **Backend skeleton** — API service + Postgres with the §6 schema + encrypted
   credential storage.
2. **Connections for the four providers** — real OAuth (Google), token/key entry
   (Telegram, OpenAI); replace the frontend mock store with API calls.
3. **Event ingestion + worker queue** — Telegram first: the MTProto update listener
   (persistent connection per connected account), then Gmail watch/polling. A bot
   webhook receiver is only needed once a bot-based workflow exists.
4. **Workflow engine** — execute a stored step graph with retries and run logging.
5. **Agent layer** — LLM with the tool catalog (§2's three levels) that plans
   workflows from chat and emits generative-UI input requests (§4).
6. **Generative UI registry** in the frontend — the typed input components.
7. **Ship the flagship use case (§8)** end-to-end, demoable.

Explicit non-goals for alpha: more than four integrations, team features, a
marketplace, mobile.

## 11. Rules for Any AI Agent Working on Atmet

1. **Never hardcode a use case as the boundary of an integration.** Curated actions
   are shortcuts, not walls; the primitive tool must always exist (§2).
2. **Triggers, credentials, and execution live in the backend.** The frontend never
   holds tokens and never evaluates triggers.
3. **New integration = the blueprint:** auth config + primitive tool + curated
   actions/triggers with typed inputs + provider docs for the agent + webhook or
   polling transport. All five parts, every time.
4. **Every user-facing input goes through the generative UI types** (§4); do not
   invent one-off forms.
5. **Ask-then-act:** destructive/outward actions need one design-time approval in
   plain language; after that, runs are unattended.
6. **Log everything a run does** (`run_steps`) — users must be able to see why a
   workflow did what it did.
7. **Stay inside alpha scope** (§7) unless the user explicitly expands it.
8. Follow the repo conventions in `Rules.md` (branching, commits, env files).
