"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { HugeiconsIcon } from "@hugeicons/react"
import { Search01Icon } from "@hugeicons/core-free-icons"
import {
  Bell,
  BookOpen,
  Bot,
  CreditCard,
  Database,
  Disc3,
  FileSearch,
  FolderOpen,
  FolderPlus,
  Globe2,
  Gauge,
  Languages,
  LifeBuoy,
  LockKeyhole,
  Mail,
  MessageCircle,
  MessageSquare,
  Palette,
  Puzzle,
  Shield,
  Settings,
  SlidersHorizontal,
  UserPlus,
  Users,
  Workflow,
  Wrench,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
  CommandSeparator,
} from "@/components/ui/command"
import { Button } from "@/components/ui/button"
import { Kbd } from "@/components/ui/kbd"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useTheme } from "next-themes"
import { OPEN_NEW_SKILL_DIALOG_EVENT } from "@/lib/skills-events"

const OPEN_MANAGE_CHAT_USERS_EVENT = "open-manage-chat-users"
const OPEN_SETTINGS_PANEL_EVENT = "open-settings-panel"

const sectors = ["Data", "Chats", "Projects", "Users", "Settings", "Apps"] as const
type QuickActionSector = (typeof sectors)[number]
const settingsSections = [
  "Account",
  "Workspace",
  "General",
  "Notifications",
  "Members",
  "Integrations",
  "Usage and limits",
  "Data controls",
  "Billing",
  "Help Docs",
  "Contact Support",
] as const
type SettingsSection = (typeof settingsSections)[number]

type OpenSettingsPanelDetail = {
  section?: SettingsSection
  memberId?: string
  memberQuery?: string
  membersAction?: "invite"
}

type QuickActionIntent = "toggle-theme"

type QuickActionShortcut = {
  key: string
  primary?: boolean
  shift?: boolean
  alt?: boolean
  display: string
}

type QuickAction = {
  id: string
  parentId?: string
  level: 0 | 1 | 2
  sector: QuickActionSector
  label: string
  description: string
  path?: string
  icon: React.ComponentType<React.ComponentProps<"svg">>
  eventName?: string
  eventDetail?: OpenSettingsPanelDetail
  keywords?: string[]
  intent?: QuickActionIntent
  shortcut?: QuickActionShortcut
  avatarUrl?: string
  logoUrl?: string
}

const dataQuickActions: QuickAction[] = [
  {
    id: "data-integrations",
    level: 0,
    sector: "Data",
    label: "Apps",
    description: "Manage connected tools and synced sources.",
    path: "/integrations",
    icon: Puzzle,
    shortcut: {
      key: "i",
      primary: true,
      alt: true,
      display: "⌥⌘I",
    },
  },
]

const chatQuickActions: QuickAction[] = [
  {
    id: "chats-manage",
    level: 0,
    sector: "Chats",
    label: "Manage Chats",
    description: "Open AI Core conversations.",
    path: "/ai-core",
    icon: MessageSquare,
    shortcut: {
      key: "a",
      primary: true,
      alt: true,
      display: "⌥⌘A",
    },
  },
  {
    id: "chats-open",
    parentId: "chats-manage",
    level: 1,
    sector: "Chats",
    label: "Open Chats",
    description: "Go to AI Core conversations.",
    path: "/ai-core",
    icon: MessageCircle,
  },
  {
    id: "chats-users",
    parentId: "chats-manage",
    level: 1,
    sector: "Chats",
    label: "Manage Chat Users",
    description: "Open participant management in AI Core.",
    path: "/ai-core",
    icon: Users,
    eventName: OPEN_MANAGE_CHAT_USERS_EVENT,
  },
]

