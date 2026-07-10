// Static catalog of all supported integrations.
// Connection state (connected, status, credentials) lives in the DB — not here.

import {
  GOOGLE_CALENDAR_ACTIONS,
  GOOGLE_CALENDAR_TRIGGERS,
  GOOGLE_DOCS_ACTIONS,
  GOOGLE_DOCS_TRIGGERS,
  GOOGLE_DRIVE_ACTIONS,
  GOOGLE_DRIVE_TRIGGERS,
  GOOGLE_SHEETS_ACTIONS,
  GOOGLE_SHEETS_TRIGGERS,
} from "@/lib/integrations/composio-google-catalog"
import {
  GITHUB_ACTIONS,
  GITHUB_TRIGGERS,
  INSTAGRAM_ACTIONS,
  INSTAGRAM_TRIGGERS,
  TELEGRAM_ACTIONS,
  TELEGRAM_TRIGGERS,
} from "@/lib/integrations/composio-social-dev-catalog"

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
  connectorProvider?: "native" | "composio"
  composioToolkit?: string
  apiKeyUrl?: string
  setupInstructions: string[]
  scopes: IntegrationPermission[]
  triggers: IntegrationTrigger[]
  actions: IntegrationAction[]
}

export const GMAIL_TRIGGERS: IntegrationTrigger[] = [
  {
    id: "GMAIL_NEW_GMAIL_MESSAGE",
    name: "New Gmail Message Received Trigger",
    description:
      "Triggers when a new message is received in Gmail. Supports userId, labelIds, query, and polling interval config.",
  },
  {
    id: "GMAIL_EMAIL_SENT_TRIGGER",
    name: "Email Sent",
    description:
      "Triggers when a Gmail message is sent by the authenticated user. Supports optional Gmail search query filtering.",
  },
]

