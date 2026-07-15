# About Atmet

> This document is the source of truth for Atmet's product vision and architecture.
> It is written for two audiences: (1) the team building Atmet, and (2) any AI agent
> asked to work on this codebase. If you are an AI agent: read this whole file before
> designing or implementing anything in Atmet.

---

## 1. The Vision

Atmet is an **agent builder for real business workflows**.

A user should be able to press **Create Agent**, describe the work they want done in
plain language, connect the needed apps, review the plan Atmet creates, and deploy an
agent that can run the workflow from A-Z without the user sitting in a playground.

The product should not feel like:

> "Chat with an LLM that can call a few tools."

It should feel like:

> "Create a capable worker, give it access to the right apps, teach it the workflow,
> test it, then let it run safely in the background."

Atmet's job is to own the structure around the model: planning, tool selection,
app connections, permissions, memory, approvals, triggers, execution, retries, logs,
and monitoring.

The core product promise:

> **Atmet turns a user's messy workflow description into a deployable AI agent.**

---

## 2. What Atmet Is Not

Atmet is not only a chatbot.

Atmet is not only a Composio wrapper.

Atmet is not only a workflow builder with hardcoded templates.

Atmet is not one global AI agent shared by every customer.

The mistake to avoid is building a nice chat UI where the user can talk to a model,
connect tools, and manually ask it to take actions. That is useful, but it still makes
the user operate the workflow. The real product is an agent system that can understand,
prepare, execute, and monitor work.

---

## 3. The Core Architecture

Atmet should be built as one shared **agent engine** that creates many isolated
**agent instances**.

```text
Atmet platform
  -> shared agent engine
      -> workspace A
          -> sales follow-up agent
          -> invoice processing agent
      -> workspace B
          -> support triage agent
          -> onboarding agent
```

There is one backend/runtime system, but there is not one agent for all users.
Each workspace can create many agents. Each agent belongs to one workspace and has
its own instructions, tools, app connections, memory, approval rules, triggers, runs,
and logs.

The minimum rule:

```text
One workspace has many agents.
One agent belongs to one workspace.
One run belongs to one agent.
```

Later, Atmet can support personal agents, shared workspace agents, template agents,
and specialist sub-agents. But the tenancy model must stay isolated from the start.

---

## 4. The Four Layers

Atmet needs four product/runtime layers:

### 4.1 Agent Builder

The Agent Builder is the design-time LLM experience. It talks with the user and
understands the task.

Its job is to convert natural language into a structured agent blueprint:

```json
{
  "goal": "Track new customer invoices and update the CRM",
  "trigger": "Every weekday at 9 AM",
  "required_apps": ["Gmail", "HubSpot", "Slack"],
  "steps": [
    "Search Gmail for invoice emails",
    "Extract invoice amount and customer name",
    "Find the matching HubSpot company",
    "Update the deal record",
    "Send a Slack summary"
  ],
  "approval_required_for": ["sending external emails", "deleting records"],
  "failure_handling": "Ask the user when customer match confidence is below 80%"
}
```

The builder should ask for missing information through small typed UI panels, not long
free-text back-and-forth. Examples: app connection panels, file pickers, Slack channel
pickers, schedule pickers, approval previews, and credential inputs.

### 4.2 Agent Compiler

The Agent Compiler turns the builder's plan into an executable agent configuration.
This layer should be **LLM plus deterministic backend code**.

The compiler:

- selects the needed integrations and tools;
- checks which apps are connected;
- maps plan steps to real tool calls;
- creates the agent instructions;
- creates memory and context rules;
- creates approval gates;
- creates failure and retry behavior;
- validates the workflow before deployment;
- stores the agent configuration.

This layer is what makes Atmet feel like an agent builder instead of a prompt box.

### 4.3 Agent Runtime

The Agent Runtime is the worker that executes deployed agents.

The runtime uses a model, tools, state, memory, permissions, and the saved plan. It can
run manually, on a schedule, from a webhook, or from another event.

An agent is not just a model. In Atmet, an agent is:

```text
model + instructions + tools + plan + memory + permissions + runtime loop + state + logs
```

For implementation, Atmet can use OpenAI's Responses API or Agents SDK for the model
and tool-calling layer, while Composio remains the app integration layer. Atmet itself
must provide the product/runtime layer: tenancy, configuration, scheduling, approvals,
execution history, and monitoring.

### 4.4 Agent Monitor

The Agent Monitor shows users what their agents are doing.

Users need to see:

- what ran;
- what tools were called;
- what succeeded;
- what failed;
- what needs approval;
- what the agent is waiting for;
- what changed in connected apps;
- how much work the agent has handled.

Without monitoring, background agents become scary. With monitoring, they become
trustworthy.

---

## 5. Design-Time vs Run-Time

Atmet must keep these two phases separate.

```text
User describes work
  -> Agent Builder understands the task
  -> Agent Compiler creates an executable agent
  -> User reviews and approves
  -> Agent Runtime executes
  -> Agent Monitor shows results
```

The builder is allowed to reason broadly, ask questions, and revise the plan.
The runtime should be more constrained. It should execute the approved agent plan,
call allowed tools, respect approval gates, and log every step.