const projectQuickActions: QuickAction[] = [
  {
    id: "projects-new",
    level: 0,
    sector: "Projects",
    label: "New Project",
    description: "Start a new agent project.",
    path: "/workflow",
    icon: FolderPlus,
    shortcut: {
      key: "p",
      primary: true,
      alt: true,
      display: "⌥⌘P",
    },
  },
  {
    id: "projects-new-skill",
    level: 0,
    sector: "Projects",
    label: "New Skill",
    description: "Open create skill panel.",
    path: "/skills",
    icon: Bot,
    eventName: OPEN_NEW_SKILL_DIALOG_EVENT,
    shortcut: {
      key: "s",
      primary: true,
      alt: true,
      shift: true,
      display: "⇧⌥⌘S",
    },
  },
  {
    id: "projects-manage",
    level: 0,
    sector: "Projects",
    label: "Manage Projects",
    description: "Open agent projects and builders.",
    path: "/workflow",
    icon: FolderOpen,
    shortcut: {
      key: "w",
      primary: true,
      alt: true,
      display: "⌥⌘W",
    },
  },
  {
    id: "projects-workflow",
    parentId: "projects-manage",
    level: 1,
    sector: "Projects",
    label: "Agents",
    description: "Create and manage agent automations.",
    path: "/workflow",
    icon: Workflow,
  },
  {
    id: "projects-skills",
    parentId: "projects-manage",
    level: 1,
    sector: "Projects",
    label: "Skills",
    description: "Browse and manage workflow skills.",
    path: "/skills",
    icon: Bot,
    shortcut: {
      key: "s",
      primary: true,
      alt: true,
      display: "⌥⌘S",
    },
  },
]

const userQuickActionRoots: QuickAction[] = [
  {
    id: "users-manage",
    level: 0,
    sector: "Users",
    label: "Manage Users",
    description: "Open members and permissions in settings.",
    icon: Users,
    eventName: OPEN_SETTINGS_PANEL_EVENT,
    eventDetail: { section: "Members" },
    shortcut: {
      key: "m",
      primary: true,
      alt: true,
      display: "⌥⌘M",
    },
  },
  {
    id: "users-add",
    level: 0,
    sector: "Users",
    label: "Invite Member",
    description: "Open invite flow in members settings.",
    icon: UserPlus,
    eventName: OPEN_SETTINGS_PANEL_EVENT,
    eventDetail: { section: "Members", membersAction: "invite" },
    keywords: ["invite", "add member", "new user", "create user"],
    shortcut: {
      key: "m",
      primary: true,
      alt: true,
      shift: true,
      display: "⇧⌥⌘M",
    },
  },
]

const settingsRootAction: QuickAction = {
  id: "settings-manage",
  level: 0,
  sector: "Settings",
  label: "Manage Settings",
  description: "Open workspace settings.",
  icon: Settings,
  eventName: OPEN_SETTINGS_PANEL_EVENT,
  eventDetail: { section: "General" },
}

const settingsSectionIcons: Record<
  SettingsSection,
  React.ComponentType<React.ComponentProps<"svg">>
> = {
  Account: Shield,
  Workspace: Globe2,
  General: SlidersHorizontal,
  Notifications: Bell,
  Members: Users,
  Integrations: Puzzle,
  "Usage and limits": Gauge,
  "Data controls": Database,
  Billing: CreditCard,
  "Help Docs": BookOpen,
  "Contact Support": LifeBuoy,
}

const settingsSystemQuickActions: QuickAction[] = [
  {
    id: "settings-theme-toggle",
    level: 0,
    sector: "Settings",
    label: "Toggle Dark Mode",
    description: "Switch between light and dark mode.",
    icon: Palette,
    intent: "toggle-theme",
    shortcut: {
      key: "t",
      primary: true,
      alt: true,
      display: "⌥⌘T",
    },
  },
]

const settingsSectionQuickActions: QuickAction[] = settingsSections.map(
  (section) => ({
    id: `settings-section-${section.toLowerCase().replace(/\s+/g, "-")}`,
    parentId: "settings-manage",
    level: 1,
    sector: "Settings",
    label: section,
    description: `Open ${section.toLowerCase()} settings.`,
    icon: settingsSectionIcons[section],
    eventName: OPEN_SETTINGS_PANEL_EVENT,
    eventDetail: { section },
  })
)