export const GMAIL_ACTIONS: IntegrationAction[] = [
  {
    id: "GMAIL_FETCH_EMAILS",
    name: "Fetch emails",
    description:
      "Fetch email messages with Gmail query filtering, labels, pagination, and optional full content.",
    inputFields: ["query", "user_id", "verbose", "label_ids", "max_results"],
  },
  {
    id: "GMAIL_FETCH_MESSAGE_BY_MESSAGE_ID",
    name: "Fetch message by message ID",
    description: "Read a specific Gmail message by ID.",
    inputFields: ["user_id", "message_id", "format"],
  },
  {
    id: "GMAIL_FETCH_MESSAGE_BY_THREAD_ID",
    name: "Fetch message by thread ID",
    description: "Read messages from a Gmail thread.",
    inputFields: ["user_id", "thread_id", "page_token"],
  },
  {
    id: "GMAIL_SEND_EMAIL",
    name: "Send email",
    description: "Send an email immediately from the connected Gmail account.",
    inputFields: [
      "recipient_email",
      "subject",
      "body",
      "cc",
      "bcc",
      "attachment",
    ],
  },
  {
    id: "GMAIL_CREATE_EMAIL_DRAFT",
    name: "Create email draft",
    description: "Create a draft email for review or later sending.",
    inputFields: [
      "recipient_email",
      "subject",
      "body",
      "cc",
      "bcc",
      "thread_id",
    ],
  },
  {
    id: "GMAIL_UPDATE_DRAFT",
    name: "Update draft",
    description: "Replace an existing Gmail draft's content.",
    inputFields: ["user_id", "draft_id", "recipient_email", "subject", "body"],
  },
  {
    id: "GMAIL_GET_DRAFT",
    name: "Get draft",
    description: "Inspect a Gmail draft before sending or editing.",
    inputFields: ["user_id", "draft_id", "format"],
  },
  {
    id: "GMAIL_LIST_DRAFTS",
    name: "List drafts",
    description: "List Gmail drafts with optional verbose details.",
    inputFields: ["user_id", "max_results", "page_token", "verbose"],
  },
  {
    id: "GMAIL_SEND_DRAFT",
    name: "Send draft",
    description: "Send an existing Gmail draft as-is.",
    inputFields: ["user_id", "draft_id"],
  },
  {
    id: "GMAIL_DELETE_DRAFT",
    name: "Delete draft",
    description: "Permanently delete a Gmail draft.",
    inputFields: ["user_id", "draft_id"],
  },
  {
    id: "GMAIL_REPLY_TO_THREAD",
    name: "Reply to thread",
    description: "Send a reply inside an existing Gmail thread.",
    inputFields: [
      "user_id",
      "thread_id",
      "message_body",
      "recipient_email",
      "cc",
      "bcc",
    ],
  },
  {
    id: "GMAIL_FORWARD_MESSAGE",
    name: "Forward message",
    description: "Forward an existing Gmail message to recipients.",
    inputFields: [
      "user_id",
      "message_id",
      "recipients",
      "cc",
      "bcc",
      "additional_text",
    ],
  },
  {
    id: "GMAIL_LIST_THREADS",
    name: "List threads",
    description: "List Gmail threads with optional query and pagination.",
    inputFields: ["user_id", "query", "max_results", "page_token", "verbose"],
  },
  {
    id: "GMAIL_DELETE_THREAD",
    name: "Delete thread",
    description: "Permanently delete a Gmail thread.",
    inputFields: ["user_id", "id"],
  },
  {
    id: "GMAIL_MOVE_THREAD_TO_TRASH",
    name: "Trash thread",
    description: "Move a Gmail thread to trash.",
    inputFields: ["user_id", "thread_id"],
  },
  {
    id: "GMAIL_UNTRASH_THREAD",
    name: "Untrash thread",
    description: "Restore a trashed Gmail thread.",
    inputFields: ["user_id", "thread_id"],
  },
  {
    id: "GMAIL_MODIFY_THREAD_LABELS",
    name: "Modify thread labels",
    description: "Add or remove labels on all messages in a thread.",
    inputFields: ["user_id", "thread_id", "add_label_ids", "remove_label_ids"],
  },
  {
    id: "GMAIL_ADD_LABEL_TO_EMAIL",
    name: "Modify email labels",
    description: "Add and remove Gmail labels for a single message.",
    inputFields: ["user_id", "message_id", "add_label_ids", "remove_label_ids"],
  },
  {
    id: "GMAIL_BATCH_MODIFY_MESSAGES",
    name: "Batch modify messages",
    description: "Bulk add or remove labels for up to 1,000 Gmail messages.",
    inputFields: ["userId", "messageIds", "addLabelIds", "removeLabelIds"],
  },
  {
    id: "GMAIL_MOVE_TO_TRASH",
    name: "Move message to trash",
    description: "Move a Gmail message to trash.",
    inputFields: ["user_id", "message_id"],
  },
  {
    id: "GMAIL_UNTRASH_MESSAGE",
    name: "Untrash message",
    description: "Restore a trashed Gmail message.",
    inputFields: ["user_id", "message_id"],
  },
  {
    id: "GMAIL_DELETE_MESSAGE",
    name: "Delete message",
    description: "Permanently delete a Gmail message.",
    inputFields: ["user_id", "message_id"],
  },
  {
    id: "GMAIL_BATCH_DELETE_MESSAGES",
    name: "Batch delete messages",
    description: "Permanently delete multiple Gmail messages.",
    inputFields: ["userId", "messageIds"],
  },
  {
    id: "GMAIL_GET_ATTACHMENT",
    name: "Get attachment",
    description: "Download a Gmail attachment by message and attachment ID.",
    inputFields: ["user_id", "message_id", "attachment_id", "file_name"],
  },
  {
    id: "GMAIL_IMPORT_MESSAGE",
    name: "Import message",
    description:
      "Import an existing raw email into Gmail with scanning and classification.",
    inputFields: ["user_id", "raw", "never_mark_spam", "process_for_calendar"],
  },
  {
    id: "GMAIL_INSERT_MESSAGE",
    name: "Insert message into mailbox",
    description: "Insert a raw message into Gmail similar to IMAP append.",
    inputFields: ["user_id", "raw", "deleted"],
  },
  {
    id: "GMAIL_LIST_HISTORY",
    name: "List Gmail history",
    description: "Read mailbox history changes since a history ID.",
    inputFields: ["user_id", "start_history_id", "history_types", "label_id"],
  },
  {
    id: "GMAIL_GET_PROFILE",
    name: "Get profile",
    description:
      "Retrieve Gmail profile info including email address and history ID.",
    inputFields: ["user_id"],
  },
  {
    id: "GMAIL_LIST_LABELS",
    name: "List labels",
    description: "List system and user-created Gmail labels.",
    inputFields: ["user_id", "include_details"],
  },
  {
    id: "GMAIL_GET_LABEL",
    name: "Get label",
    description: "Get details for a Gmail label.",
    inputFields: ["user_id", "id"],
  },
  {
    id: "GMAIL_CREATE_LABEL",
    name: "Create label",
    description: "Create a Gmail label.",
    inputFields: ["user_id", "label_name", "text_color", "background_color"],
  },
  {
    id: "GMAIL_UPDATE_LABEL",
    name: "Update label",
    description: "Update a Gmail label's name, visibility, or color.",
    inputFields: ["userId", "id", "name", "color"],
  },
  {
    id: "GMAIL_PATCH_LABEL",
    name: "Patch label",
    description: "Patch a Gmail user-created label.",
    inputFields: ["userId", "id", "name", "color"],
  },
  {
    id: "GMAIL_DELETE_LABEL",
    name: "Delete label",
    description: "Permanently delete a user-created Gmail label.",
    inputFields: ["user_id", "label_id"],
  },
  {
    id: "GMAIL_REMOVE_LABEL",
    name: "Remove label (deprecated)",
    description: "Deprecated Gmail label deletion tool.",
    inputFields: ["user_id", "label_id"],
  },
  {
    id: "GMAIL_CREATE_FILTER",
    name: "Create filter",
    description: "Create a Gmail filter rule with criteria and actions.",
    inputFields: ["user_id", "criteria", "action"],
  },
  {
    id: "GMAIL_LIST_FILTERS",
    name: "List filters",
    description: "List Gmail filters.",
    inputFields: ["user_id"],
  },
  {
    id: "GMAIL_GET_FILTER",
    name: "Get filter",
    description: "Retrieve a Gmail filter by ID.",
    inputFields: ["user_id", "id"],
  },
  {
    id: "GMAIL_DELETE_FILTER",
    name: "Delete filter",
    description: "Delete a Gmail filter rule.",
    inputFields: ["user_id", "filter_id"],
  },
  {
    id: "GMAIL_GET_CONTACTS",
    name: "Get contacts",
    description:
      "Fetch saved contacts and other contacts for the connected Google account.",
    inputFields: ["person_fields", "resource_name", "page_token"],
  },
  {
    id: "GMAIL_GET_PEOPLE",
    name: "Get people",
    description: "Retrieve Google people/contact records.",
    inputFields: ["resource_name", "person_fields", "page_size", "sources"],
  },
  {
    id: "GMAIL_SEARCH_PEOPLE",
    name: "Search people",
    description: "Search contacts by name, email, phone, or organization.",
    inputFields: ["query", "page_size", "person_fields"],
  },
  {
    id: "GMAIL_LIST_SEND_AS",
    name: "List send-as aliases",
    description: "List Gmail send-as aliases.",
    inputFields: ["user_id"],
  },
  {
    id: "GMAIL_SETTINGS_SEND_AS_GET",
    name: "Get send-as alias",
    description: "Get a Gmail send-as alias configuration.",
    inputFields: ["user_id", "send_as_email"],
  },
  {
    id: "GMAIL_UPDATE_SEND_AS",
    name: "Update send-as alias",
    description:
      "Update display name, signature, reply-to, or SMTP settings for a send-as alias.",
    inputFields: ["user_id", "send_as_email", "display_name", "signature"],
  },
  {
    id: "GMAIL_PATCH_SEND_AS",
    name: "Patch send-as alias",
    description: "Patch selected fields on a Gmail send-as alias.",
    inputFields: ["user_id", "send_as_email", "display_name", "signature"],
  },
  {
    id: "GMAIL_LIST_FORWARDING_ADDRESSES",
    name: "List forwarding addresses",
    description: "List forwarding addresses configured in Gmail.",
    inputFields: ["user_id"],
  },
  {
    id: "GMAIL_GET_AUTO_FORWARDING",
    name: "Get auto-forwarding",
    description: "Get Gmail auto-forwarding settings.",
    inputFields: ["user_id"],
  },
  {
    id: "GMAIL_GET_VACATION_SETTINGS",
    name: "Get vacation settings",
    description: "Read Gmail vacation responder settings.",
    inputFields: ["user_id"],
  },
  {
    id: "GMAIL_UPDATE_VACATION_SETTINGS",
    name: "Update vacation settings",
    description: "Configure Gmail vacation responder settings.",
    inputFields: [
      "userId",
      "enableAutoReply",
      "responseSubject",
      "responseBodyHtml",
    ],
  },
  {
    id: "GMAIL_GET_LANGUAGE_SETTINGS",
    name: "Get language settings",
    description: "Read Gmail display language settings.",
    inputFields: ["user_id"],
  },
  {
    id: "GMAIL_UPDATE_LANGUAGE_SETTINGS",
    name: "Update language settings",
    description: "Update Gmail display language settings.",
    inputFields: ["user_id", "display_language"],
  },
  {
    id: "GMAIL_SETTINGS_GET_IMAP",
    name: "Get IMAP settings",
    description: "Read Gmail IMAP settings.",
    inputFields: ["user_id"],
  },
  {
    id: "GMAIL_UPDATE_IMAP_SETTINGS",
    name: "Update IMAP settings",
    description: "Update Gmail IMAP settings.",
    inputFields: ["user_id", "enabled", "autoExpunge"],
  },
  {
    id: "GMAIL_SETTINGS_GET_POP",
    name: "Get POP settings",
    description: "Read Gmail POP settings.",
    inputFields: ["user_id"],
  },
  {
    id: "GMAIL_UPDATE_POP_SETTINGS",
    name: "Update POP settings",
    description: "Update Gmail POP settings.",
    inputFields: ["user_id", "access_window", "disposition"],
  },
  {
    id: "GMAIL_LIST_SMIME_INFO",
    name: "List S/MIME configs",
    description: "List S/MIME configs for a send-as alias.",
    inputFields: ["user_id", "send_as_email"],
  },
  {
    id: "GMAIL_LIST_CSE_IDENTITIES",
    name: "List CSE identities",
    description: "List Gmail client-side encrypted identities.",
    inputFields: ["user_id", "page_size", "page_token"],
  },
  {
    id: "GMAIL_LIST_CSE_KEYPAIRS",
    name: "List CSE key pairs",
    description: "List Gmail client-side encryption key pairs.",
    inputFields: ["user_id", "page_size", "page_token"],
  },
  {
    id: "GMAIL_STOP_WATCH",
    name: "Stop watch notifications",
    description: "Stop Gmail push notifications for a mailbox.",
    inputFields: ["user_id"],
  },
  {
    id: "GMAIL_LIST_MESSAGES",
    name: "List messages (deprecated)",
    description: "Deprecated Gmail list messages tool. Prefer Fetch emails.",
    inputFields: ["user_id", "q", "label_ids", "max_results"],
  },
  {
    id: "GMAIL_CREATE_PROMPT_POST",
    name: "Create prompt post",
    description:
      "Gmail-related prompt post tool currently returned by the connected toolkit.",
    inputFields: ["message", "instructions", "format", "config"],
  },
  {
    id: "GMAIL_UPDATE_USER_ATTRIBUTES_VALUES",
    name: "Update user attributes values",
    description: "Update user attribute values for a resource.",
    inputFields: ["userId", "resourceId", "resourceType", "attributes"],
  },
]