Some workflows can be mostly deterministic after deployment. Others may need an LLM
inside the runtime for classification, extraction, drafting, reasoning, or choosing
the next tool. That is fine. The key is that the runtime operates inside the approved
agent configuration, not as an unrestricted chat session.

---

## 6. Composio, Tools, and Integrations

Composio is the integration layer. It is not the whole agent product.

Atmet should use Composio to connect user apps and expose actions/tools, but Atmet
must decide:

- which tools each agent is allowed to use;
- which workspace/user connection the tool call uses;
- whether a tool call needs approval;
- how tool calls are logged;
- how failures are retried;
- how tool access is revoked;
- how connected apps map to the agent's workflow.

The long-term rule:

> Integrations provide capability. Atmet provides agency.

Atmet can also support **skills/templates**. A skill is a reusable workflow pattern or
agent blueprint, not a hard boundary. Users should be able to start from a skill, then
talk to Atmet to modify it for their real process.

---

## 7. Workspace and Agent Isolation

Atmet must never mix tools, memory, runs, or credentials across workspaces.

Every agent should carry these identifiers:

```text
workspace_id
agent_id
created_by_user_id
```

Every tool call should be checked against:

```text
agent_id
workspace_id
allowed_tool_ids
connection_id
approval_policy
```

Every memory entry, run, step, approval, trigger, and log should be scoped to an agent
and workspace.

This makes the platform safer and easier to reason about. It also gives Atmet a clear
product model: users are not using "the Atmet agent"; they are building **their own
agents inside their workspace**.

---

## 8. Minimum Data Model

The exact schema can evolve, but the product needs these concepts:

```text
workspaces
  id, name, created_at

users
  id, email, name, created_at

workspace_members
  workspace_id, user_id, role

connections
  id, workspace_id, user_id, provider, auth_type, encrypted_credentials,
  scopes, status, expires_at, created_at

agent_templates
  id, name, description, category, blueprint_json, created_at

agents
  id, workspace_id, created_by_user_id, template_id, name, description,
  status, instructions, blueprint_json, runtime_config_json, created_at

agent_tools
  id, agent_id, provider, tool_name, connection_id, permissions_json

agent_triggers
  id, agent_id, type, schedule_or_event_json, status, cursor, created_at

agent_memory
  id, agent_id, scope, key, value_json, created_at, updated_at

agent_runs
  id, agent_id, trigger_id, status, started_at, finished_at, error

agent_run_steps
  id, run_id, step_index, step_name, tool_called, input_json, output_json,
  status, duration_ms, created_at

agent_approvals
  id, agent_id, run_id, action_json, status, requested_at, resolved_at,
  resolved_by_user_id
```

Security rules:

- Tokens and API keys are encrypted at rest.
- Credentials are never sent to the frontend.
- Credentials are never logged.
- Tool calls are scoped to workspace, agent, and connection.
- Outward-facing or destructive actions require clear approval policies.
- Run logs should be useful, but must redact secrets and sensitive payloads.

---

## 9. Product Flow

The main Atmet experience should follow this flow:

```text
Create Agent
  -> describe the work
  -> Atmet drafts a plan
  -> connect required apps
  -> configure missing choices
  -> test/simulate the agent
  -> approve permissions
  -> deploy
  -> monitor runs
```

The playground can exist for testing and advanced users, but it should not be the main
mental model. The main product is agent creation and deployment.

The first screen after creating an agent should not be an empty chat only. It should
feel like an agent workspace: goal, plan, connected apps, permissions, test run,
deployment status, and activity.

---

## 10. Alpha Direction

The alpha should prove that Atmet can create and run real agents, not just show mock
integrations.

Recommended alpha sequence:

1. Backend skeleton: database, auth boundaries, encrypted credential storage.
2. Workspace-scoped connections through Composio.
3. Agent data model: agents, tools, triggers, runs, run steps, approvals.
4. Agent Builder: chat-to-blueprint using structured output.
5. Agent Compiler: validate blueprint and map steps to available tools.
6. Agent Runtime: execute runs with tool calls, state, retries, and logs.
7. Agent Monitor: show run history, step details, failures, and approvals.
8. Templates/skills: reusable starting points for common workflows.

The first demo should be narrow but real:

> "Create an agent that watches for a business event in one connected app, reasons
> about it, updates another app, and reports the result."

The exact apps can change, but the demo must include: app connection, generated plan,
approval, real tool execution, run logs, and monitoring.

---

## 11. Rules for Any AI Agent Working on Atmet

1. Treat Atmet as an agent builder, not a generic chatbot.
2. Keep workspace and agent isolation central in every feature.
3. Do not create one global agent that serves all users.
4. Do not make Composio the product; Composio is the integration layer.
5. Every deployed agent needs tools, permissions, state, runs, logs, and approvals.
6. Builder-time reasoning and run-time execution are separate layers.
7. User-facing setup should use structured UI panels where possible.
8. The frontend must not hold raw credentials or execute triggers.
9. Logs must explain what happened without exposing secrets.
10. Follow the repo conventions in `Rules.md`.