const settingsNestedQuickActions: QuickAction[] = [
  {
    id: "settings-password",
    parentId: "settings-section-account",
    level: 2,
    sector: "Settings",
    label: "Change Password",
    description: "Account > Security. Update your login password.",
    icon: LockKeyhole,
    eventName: OPEN_SETTINGS_PANEL_EVENT,
    eventDetail: { section: "Account" },
    keywords: ["password", "security", "change password", "login"],
  },
  {
    id: "settings-email-login",
    parentId: "settings-section-account",
    level: 2,
    sector: "Settings",
    label: "Email and Login",
    description: "Account > Email and login preferences.",
    icon: Mail,
    eventName: OPEN_SETTINGS_PANEL_EVENT,
    eventDetail: { section: "Account" },
    keywords: ["email", "signin", "authentication"],
  },
  {
    id: "settings-theme-colors",
    parentId: "settings-section-general",
    level: 2,
    sector: "Settings",
    label: "Theme and Colors",
    description: "General > Appearance controls.",
    icon: Palette,
    eventName: OPEN_SETTINGS_PANEL_EVENT,
    eventDetail: { section: "General" },
    keywords: ["theme", "dark mode", "light mode", "colors"],
  },
  {
    id: "settings-font-size",
    parentId: "settings-section-general",
    level: 2,
    sector: "Settings",
    label: "Font Size",
    description: "General > Typography scale.",
    icon: SlidersHorizontal,
    eventName: OPEN_SETTINGS_PANEL_EVENT,
    eventDetail: { section: "General" },
    keywords: ["font", "text size", "size"],
  },
  {
    id: "settings-timezone",
    parentId: "settings-section-general",
    level: 2,
    sector: "Settings",
    label: "Time Zone",
    description: "General > Time and locale setup.",
    icon: Globe2,
    eventName: OPEN_SETTINGS_PANEL_EVENT,
    eventDetail: { section: "General" },
    keywords: ["timezone", "time zone", "region"],
  },
  {
    id: "settings-language",
    parentId: "settings-section-general",
    level: 2,
    sector: "Settings",
    label: "Language",
    description: "General > Language preferences.",
    icon: Languages,
    eventName: OPEN_SETTINGS_PANEL_EVENT,
    eventDetail: { section: "General" },
    keywords: ["language", "locale", "translation"],
  },
  {
    id: "settings-notifications",
    parentId: "settings-section-notifications",
    level: 2,
    sector: "Settings",
    label: "Notification Preferences",
    description: "Notifications > Email and push controls.",
    icon: Bell,
    eventName: OPEN_SETTINGS_PANEL_EVENT,
    eventDetail: { section: "Notifications" },
    keywords: ["alerts", "notify", "email notifications", "push"],
  },
  {
    id: "settings-roles",
    parentId: "settings-section-members",
    level: 2,
    sector: "Settings",
    label: "Roles and Permissions",
    description: "Members > Access control settings.",
    icon: Shield,
    eventName: OPEN_SETTINGS_PANEL_EVENT,
    eventDetail: { section: "Members" },
    keywords: ["permissions", "roles", "access"],
  },
  {
    id: "settings-invite-members",
    parentId: "settings-section-members",
    level: 2,
    sector: "Settings",
    label: "Invite Members",
    description: "Members > Invite team users.",
    icon: UserPlus,
    eventName: OPEN_SETTINGS_PANEL_EVENT,
    eventDetail: { section: "Members" },
    keywords: ["invite", "add member", "team"],
  },
  {
    id: "settings-limits",
    parentId: "settings-section-usage-and-limits",
    level: 2,
    sector: "Settings",
    label: "Rate Limits and Quotas",
    description: "Usage and limits > Monitor usage ceilings.",
    icon: Gauge,
    eventName: OPEN_SETTINGS_PANEL_EVENT,
    eventDetail: { section: "Usage and limits" },
    keywords: ["quota", "usage", "limit", "rate limit"],
  },
  {
    id: "settings-data-export",
    parentId: "settings-section-data-controls",
    level: 2,
    sector: "Settings",
    label: "Data Export and Retention",
    description: "Data controls > Export and retention policies.",
    icon: Database,
    eventName: OPEN_SETTINGS_PANEL_EVENT,
    eventDetail: { section: "Data controls" },
    keywords: ["export", "retention", "delete requests", "privacy"],
  },
  {
    id: "settings-payments",
    parentId: "settings-section-billing",
    level: 2,
    sector: "Settings",
    label: "Payment Methods",
    description: "Billing > Manage payment methods and invoices.",
    icon: CreditCard,
    eventName: OPEN_SETTINGS_PANEL_EVENT,
    eventDetail: { section: "Billing" },
    keywords: ["billing", "invoice", "card", "payment"],
  },
  {
    id: "settings-api-references",
    parentId: "settings-section-help-docs",
    level: 2,
    sector: "Settings",
    label: "API References",
    description: "Help Docs > Browse API documentation.",
    icon: Wrench,
    eventName: OPEN_SETTINGS_PANEL_EVENT,
    eventDetail: { section: "Help Docs" },
    keywords: ["api docs", "documentation", "guides"],
  },
]