export const INTEGRATIONS_CATALOG: CatalogIntegration[] = [
  {
    slug: "gmail",
    name: "Gmail",
    logo: "https://cdn.simpleicons.org/gmail",
    description: "Send and organize email activity directly from workflows.",
    category: "communication",
    authType: "oauth",
    connectorProvider: "composio",
    composioToolkit: "gmail",
    setupInstructions: [
      "Click Connect Gmail.",
      "A secure Google authorization page will open.",
      "Choose the mailbox Atmet should automate and approve the requested access.",
      "Return to Atmet and use Gmail triggers or actions inside workflows.",
    ],
    scopes: [
      {
        name: "gmail.modify",
        description:
          "Read, send, label, archive, and move Gmail messages to trash when workflows run.",
      },
      {
        name: "gmail.compose",
        description: "Create, update, and send drafts or composed messages.",
      },
      {
        name: "gmail.settings.basic",
        description:
          "Read and update mailbox settings such as labels, filters, POP, IMAP, language, and vacation replies where approved.",
      },
      {
        name: "gmail.settings.sharing",
        description:
          "Read and update forwarding and send-as settings where Google allows it.",
      },
      {
        name: "userinfo.email",
        description:
          "Identify which mailbox should be linked to this workspace.",
      },
    ],
    triggers: GMAIL_TRIGGERS,
    actions: GMAIL_ACTIONS,
  },
  {
    slug: "google-contacts",
    name: "Google Contacts",
    logo: "https://cdn.simpleicons.org/googlecontacts",
    description:
      "Find, create, and update saved Google contacts for communication workflows.",
    category: "productivity",
    authType: "oauth",
    connectorProvider: "composio",
    composioToolkit: "googlecontacts",
    setupInstructions: [
      "Click Connect Google Contacts.",
      "A secure Google authorization page will open.",
      "Choose the Google account whose contacts Atmet should access.",
      "Return to Atmet and use contacts in chats or workflows.",
    ],
    scopes: [
      {
        name: "contacts.read",
        description: "Search and view saved Google contacts for lookups.",
      },
      {
        name: "contacts.write",
        description:
          "Create or update contacts when an approved workflow asks for it.",
      },
    ],
    triggers: [],
    actions: [
      {
        id: "google-contacts-list",
        name: "List contacts",
        description: "Find saved contacts by name, email, or phone.",
        inputFields: ["query"],
      },
      {
        id: "google-contacts-create",
        name: "Create contact",
        description: "Create a new saved contact.",
        inputFields: ["name", "email", "phone"],
      },
      {
        id: "google-contacts-update",
        name: "Update contact",
        description: "Update an existing saved contact.",
        inputFields: ["contactId", "fields"],
      },
    ],
  },
  {
    slug: "slack",
    name: "Slack",
    logo: "https://cdn.simpleicons.org/slack",
    description: "Post updates and listen for channel activity in real time.",
    category: "communication",
    authType: "oauth",
    connectorProvider: "composio",
    composioToolkit: "slack",
    setupInstructions: [
      "Click Connect Slack.",
      "Choose the Slack workspace and review permissions.",
      "Approve the app and return to Atmet.",
    ],
    scopes: [
      {
        name: "channels:history",
        description:
          "Read channel history to trigger workflows from new content.",
      },
      {
        name: "chat:write",
        description:
          "Send messages to selected channels from workflow actions.",
      },
      {
        name: "users:read",
        description: "Resolve members and mentions when posting updates.",
      },
    ],
    triggers: [
      {
        id: "slack-new-message",
        name: "New channel message",
        description:
          "Starts when a new message is posted in a selected channel.",
      },
      {
        id: "slack-new-reaction",
        name: "Reaction added",
        description: "Starts when a reaction is added to a message.",
      },
    ],
    actions: [
      {
        id: "slack-send-message",
        name: "Send channel message",
        description: "Post a message to a channel or thread.",
        inputFields: ["channel", "text"],
      },
      {
        id: "slack-open-dm",
        name: "Send direct message",
        description: "Send a direct message to a workspace member.",
        inputFields: ["userId", "text"],
      },
    ],
  },
  {
    slug: "telegram",
    name: "Telegram",
    logo: "https://cdn.simpleicons.org/telegram",
    description:
      "Use the Telegram Bot API to send messages, files, polls, and manage accessible chats.",
    category: "communication",
    authType: "apikey",
    connectorProvider: "composio",
    composioToolkit: "telegram",
    apiKeyUrl: "https://t.me/BotFather",
    setupInstructions: [
      "Open BotFather in Telegram and create a bot with /newbot, or use /token for an existing bot.",
      "Copy the bot token BotFather gives you.",
      "Paste the token here so Atmet can create the connected account.",
      "Use the connected Telegram account in chats, agents, and workflows.",
    ],
    scopes: [
      {
        name: "generic_api_key",
        description:
          "Telegram requires a Bot Token from BotFather. This connects a bot, not a personal Telegram account.",
      },
      {
        name: "chat access",
        description:
          "Telegram Bot API tools can only access chats where the bot is present and permitted.",
      },
    ],
    triggers: TELEGRAM_TRIGGERS,
    actions: TELEGRAM_ACTIONS,
  },
  {
    slug: "google-calendar",
    name: "Google Calendar",
    logo: "https://cdn.simpleicons.org/googlecalendar",
    description:
      "Create, update, search, and react to Google Calendar events through workflows.",
    category: "productivity",
    authType: "oauth",
    connectorProvider: "composio",
    composioToolkit: "googlecalendar",
    setupInstructions: [
      "Click Connect Google Calendar.",
      "A secure Google authorization page will open.",
      "Choose the Google account whose calendars Atmet should automate.",
      "Return to Atmet and use Calendar triggers or actions inside chats and workflows.",
    ],
    scopes: [
      {
        name: "calendar.read",
        description:
          "List calendars, search events, inspect attendees, and check availability.",
      },
      {
        name: "calendar.write",
        description:
          "Create, update, move, delete, and batch-edit events when approved.",
      },
      {
        name: "calendar.acl",
        description:
          "Read or update calendar sharing rules when Google grants access.",
      },
    ],
    triggers: GOOGLE_CALENDAR_TRIGGERS,
    actions: GOOGLE_CALENDAR_ACTIONS,
  },
  {
    slug: "google-sheets",
    name: "Google Sheets",
    logo: "https://cdn.simpleicons.org/googlesheets",
    description:
      "Create rows, update cells, and sync workflow data into spreadsheets.",
    category: "productivity",
    authType: "oauth",
    connectorProvider: "composio",
    composioToolkit: "googlesheets",
    setupInstructions: [
      "Click Connect Google Sheets.",
      "A secure Google authorization page will open.",
      "Choose the Google account and approve access for the sheets you want to automate.",
      "Return to Atmet and use Sheets actions inside workflows.",
    ],
    scopes: [
      {
        name: "spreadsheets.read",
        description:
          "Read spreadsheet structure and rows for workflow lookups.",
      },
      {
        name: "spreadsheets.write",
        description: "Append rows and update cells from workflow actions.",
      },
    ],
    triggers: GOOGLE_SHEETS_TRIGGERS,
    actions: GOOGLE_SHEETS_ACTIONS,
  },
  {
    slug: "google-drive",
    name: "Google Drive",
    logo: "https://cdn.simpleicons.org/googledrive",
    description:
      "Search, inspect, download, organize, and share Drive files through workflows.",
    category: "productivity",
    authType: "oauth",
    connectorProvider: "composio",
    composioToolkit: "googledrive",
    setupInstructions: [
      "Click Connect Google Drive.",
      "A secure Google authorization page will open.",
      "Choose the Google account and approve Drive access.",
      "Return to Atmet and use Drive actions inside chats or workflows.",
    ],
    scopes: [
      {
        name: "drive.read",
        description:
          "Find files, inspect metadata, and retrieve accessible Drive content.",
      },
      {
        name: "drive.write",
        description:
          "Create, update, organize, or share files when a workflow asks for it.",
      },
    ],
    triggers: GOOGLE_DRIVE_TRIGGERS,
    actions: GOOGLE_DRIVE_ACTIONS,
  },
  {
    slug: "google-docs",
    name: "Google Docs",
    logo: "https://cdn.simpleicons.org/googledocs",
    description:
      "Create, search, export, and edit Google Docs through Atmet workflows.",
    category: "productivity",
    authType: "oauth",
    connectorProvider: "composio",
    composioToolkit: "googledocs",
    setupInstructions: [
      "Click Connect Google Docs.",
      "A secure Google authorization page will open.",
      "Choose the Google account whose documents Atmet should automate.",
      "Return to Atmet and use Docs triggers or actions inside chats and workflows.",
    ],
    scopes: [
      {
        name: "docs.read",
        description:
          "Search and read accessible Google Docs content and structure.",
      },
      {
        name: "docs.write",
        description: "Create documents and apply document edits when approved.",
      },
      {
        name: "drive.file",
        description:
          "Find Docs files and observe Docs-related Drive changes where needed.",
      },
    ],
    triggers: GOOGLE_DOCS_TRIGGERS,
    actions: GOOGLE_DOCS_ACTIONS,
  },
  {
    slug: "chatgpt",
    name: "ChatGPT",
    logo: "https://cdn.simpleicons.org/openai",
    description:
      "Connect an OpenAI account to manage files, vector stores, assistants, and model resources.",
    category: "developer",
    authType: "apikey",
    connectorProvider: "composio",
    composioToolkit: "openai",
    apiKeyUrl: "https://platform.openai.com/api-keys",
    setupInstructions: [
      "Open your OpenAI Platform API keys page.",
      "Create or copy an API key for the account Atmet should use.",
      "Paste the key here, test it, then save the connection.",
      "Use ChatGPT/OpenAI actions inside chats and workflows.",
    ],
    scopes: [
      {
        name: "openai.files",
        description:
          "List, upload, inspect, and manage OpenAI files where permitted.",
      },
      {
        name: "openai.vector_stores",
        description: "List and manage vector stores and vector store files.",
      },
    ],
    triggers: [],
    actions: [
      {
        id: "openai-list-files",
        name: "List files",
        description: "List files available in the connected OpenAI account.",
        inputFields: ["purpose"],
      },
      {
        id: "openai-list-vector-stores",
        name: "List vector stores",
        description: "Inspect vector stores in the connected OpenAI account.",
        inputFields: ["limit"],
      },
    ],
  },
  {
    slug: "notion",
    name: "Notion",
    logo: "https://cdn.simpleicons.org/notion",
    description: "Create and update pages, tasks, and databases automatically.",
    category: "productivity",
    authType: "oauth",
    connectorProvider: "composio",
    composioToolkit: "notion",
    setupInstructions: [
      "Click Connect Notion.",
      "Select which workspace pages and databases Atmet can access.",
      "Authorize and return to Atmet to continue.",
    ],
    scopes: [
      {
        name: "read:content",
        description: "Read page and database content to power triggers.",
      },
      {
        name: "update:content",
        description: "Create or edit pages from workflow actions.",
      },
    ],
    triggers: [
      {
        id: "notion-new-page",
        name: "New page created",
        description: "Starts when a new page appears in a selected database.",
      },
    ],
    actions: [
      {
        id: "notion-create-page",
        name: "Create page",
        description: "Create a page with mapped properties in a database.",
        inputFields: ["databaseId", "title", "properties"],
      },
      {
        id: "notion-update-page",
        name: "Update page",
        description: "Update properties or content of an existing page.",
        inputFields: ["pageId", "properties"],
      },
    ],
  },
  {
    slug: "hubspot",
    name: "HubSpot",
    logo: "https://cdn.simpleicons.org/hubspot",
    description: "Sync contacts and deal activity with your CRM workflows.",
    category: "crm",
    authType: "oauth",
    connectorProvider: "composio",
    composioToolkit: "hubspot",
    setupInstructions: [
      "Click Connect HubSpot.",
      "A secure HubSpot authorization page will open.",
      "Approve the HubSpot account Atmet should automate.",
      "Return to Atmet and use HubSpot inside workflows.",
    ],
    scopes: [
      {
        name: "crm.objects.contacts.read",
        description: "Read contact records for trigger and lookup steps.",
      },
      {
        name: "crm.objects.deals.write",
        description: "Create and update deals from workflow actions.",
      },
    ],
    triggers: [
      {
        id: "hubspot-new-contact",
        name: "New contact",
        description: "Starts when a contact is created in HubSpot.",
      },
      {
        id: "hubspot-deal-stage-change",
        name: "Deal stage changed",
        description: "Starts when a deal moves to a new stage.",
      },
    ],
    actions: [
      {
        id: "hubspot-create-contact",
        name: "Create contact",
        description: "Create a new contact in your CRM.",
        inputFields: ["email", "firstName", "lastName"],
      },
      {
        id: "hubspot-create-note",
        name: "Create note",
        description: "Attach a note to an existing CRM record.",
        inputFields: ["objectId", "note"],
      },
    ],
  },
  {
    slug: "github",
    name: "GitHub",
    logo: "https://cdn.simpleicons.org/github",
    description: "Track pull requests and automate repository operations.",
    category: "developer",
    authType: "oauth",
    connectorProvider: "composio",
    composioToolkit: "github",
    setupInstructions: [
      "Click Connect GitHub.",
      "A secure GitHub authorization page will open.",
      "Authorize the organizations and repositories Atmet should automate.",
      "Return to Atmet and use GitHub triggers or actions inside chats and workflows.",
    ],
    scopes: [
      {
        name: "repo",
        description:
          "Read and write repository resources such as issues, pull requests, contents, releases, and workflow data where approved.",
      },
      {
        name: "read:org",
        description: "List organization repositories and team metadata.",
      },
      {
        name: "workflow",
        description:
          "Inspect and manage GitHub Actions workflow runs, jobs, and artifacts when GitHub grants access.",
      },
    ],
    triggers: GITHUB_TRIGGERS,
    actions: GITHUB_ACTIONS,
  },
  {
    slug: "instagram",
    name: "Instagram",
    logo: "https://cdn.simpleicons.org/instagram",
    description:
      "Publish media, inspect Instagram business content, comments, conversations, and insights.",
    category: "social",
    authType: "oauth",
    connectorProvider: "composio",
    composioToolkit: "instagram",
    setupInstructions: [
      "Click Connect Instagram.",
      "A secure authorization page will open.",
      "Authorize the Instagram business account and Facebook page resources Atmet should automate.",
      "Return to Atmet and use Instagram actions inside chats and workflows.",
    ],
    scopes: [
      {
        name: "instagram_business_basic",
        description:
          "Read Instagram business profile, media, comments, conversations, and insights where approved.",
      },
      {
        name: "instagram_content_publish",
        description:
          "Create media containers and publish Instagram content when approved.",
      },
      {
        name: "instagram_manage_messages",
        description:
          "Read and send Instagram messages or comment replies where Meta grants access.",
      },
    ],
    triggers: INSTAGRAM_TRIGGERS,
    actions: INSTAGRAM_ACTIONS,
  },
  {
    slug: "jira",
    name: "Jira",
    logo: "https://cdn.simpleicons.org/jira",
    description: "Sync issue activity and sprint milestones into workflows.",
    category: "developer",
    authType: "oauth",
    connectorProvider: "composio",
    composioToolkit: "jira",
    setupInstructions: [
      "Click Connect Jira.",
      "Sign in to Atlassian and choose the Jira site to authorize.",
      "Approve access and return to Atmet to finish setup.",
    ],
    scopes: [
      {
        name: "read:jira-work",
        description: "Read issue and sprint updates for workflow triggers.",
      },
      {
        name: "write:jira-work",
        description: "Create and update Jira issues from actions.",
      },
    ],
    triggers: [
      {
        id: "jira-issue-created",
        name: "Issue created",
        description: "Starts when a new issue is created.",
      },
      {
        id: "jira-issue-transitioned",
        name: "Issue transitioned",
        description: "Starts when an issue moves to a new status.",
      },
    ],
    actions: [
      {
        id: "jira-create-issue",
        name: "Create issue",
        description: "Create a Jira issue in a selected project.",
        inputFields: ["projectKey", "summary", "description"],
      },
      {
        id: "jira-add-comment",
        name: "Add comment",
        description: "Post a comment on an existing issue.",
        inputFields: ["issueKey", "comment"],
      },
    ],
  },
  {
    slug: "asana",
    name: "Asana",
    logo: "https://cdn.simpleicons.org/asana",
    description: "Track tasks and project updates across teams.",
    category: "productivity",
    authType: "oauth",
    connectorProvider: "composio",
    composioToolkit: "asana",
    setupInstructions: [
      "Click Connect Asana.",
      "Choose your Asana workspace and review requested permissions.",
      "Approve access and return to Atmet.",
    ],
    scopes: [
      {
        name: "tasks:read",
        description: "Read tasks and project activity for triggers.",
      },
      {
        name: "tasks:write",
        description: "Create and update tasks from workflow actions.",
      },
    ],
    triggers: [
      {
        id: "asana-task-created",
        name: "Task created",
        description: "Starts when a new task is created in a project.",
      },
      {
        id: "asana-task-completed",
        name: "Task completed",
        description: "Starts when a task is marked complete.",
      },
    ],
    actions: [
      {
        id: "asana-create-task",
        name: "Create task",
        description: "Create a new task in Asana.",
        inputFields: ["projectId", "name", "notes"],
      },
      {
        id: "asana-update-task",
        name: "Update task",
        description: "Update an existing task's details.",
        inputFields: ["taskId", "name", "notes"],
      },
    ],
  },
  {
    slug: "salesforce",
    name: "Salesforce",
    logo: "https://cdn.simpleicons.org/salesforce",
    description: "Automate lead, account, and opportunity operations.",
    category: "crm",
    authType: "oauth",
    connectorProvider: "composio",
    composioToolkit: "salesforce",
    setupInstructions: [
      "Click Connect Salesforce.",
      "A secure Salesforce authorization page will open.",
      "Approve the Salesforce org Atmet should automate.",
      "Return to Atmet and use Salesforce inside workflows.",
    ],
    scopes: [
      {
        name: "objects.read",
        description: "Read CRM records for trigger conditions and lookups.",
      },
      {
        name: "objects.write",
        description: "Create and update Salesforce records from actions.",
      },
    ],
    triggers: [
      {
        id: "salesforce-new-lead",
        name: "New lead",
        description: "Starts when a new lead is added.",
      },
      {
        id: "salesforce-opportunity-updated",
        name: "Opportunity updated",
        description: "Starts when an opportunity changes stage.",
      },
    ],
    actions: [
      {
        id: "salesforce-create-lead",
        name: "Create lead",
        description: "Create a lead record in Salesforce.",
        inputFields: ["email", "firstName", "lastName", "company"],
      },
      {
        id: "salesforce-update-opportunity",
        name: "Update opportunity",
        description: "Update key fields of an opportunity.",
        inputFields: ["opportunityId", "stage", "amount"],
      },
    ],
  },
  {
    slug: "discord",
    name: "Discord",
    logo: "https://cdn.simpleicons.org/discord",
    description: "Connect community channels and bot notifications.",
    category: "communication",
    authType: "oauth",
    connectorProvider: "composio",
    composioToolkit: "discord",
    setupInstructions: [
      "Click Connect Discord.",
      "Select the server where Atmet can post updates.",
      "Authorize access and return to Atmet.",
    ],
    scopes: [
      {
        name: "guilds",
        description: "Read available servers and channel metadata.",
      },
      {
        name: "messages.write",
        description: "Post channel messages from workflow actions.",
      },
    ],
    triggers: [
      {
        id: "discord-message-posted",
        name: "Message posted",
        description: "Starts when a new message is posted in a channel.",
      },
      {
        id: "discord-member-joined",
        name: "Member joined",
        description: "Starts when a member joins a selected server.",
      },
    ],
    actions: [
      {
        id: "discord-send-message",
        name: "Send message",
        description: "Send a message to a selected channel.",
        inputFields: ["channelId", "message"],
      },
      {
        id: "discord-create-thread",
        name: "Create thread",
        description: "Create a thread from a channel message.",
        inputFields: ["channelId", "name", "message"],
      },
    ],
  },
  {
    slug: "x",
    name: "X",
    logo: "https://cdn.simpleicons.org/x",
    description: "Publish posts and react to social engagement signals.",
    category: "social",
    authType: "oauth",
    connectorProvider: "composio",
    composioToolkit: "x",
    setupInstructions: [
      "Click Connect X.",
      "A secure X authorization page will open.",
      "Approve the account Atmet should automate.",
      "Return to Atmet and use X actions inside workflows.",
    ],
    scopes: [
      {
        name: "tweet.read",
        description: "Read post events that can trigger workflows.",
      },
      {
        name: "tweet.write",
        description: "Publish posts from workflow actions.",
      },
    ],
    triggers: [
      {
        id: "x-mention",
        name: "New mention",
        description: "Starts when your account is mentioned in a post.",
      },
    ],
    actions: [
      {
        id: "x-create-post",
        name: "Create post",
        description: "Publish a post from a workflow.",
        inputFields: ["text"],
      },
      {
        id: "x-reply",
        name: "Reply to post",
        description: "Reply to an existing post thread.",
        inputFields: ["postId", "text"],
      },
    ],
  },
]

export function getCatalogIntegration(slug: string): CatalogIntegration | null {
  return INTEGRATIONS_CATALOG.find((i) => i.slug === slug) ?? null
}
