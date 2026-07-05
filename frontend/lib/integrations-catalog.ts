// Static catalog of all supported integrations.
// Connection state (connected, status, credentials) lives in the DB — not here.

export type IntegrationCategory =
  | "communication"
  | "productivity"
  | "crm"
  | "developer"
  | "social"
  | "generic"

export interface IntegrationPermission {
  name: string
  description: string
}

export interface IntegrationTrigger {
  id: string
  name: string
  description: string
}

export interface IntegrationAction {
  id: string
  name: string
  description: string
  inputFields: string[]
}

export interface CatalogIntegration {
  slug: string
  name: string
  logo: string
  description: string
  category: IntegrationCategory
  authType: "oauth" | "apikey"
  apiKeyUrl?: string
  setupInstructions: string[]
  scopes: IntegrationPermission[]
  triggers: IntegrationTrigger[]
  actions: IntegrationAction[]
}

export const INTEGRATIONS_CATALOG: CatalogIntegration[] = [
  {
    slug: "gmail",
    name: "Gmail",
    logo: "https://cdn.simpleicons.org/gmail",
    description: "Send and organize email activity directly from workflows.",
    category: "communication",
    authType: "oauth",
    setupInstructions: [
      "Click Connect Gmail.",
      "Sign in to your Google account and review the requested scopes.",
      "Approve access and return to Atmet to finish setup.",
    ],
    scopes: [
      { name: "gmail.modify", description: "Read, send, label, archive, and move Gmail messages to trash when workflows run." },
      { name: "userinfo.email", description: "Identify which mailbox should be linked to this workspace." },
    ],
    triggers: [
      { id: "gmail-new-email", name: "New email received", description: "Starts a workflow when a new email arrives in the inbox." },
      { id: "gmail-labeled-email", name: "Email labeled", description: "Runs when a chosen Gmail label is applied to a message." },
    ],
    actions: [
      { id: "gmail-send-email", name: "Send email", description: "Send a message from the connected Gmail account.", inputFields: ["to", "subject", "body"] },
      { id: "gmail-add-label", name: "Add label", description: "Attach one or more labels to an existing email.", inputFields: ["messageId", "label"] },
    ],
  },
  {
    slug: "slack",
    name: "Slack",
    logo: "https://cdn.simpleicons.org/slack",
    description: "Post updates and listen for channel activity in real time.",
    category: "communication",
    authType: "oauth",
    setupInstructions: [
      "Click Connect Slack.",
      "Choose the Slack workspace and review permissions.",
      "Approve the app and return to Atmet.",
    ],
    scopes: [
      { name: "channels:history", description: "Read channel history to trigger workflows from new content." },
      { name: "chat:write", description: "Send messages to selected channels from workflow actions." },
      { name: "users:read", description: "Resolve members and mentions when posting updates." },
    ],
    triggers: [
      { id: "slack-new-message", name: "New channel message", description: "Starts when a new message is posted in a selected channel." },
      { id: "slack-new-reaction", name: "Reaction added", description: "Starts when a reaction is added to a message." },
    ],
    actions: [
      { id: "slack-send-message", name: "Send channel message", description: "Post a message to a channel or thread.", inputFields: ["channel", "text"] },
      { id: "slack-open-dm", name: "Send direct message", description: "Send a direct message to a workspace member.", inputFields: ["userId", "text"] },
    ],
  },
  {
    slug: "telegram",
    name: "Telegram",
    logo: "https://cdn.simpleicons.org/telegram",
    description: "Send alerts, workflow updates, and agent replies through a Telegram bot.",
    category: "communication",
    authType: "apikey",
    apiKeyUrl: "https://t.me/BotFather",
    setupInstructions: [
      "Open BotFather in Telegram and create a bot.",
      "Copy the bot token BotFather gives you.",
      "Paste the token into Atmet, test the connection, and save it.",
    ],
    scopes: [
      { name: "bot token", description: "Send messages and receive updates for chats that interact with the bot." },
      { name: "chat access", description: "Telegram only sends updates after a user starts the bot or the bot is added to a chat." },
    ],
    triggers: [
      { id: "telegram-new-message", name: "New bot message", description: "Starts when the connected bot receives a message." },
      { id: "telegram-command", name: "Command received", description: "Starts when someone sends a slash command to the bot." },
    ],
    actions: [
      { id: "telegram-send-message", name: "Send message", description: "Send a text message to a Telegram chat.", inputFields: ["chatId", "text"] },
      { id: "telegram-send-image", name: "Send image", description: "Send a generated image to a Telegram chat.", inputFields: ["chatId", "imageUrl", "caption"] },
    ],
  },
  {
    slug: "notion",
    name: "Notion",
    logo: "https://cdn.simpleicons.org/notion",
    description: "Create and update pages, tasks, and databases automatically.",
    category: "productivity",
    authType: "oauth",
    setupInstructions: [
      "Click Connect Notion.",
      "Select which workspace pages and databases Atmet can access.",
      "Authorize and return to Atmet to continue.",
    ],
    scopes: [
      { name: "read:content", description: "Read page and database content to power triggers." },
      { name: "update:content", description: "Create or edit pages from workflow actions." },
    ],
    triggers: [
      { id: "notion-new-page", name: "New page created", description: "Starts when a new page appears in a selected database." },
    ],
    actions: [
      { id: "notion-create-page", name: "Create page", description: "Create a page with mapped properties in a database.", inputFields: ["databaseId", "title", "properties"] },
      { id: "notion-update-page", name: "Update page", description: "Update properties or content of an existing page.", inputFields: ["pageId", "properties"] },
    ],
  },
  {
    slug: "hubspot",
    name: "HubSpot",
    logo: "https://cdn.simpleicons.org/hubspot",
    description: "Sync contacts and deal activity with your CRM workflows.",
    category: "crm",
    authType: "apikey",
    apiKeyUrl: "https://app.hubspot.com/",
    setupInstructions: [
      "Open your HubSpot account settings and create a private app token.",
      "Copy the token and paste it into Atmet.",
      "Test the connection and then save to activate the integration.",
    ],
    scopes: [
      { name: "crm.objects.contacts.read", description: "Read contact records for trigger and lookup steps." },
      { name: "crm.objects.deals.write", description: "Create and update deals from workflow actions." },
    ],
    triggers: [
      { id: "hubspot-new-contact", name: "New contact", description: "Starts when a contact is created in HubSpot." },
      { id: "hubspot-deal-stage-change", name: "Deal stage changed", description: "Starts when a deal moves to a new stage." },
    ],
    actions: [
      { id: "hubspot-create-contact", name: "Create contact", description: "Create a new contact in your CRM.", inputFields: ["email", "firstName", "lastName"] },
      { id: "hubspot-create-note", name: "Create note", description: "Attach a note to an existing CRM record.", inputFields: ["objectId", "note"] },
    ],
  },
  {
    slug: "github",
    name: "GitHub",
    logo: "https://cdn.simpleicons.org/github",
    description: "Track pull requests and automate repository operations.",
    category: "developer",
    authType: "oauth",
    setupInstructions: [
      "Click Connect GitHub.",
      "Authorize Atmet for the organizations and repositories you want.",
      "Approve access to complete setup.",
    ],
    scopes: [
      { name: "repo", description: "Read repository data and create pull-request comments." },
      { name: "read:org", description: "List organization repositories and team metadata." },
    ],
    triggers: [
      { id: "github-pr-opened", name: "Pull request opened", description: "Starts when a pull request is opened." },
      { id: "github-issue-opened", name: "Issue opened", description: "Starts when a new issue is created." },
    ],
    actions: [
      { id: "github-create-issue", name: "Create issue", description: "Create a GitHub issue from workflow results.", inputFields: ["repository", "title", "body"] },
      { id: "github-comment-pr", name: "Comment on pull request", description: "Post a structured review or update comment.", inputFields: ["repository", "pullNumber", "comment"] },
    ],
  },
  {
    slug: "jira",
    name: "Jira",
    logo: "https://cdn.simpleicons.org/jira",
    description: "Sync issue activity and sprint milestones into workflows.",
    category: "developer",
    authType: "oauth",
    setupInstructions: [
      "Click Connect Jira.",
      "Sign in to Atlassian and choose the Jira site to authorize.",
      "Approve access and return to Atmet to finish setup.",
    ],
    scopes: [
      { name: "read:jira-work", description: "Read issue and sprint updates for workflow triggers." },
      { name: "write:jira-work", description: "Create and update Jira issues from actions." },
    ],
    triggers: [
      { id: "jira-issue-created", name: "Issue created", description: "Starts when a new issue is created." },
      { id: "jira-issue-transitioned", name: "Issue transitioned", description: "Starts when an issue moves to a new status." },
    ],
    actions: [
      { id: "jira-create-issue", name: "Create issue", description: "Create a Jira issue in a selected project.", inputFields: ["projectKey", "summary", "description"] },
      { id: "jira-add-comment", name: "Add comment", description: "Post a comment on an existing issue.", inputFields: ["issueKey", "comment"] },
    ],
  },
  {
    slug: "asana",
    name: "Asana",
    logo: "https://cdn.simpleicons.org/asana",
    description: "Track tasks and project updates across teams.",
    category: "productivity",
    authType: "oauth",
    setupInstructions: [
      "Click Connect Asana.",
      "Choose your Asana workspace and review requested permissions.",
      "Approve access and return to Atmet.",
    ],
    scopes: [
      { name: "tasks:read", description: "Read tasks and project activity for triggers." },
      { name: "tasks:write", description: "Create and update tasks from workflow actions." },
    ],
    triggers: [
      { id: "asana-task-created", name: "Task created", description: "Starts when a new task is created in a project." },
      { id: "asana-task-completed", name: "Task completed", description: "Starts when a task is marked complete." },
    ],
    actions: [
      { id: "asana-create-task", name: "Create task", description: "Create a new task in Asana.", inputFields: ["projectId", "name", "notes"] },
      { id: "asana-update-task", name: "Update task", description: "Update an existing task's details.", inputFields: ["taskId", "name", "notes"] },
    ],
  },
  {
    slug: "salesforce",
    name: "Salesforce",
    logo: "https://cdn.simpleicons.org/salesforce",
    description: "Automate lead, account, and opportunity operations.",
    category: "crm",
    authType: "apikey",
    apiKeyUrl: "https://login.salesforce.com/",
    setupInstructions: [
      "Open Salesforce setup and create an API-enabled integration user key.",
      "Copy the API key and paste it into Atmet.",
      "Test and save to activate Salesforce.",
    ],
    scopes: [
      { name: "objects.read", description: "Read CRM records for trigger conditions and lookups." },
      { name: "objects.write", description: "Create and update Salesforce records from actions." },
    ],
    triggers: [
      { id: "salesforce-new-lead", name: "New lead", description: "Starts when a new lead is added." },
      { id: "salesforce-opportunity-updated", name: "Opportunity updated", description: "Starts when an opportunity changes stage." },
    ],
    actions: [
      { id: "salesforce-create-lead", name: "Create lead", description: "Create a lead record in Salesforce.", inputFields: ["email", "firstName", "lastName", "company"] },
      { id: "salesforce-update-opportunity", name: "Update opportunity", description: "Update key fields of an opportunity.", inputFields: ["opportunityId", "stage", "amount"] },
    ],
  },
  {
    slug: "discord",
    name: "Discord",
    logo: "https://cdn.simpleicons.org/discord",
    description: "Connect community channels and bot notifications.",
    category: "communication",
    authType: "oauth",
    setupInstructions: [
      "Click Connect Discord.",
      "Select the server where Atmet can post updates.",
      "Authorize access and return to Atmet.",
    ],
    scopes: [
      { name: "guilds", description: "Read available servers and channel metadata." },
      { name: "messages.write", description: "Post channel messages from workflow actions." },
    ],
    triggers: [
      { id: "discord-message-posted", name: "Message posted", description: "Starts when a new message is posted in a channel." },
      { id: "discord-member-joined", name: "Member joined", description: "Starts when a member joins a selected server." },
    ],
    actions: [
      { id: "discord-send-message", name: "Send message", description: "Send a message to a selected channel.", inputFields: ["channelId", "message"] },
      { id: "discord-create-thread", name: "Create thread", description: "Create a thread from a channel message.", inputFields: ["channelId", "name", "message"] },
    ],
  },
  {
    slug: "x",
    name: "X",
    logo: "https://cdn.simpleicons.org/x",
    description: "Publish posts and react to social engagement signals.",
    category: "social",
    authType: "apikey",
    apiKeyUrl: "https://developer.x.com/",
    setupInstructions: [
      "Open the X developer portal and create an app.",
      "Generate an API key and secret for your environment.",
      "Paste the key in Atmet and test before saving.",
    ],
    scopes: [
      { name: "tweet.read", description: "Read post events that can trigger workflows." },
      { name: "tweet.write", description: "Publish posts from workflow actions." },
    ],
    triggers: [
      { id: "x-mention", name: "New mention", description: "Starts when your account is mentioned in a post." },
    ],
    actions: [
      { id: "x-create-post", name: "Create post", description: "Publish a post from a workflow.", inputFields: ["text"] },
      { id: "x-reply", name: "Reply to post", description: "Reply to an existing post thread.", inputFields: ["postId", "text"] },
    ],
  },
]

export function getCatalogIntegration(slug: string): CatalogIntegration | null {
  return INTEGRATIONS_CATALOG.find((i) => i.slug === slug) ?? null
}