const workspaceMemberTargets = [
  {
    id: "mem_001",
    name: "Amir Haddad",
    email: "amir.haddad@atmet.ai",
    role: "Super Admin",
    avatarUrl:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=128&q=80",
  },
  {
    id: "mem_002",
    name: "Lina Saad",
    email: "lina.saad@atmet.ai",
    role: "Admin",
    avatarUrl:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=128&q=80",
  },
  {
    id: "mem_003",
    name: "Omar Khaled",
    email: "omar.khaled@atmet.ai",
    role: "Workspace Admin",
    avatarUrl:
      "https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?auto=format&fit=crop&w=128&q=80",
  },
  {
    id: "mem_004",
    name: "Yara Nasser",
    email: "yara.nasser@atmet.ai",
    role: "Workspace Member",
    avatarUrl:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=128&q=80",
  },
  {
    id: "mem_005",
    name: "Fadi Mourad",
    email: "fadi.mourad@atmet.ai",
    role: "Workspace Admin",
    avatarUrl:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=128&q=80",
  },
] as const

const userQuickActions: QuickAction[] = workspaceMemberTargets.map(
  (member) => ({
    id: `users-member-${member.id}`,
    parentId: "users-manage",
    level: 1,
    sector: "Users",
    label: member.name,
    description: `${member.role} • ${member.email}`,
    icon: Users,
    eventName: OPEN_SETTINGS_PANEL_EVENT,
    eventDetail: {
      section: "Members",
      memberId: member.id,
      memberQuery: member.name,
    },
    keywords: [member.email, member.role, "member profile", "workspace user"],
    avatarUrl: member.avatarUrl,
  })
)

const topApps = [
  {
    slug: "gmail",
    name: "Gmail",
    logoUrl: "https://cdn.simpleicons.org/gmail",
    description: "Email automations and workflow triggers.",
  },
  {
    slug: "slack",
    name: "Slack",
    logoUrl: "https://cdn.simpleicons.org/slack",
    description: "Channel notifications and team messaging flows.",
  },
  {
    slug: "notion",
    name: "Notion",
    logoUrl: "https://cdn.simpleicons.org/notion",
    description: "Sync pages and databases into automations.",
  },
  {
    slug: "hubspot",
    name: "HubSpot",
    logoUrl: "https://cdn.simpleicons.org/hubspot",
    description: "CRM contacts, deals, and lifecycle events.",
  },
  {
    slug: "github",
    name: "GitHub",
    logoUrl: "https://cdn.simpleicons.org/github",
    description: "Repository events, PRs, and issue actions.",
  },
  {
    slug: "x",
    name: "X",
    logoUrl: "https://cdn.simpleicons.org/x",
    description: "Social publishing and mention-based triggers.",
  },
  {
    slug: "jira",
    name: "Jira",
    logoUrl: "https://cdn.simpleicons.org/jira",
    description: "Issue tracking workflows and sprint updates.",
  },
  {
    slug: "asana",
    name: "Asana",
    logoUrl: "https://cdn.simpleicons.org/asana",
    description: "Task orchestration and status transitions.",
  },
  {
    slug: "salesforce",
    name: "Salesforce",
    logoUrl: "https://cdn.simpleicons.org/salesforce",
    description: "Enterprise CRM objects and record updates.",
  },
  {
    slug: "discord",
    name: "Discord",
    logoUrl: "https://cdn.simpleicons.org/discord",
    description: "Community notifications and engagement signals.",
  },
] as const

const appQuickActions: QuickAction[] = topApps.map((app, index) => ({
  id: `apps-${app.slug}`,
  level: 0,
  sector: "Apps",
  label: app.name,
  description: app.description,
  path: `/apps/${app.slug}`,
  icon: Disc3,
  logoUrl: app.logoUrl,
  keywords: [app.slug, "apps", "integrations", "connect", "manage"],
  shortcut:
    index === 0
      ? {
          key: "i",
          primary: true,
          alt: true,
          shift: true,
          display: "⇧⌥⌘I",
        }
      : undefined,
}))

const settingsNestedByParent = new Map<string, QuickAction[]>(
  settingsNestedQuickActions.reduce<Array<[string, QuickAction[]]>>(
    (groups, action) => {
      if (!action.parentId) return groups
      const existing = groups.find(([groupKey]) => groupKey === action.parentId)
      if (existing) {
        existing[1].push(action)
      } else {
        groups.push([action.parentId, [action]])
      }
      return groups
    },
    []
  )
)

const orderedSettingsTreeActions = settingsSectionQuickActions.flatMap(
  (sectionAction) => [
    sectionAction,
    ...(settingsNestedByParent.get(sectionAction.id) ?? []),
  ]
)

const quickActions = [
  ...appQuickActions,
  ...dataQuickActions,
  ...chatQuickActions,
  ...projectQuickActions,
  userQuickActionRoots[0],
  ...userQuickActions,
  userQuickActionRoots[1],
  settingsRootAction,
  ...settingsSystemQuickActions,
  ...orderedSettingsTreeActions,
]

const pinnedQuickActions: Array<{ id: string; label: string }> = [
  { id: "settings-theme-toggle", label: "Toggle theme" },
  { id: "projects-new", label: "New project" },
  { id: "users-add", label: "Add user" },
  { id: "data-integrations", label: "Apps & integrations" },
  { id: "settings-section-billing", label: "Subscription" },
  { id: "projects-new-skill", label: "New skill" },
]

function matchesShortcut(event: KeyboardEvent, shortcut: QuickActionShortcut) {
  const key = event.key.toLowerCase()
  const hasPrimaryModifier = event.metaKey || event.ctrlKey

  if (key !== shortcut.key.toLowerCase()) return false
  if ((shortcut.primary ?? false) !== hasPrimaryModifier) return false
  if ((shortcut.alt ?? false) !== event.altKey) return false
  if ((shortcut.shift ?? false) !== event.shiftKey) return false

  return true
}

export function SearchForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter()
  const { resolvedTheme, setTheme } = useTheme()
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const actionMap = React.useMemo(
    () => new Map(quickActions.map((action) => [action.id, action])),
    []
  )
  const shortcutActions = React.useMemo(
    () => quickActions.filter((action) => Boolean(action.shortcut)),
    []
  )

  const getInitials = React.useCallback((name: string) => {
    return name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("")
  }, [])

  const filteredActions = React.useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return quickActions

    const matchedIds = new Set(
      quickActions
        .filter((action) => {
          const searchable = [
            action.label,
            action.description,
            action.sector,
            ...(action.keywords ?? []),
          ]
          return searchable.some((value) => value.toLowerCase().includes(term))
        })
        .map((action) => action.id)
    )

    const includedIds = new Set(matchedIds)

    for (const id of matchedIds) {
      let current = actionMap.get(id)
      while (current?.parentId) {
        includedIds.add(current.parentId)
        current = actionMap.get(current.parentId)
      }
    }

    return quickActions.filter((action) => includedIds.has(action.id))
  }, [actionMap, query])

  const pinnedActions = React.useMemo(() => {
    return pinnedQuickActions
      .map((pinned) => {
        const action = actionMap.get(pinned.id)
        if (!action) return null
        return {
          ...action,
          pinnedLabel: pinned.label,
        }
      })
      .filter((action): action is QuickAction & { pinnedLabel: string } => Boolean(action))
  }, [actionMap])
  const pinnedActionIds = React.useMemo(
    () => new Set(pinnedActions.map((action) => action.id)),
    [pinnedActions]
  )

  const runAction = React.useCallback(
    (action: QuickAction) => {
      const emitEvent = () => {
        if (!action.eventName) return
        window.dispatchEvent(
          new CustomEvent(action.eventName, { detail: action.eventDetail })
        )
      }

      setOpen(false)
      setQuery("")

      if (action.intent === "toggle-theme") {
        setTheme(resolvedTheme === "dark" ? "light" : "dark")
        return
      }

      if (action.path) {
        router.push(action.path)
        if (action.eventName) {
          window.setTimeout(emitEvent, 140)
        }
        return
      }

      emitEvent()
    },
    [resolvedTheme, router, setTheme]
  )

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setOpen(true)
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  React.useEffect(() => {
    const isEditableTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false
      const tag = target.tagName
      return (
        target.isContentEditable ||
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT"
      )
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (open) return
      if (isEditableTarget(event.target)) return

      for (const action of shortcutActions) {
        if (!action.shortcut) continue
        if (!matchesShortcut(event, action.shortcut)) continue
        event.preventDefault()
        runAction(action)
        break
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [open, runAction, shortcutActions])

  return (
    <div
      className={cn("relative", className)}
      data-quick-actions-scope="true"
      {...props}
    >
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="w-full justify-start border-sidebar-border bg-background hover:bg-muted dark:border-sidebar-border"
        aria-label="Open quick actions"
      >
        <HugeiconsIcon
          icon={Search01Icon}
          strokeWidth={1.5}
          className="size-4 shrink-0 text-muted-foreground"
        />
        <span className="truncate text-sm text-foreground/90">
          Search or run action...
        </span>
        <Kbd className="ms-auto">⌘K</Kbd>
      </Button>

      <CommandDialog
        data-quick-actions-scope="true"
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen)
          if (!nextOpen) {
            setQuery("")
          }
        }}
        showCloseButton={false}
        className="top-1/2 h-[min(74svh,680px)] max-h-[calc(100svh-1.5rem)] w-[min(860px,92vw)] max-w-[92vw] -translate-y-1/2 sm:!max-w-[860px]"
      >
        <Command className="**:data-[selected=true]:bg-muted **:data-selected:bg-transparent">
          <CommandInput
            placeholder="Search sectors, pages, and actions..."
            value={query}
            onValueChange={(next) => setQuery(next)}
          />
          <CommandList className="max-h-none flex-1">
            <CommandEmpty>No actions found.</CommandEmpty>
            {pinnedActions.length > 0 ? (
              <CommandGroup heading="Quick action">
                {pinnedActions.map((action) => (
                  <CommandItem
                    key={action.id}
                    value={`${action.pinnedLabel} ${action.label} ${action.description} ${(action.keywords ?? []).join(" ")}`}
                    onSelect={() => runAction(action)}
                    className="gap-2.5"
                  >
                    <action.icon className="size-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 truncate text-sm font-medium">{action.pinnedLabel}</span>
                    {action.shortcut ? (
                      <CommandShortcut>{action.shortcut.display}</CommandShortcut>
                    ) : null}
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}
            {sectors.map((sector) => {
              const groupActions = filteredActions.filter(
                (action) => action.sector === sector && !pinnedActionIds.has(action.id)
              )
              if (groupActions.length === 0) return null

              return (
                <CommandGroup key={sector} heading={sector}>
                  {groupActions.map((action) => (
                    <CommandItem
                      key={action.id}
                      value={`${action.label} ${action.description} ${action.sector} ${(action.keywords ?? []).join(" ")}`}
                      onSelect={() => runAction(action)}
                      className={cn(
                        "gap-2.5",
                        action.level === 1 && "pl-6",
                        action.level === 2 && "pl-10"
                      )}
                    >
                      {action.avatarUrl ? (
                        <Avatar size="sm" className="size-5">
                          <AvatarImage src={action.avatarUrl} alt={action.label} />
                          <AvatarFallback className="text-[10px] font-medium">
                            {getInitials(action.label)}
                          </AvatarFallback>
                        </Avatar>
                      ) : action.logoUrl ? (
                        <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-background">
                          <img
                            src={action.logoUrl}
                            alt={`${action.label} logo`}
                            className="h-3.5 w-3.5 object-contain"
                          />
                        </span>
                      ) : (
                        <action.icon className="size-4 shrink-0 text-muted-foreground" />
                      )}
                      <span className="min-w-0 truncate text-sm font-medium">
                        {action.label}
                      </span>
                      {action.shortcut ? (
                        <CommandShortcut>{action.shortcut.display}</CommandShortcut>
                      ) : null}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )
            })}
          </CommandList>
          <CommandSeparator />
          <div className="flex flex-wrap items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Kbd>↑</Kbd>
              <Kbd>↓</Kbd>
              Navigate
            </span>
            <span className="inline-flex items-center gap-1">
              <Kbd>Enter</Kbd>
              Open
            </span>
            <span className="inline-flex items-center gap-1">
              <Kbd>Esc</Kbd>
              Close
            </span>
            <span className="inline-flex items-center gap-1">
              <Kbd>⌘K</Kbd>
              Toggle
            </span>
          </div>
        </Command>
      </CommandDialog>
    </div>
  )
}
