"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { SearchForm } from "@/components/search-form"
import {
  VersionSwitcher,
  type WorkspaceSwitcherItem,
} from "@/components/version-switcher"
import { BarInteractive } from "@/components/charts/bar-interactive"
import { ChartBarPattern } from "@/components/examples/c-chart-5"
import { Pattern as EmptyIntegrationsPattern } from "@/components/examples/c-empty-19"
import { ColorSelector } from "@/components/color-selector"
import { Badge, type BadgeVariant } from "@/registry/spell-ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarMenuAction,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  WorkflowCircle01Icon,
} from "@hugeicons/core-free-icons"
import {
  IconApps,
  IconBell,
  IconBuilding,
  IconCalendar,
  IconChartBar,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconChevronUp,
  IconCopy,
  IconCreditCard,
  IconDatabase,
  IconDownload,
  IconDots,
  IconFileText,
  IconHelpCircle,
  IconKey,
  IconLayoutDashboard,
  IconListDetails,
  IconLock,
  IconLogout2,
  IconMoon,
  IconPlus,
  IconPlug,
  IconSearch,
  IconSettings,
  IconShield,
  IconShieldCheck,
  IconSun,
  IconTools,
  IconUser,
  IconUserPlus,
  IconUsers,
  IconX,
} from "@tabler/icons-react"
import { useTheme } from "next-themes"
import {
  Briefcase,
  Camera,
  Check,
  Clock3,
  Copy,
  Gift,
  Globe2,
  Hash,
  KeyRound,
  Languages,
  Mail,
  MessageSquare,
  Monitor,
  MoreHorizontal,
  Palette,
  PenLine,
  Phone,
  Pin,
  PinOff,
  Plus,
  RefreshCw,
  Search,
  Share2,
  SlidersHorizontal,
  Trash2,
  User,
  UserPlus,
} from "lucide-react"

const navItems = [
  {
    title: "Build Project",
    url: "/ai-core",
    iconType: "tabler" as const,
    icon: IconPlus,
  },
  {
    title: "Workflows",
    url: "/workflow",
    iconType: "hugeicons" as const,
    icon: WorkflowCircle01Icon,
  },
  {
    title: "Skills",
    url: "/skills",
    iconType: "tabler" as const,
    icon: IconTools,
  },
  {
    title: "Apps",
    url: "/integrations",
    iconType: "tabler" as const,
    icon: IconApps,
  },
]
const baseSettingsSections = [
  "Account",
  "Workspace",
  "General",
  "Notifications",
  "Members",
  "Integrations",
  "Usage and limits",
  "Data controls",
  "Refer and earn",
  "Billing",
  "Help Docs",
  "Contact Support",
] as const
const settingsSections = baseSettingsSections
type SettingsSection = (typeof settingsSections)[number]
const adminConsoleGroups = [
  {
    label: "Overview",
    sections: ["Admin overview", "Workspace provisioning"],
  },
  {
    label: "Users & workspaces",
    sections: ["Users & workspaces", "Roles & permissions", "Access policies"],
  },
  {
    label: "Logs",
    sections: ["Usage & limits"],
  },
] as const
type AdminConsoleGroup = (typeof adminConsoleGroups)[number]
type AdminConsoleSection = AdminConsoleGroup["sections"][number]
const currentUser = {
  name: "Amir Haddad",
  role: "Operations Manager",
  initials: "AH",
}
const accountProfile = {
  firstName: "Amir",
  lastName: "Haddad",
  email: "amir.haddad@atmet.ai",
  phoneNumber: "+962 7 9000 1234",
  role: "Operations Manager",
  userId: "usr_8f29ab01c7",
  avatarUrl:
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80",
}
type WorkspaceProfile = WorkspaceSwitcherItem & {
  primaryEmail: string
  description: string
  country: string
}

const workspaceCountries = [
  "Jordan",
  "United Arab Emirates",
  "Saudi Arabia",
  "United States",
  "United Kingdom",
  "Germany",
  "France",
  "Canada",
  "Australia",
  "Singapore",
] as const

const initialWorkspaces: WorkspaceProfile[] = [
  {
    id: "documentation",
    name: "Documentation",
    primaryEmail: "workspace@atmet.ai",
    description:
      "Main workspace for collaboration, automations, and shared project operations.",
    country: "Jordan",
    avatarUrl:
      "https://images.unsplash.com/photo-1556155092-490a1ba16284?auto=format&fit=crop&w=256&q=80",
    initials: "D",
    bgClass: "bg-sky-500/20",
    textClass: "text-sky-700 dark:text-sky-300",
  },
  {
    id: "product",
    name: "Product",
    primaryEmail: "product@atmet.ai",
    description:
      "Plans releases, collects product feedback, and prioritizes roadmap delivery.",
    country: "United Arab Emirates",
    avatarUrl: null,
    initials: "P",
    bgClass: "bg-indigo-500/20",
    textClass: "text-indigo-700 dark:text-indigo-300",
  },
  {
    id: "operations",
    name: "Operations",
    primaryEmail: "operations@atmet.ai",
    description:
      "Runs operations playbooks, support workflows, and internal service quality.",
    country: "Jordan",
    avatarUrl: null,
    initials: "O",
    bgClass: "bg-emerald-500/20",
    textClass: "text-emerald-700 dark:text-emerald-300",
  },
  {
    id: "marketing",
    name: "Marketing",
    primaryEmail: "marketing@atmet.ai",
    description:
      "Owns campaign planning, brand assets, and performance reporting pipelines.",
    country: "United States",
    avatarUrl: null,
    initials: "M",
    bgClass: "bg-amber-500/20",
    textClass: "text-amber-700 dark:text-amber-300",
  },
]

function deriveInitialsFromName(name: string) {
  const tokens = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)

  if (tokens.length === 0) return "W"
  return tokens.map((token) => token[0]?.toUpperCase() ?? "").join("")
}

type WorkspaceMemberApp = {
  name: string
  category: string
  status: "Connected" | "Disconnected"
  connectedAt: string
  lastUsed: string
}

type PlatformRole =
  | "Super Admin"
  | "Admin"
  | "Workspace Admin"
  | "Workspace Member"

const platformRoles: readonly PlatformRole[] = [
  "Super Admin",
  "Admin",
  "Workspace Admin",
  "Workspace Member",
]

type WorkspaceMember = {
  id: string
  name: string
  email: string
  role: PlatformRole
  profileRole: string
  lastLogin: string
  initials: string
  avatarUrl: string
  creditsUsage: {
    allTime: number
    thisMonth: number
    thisWeek: number
  }
  integratedApps: WorkspaceMemberApp[]
}

const workspaceMembers: WorkspaceMember[] = [
  {
    id: "mem_001",
    name: "Amir Haddad",
    email: "amir.haddad@atmet.ai",
    role: "Super Admin",
    profileRole: "Operations Manager",
    lastLogin: "Today, 10:42 AM",
    initials: "AH",
    avatarUrl:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80",
    creditsUsage: {
      allTime: 24860,
      thisMonth: 3120,
      thisWeek: 820,
    },
    integratedApps: [
      {
        name: "Slack",
        category: "Communication",
        status: "Connected",
        connectedAt: "Feb 11, 2026",
        lastUsed: "Today",
      },
      {
        name: "Google Drive",
        category: "Storage",
        status: "Connected",
        connectedAt: "Jan 22, 2026",
        lastUsed: "Yesterday",
      },
      {
        name: "Notion",
        category: "Productivity",
        status: "Disconnected",
        connectedAt: "Dec 04, 2025",
        lastUsed: "Mar 01, 2026",
      },
    ],
  },
  {
    id: "mem_002",
    name: "Lina Saad",
    email: "lina.saad@atmet.ai",
    role: "Admin",
    profileRole: "Product Lead",
    lastLogin: "Today, 09:15 AM",
    initials: "LS",
    avatarUrl:
      "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=120&q=80",
    creditsUsage: {
      allTime: 19140,
      thisMonth: 2710,
      thisWeek: 640,
    },
    integratedApps: [
      {
        name: "Linear",
        category: "Project management",
        status: "Connected",
        connectedAt: "Feb 02, 2026",
        lastUsed: "Today",
      },
      {
        name: "GitHub",
        category: "Engineering",
        status: "Connected",
        connectedAt: "Jan 18, 2026",
        lastUsed: "Today",
      },
    ],
  },
  {
    id: "mem_003",
    name: "Omar Khaled",
    email: "omar.khaled@atmet.ai",
    role: "Workspace Admin",
    profileRole: "Operations Specialist",
    lastLogin: "Yesterday, 07:40 PM",
    initials: "OK",
    avatarUrl:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80",
    creditsUsage: {
      allTime: 12870,
      thisMonth: 1840,
      thisWeek: 410,
    },
    integratedApps: [
      {
        name: "Asana",
        category: "Task tracking",
        status: "Connected",
        connectedAt: "Mar 03, 2026",
        lastUsed: "Yesterday",
      },
      {
        name: "Zendesk",
        category: "Support",
        status: "Disconnected",
        connectedAt: "Jan 07, 2026",
        lastUsed: "Feb 28, 2026",
      },
    ],
  },
  {
    id: "mem_004",
    name: "Yara Nasser",
    email: "yara.nasser@atmet.ai",
    role: "Workspace Member",
    profileRole: "Marketing Specialist",
    lastLogin: "Yesterday, 11:05 AM",
    initials: "YN",
    avatarUrl:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=120&q=80",
    creditsUsage: {
      allTime: 10390,
      thisMonth: 1390,
      thisWeek: 350,
    },
    integratedApps: [
      {
        name: "HubSpot",
        category: "CRM",
        status: "Connected",
        connectedAt: "Feb 16, 2026",
        lastUsed: "Yesterday",
      },
      {
        name: "Canva",
        category: "Design",
        status: "Connected",
        connectedAt: "Jan 27, 2026",
        lastUsed: "Today",
      },
    ],
  },
  {
    id: "mem_005",
    name: "Fadi Mourad",
    email: "fadi.mourad@atmet.ai",
    role: "Workspace Admin",
    profileRole: "Engineering Manager",
    lastLogin: "Mar 24, 2026",
    initials: "FM",
    avatarUrl:
      "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?auto=format&fit=crop&w=120&q=80",
    creditsUsage: {
      allTime: 22440,
      thisMonth: 2920,
      thisWeek: 560,
    },
    integratedApps: [
      {
        name: "GitLab",
        category: "Engineering",
        status: "Connected",
        connectedAt: "Dec 12, 2025",
        lastUsed: "Mar 24, 2026",
      },
      {
        name: "Datadog",
        category: "Monitoring",
        status: "Connected",
        connectedAt: "Jan 30, 2026",
        lastUsed: "Mar 23, 2026",
      },
      {
        name: "Sentry",
        category: "Monitoring",
        status: "Disconnected",
        connectedAt: "Nov 09, 2025",
        lastUsed: "Feb 05, 2026",
      },
    ],
  },
]

const settingsContent: Record<SettingsSection, string[]> = {
  Account: ["Profile details", "Email and login", "Security"],
  Notifications: [
    "Email notifications",
    "Push notifications",
    "Digest frequency",
  ],
  General: ["Theme and colors", "Font size", "Time zone", "Language"],
  Workspace: ["Workspace name", "Default workflow", "Country"],
  Members: ["Members", "Roles and permissions", "Invites"],
  Integrations: ["Workspace apps", "Member access", "Enforcement policy"],
  "Usage and limits": ["Usage summary", "Rate limits", "Quota alerts"],
  "Data controls": ["Retention policy", "Data export", "Delete requests"],
  "Refer and earn": ["Referral link", "Rewards", "Payout value"],
  Billing: ["Payment methods", "Invoices", "Billing history"],
  "Help Docs": ["Help center", "Guides", "API references"],
  "Contact Support": ["Support contact", "Live chat", "Report a bug"],
}

const settingsSectionIcons: Record<
  SettingsSection,
  React.ComponentType<{ className?: string }>
> = {
  Account: IconUser,
  Notifications: IconBell,
  General: Monitor,
  Workspace: IconBuilding,
  Members: IconUsers,
  Integrations: IconApps,
  "Usage and limits": IconChartBar,
  "Data controls": IconShield,
  "Refer and earn": Gift,
  Billing: IconCreditCard,
  "Help Docs": IconFileText,
  "Contact Support": IconHelpCircle,
}

const adminConsoleSectionIcons: Record<
  AdminConsoleSection,
  React.ComponentType<{ className?: string }>
> = {
  "Admin overview": IconLayoutDashboard,
  "Workspace provisioning": IconBuilding,
  "Users & workspaces": IconUsers,
  "Roles & permissions": IconShield,
  "Access policies": IconLock,
  "Usage & limits": IconChartBar,
}

const adminConsoleDescriptions: Record<AdminConsoleSection, string> = {
  "Admin overview":
    "Monitor workspace health, recent activity, and common admin actions.",
  "Workspace provisioning":
    "Create workspaces, assign initial users, and configure access, API, and usage defaults.",
  "Users & workspaces":
    "Manage users, workspace assignments, invitations, roles, and account status.",
  "Roles & permissions":
    "Review role capabilities and adjust editable workspace permissions.",
  "Access policies":
    "Configure authentication, domain, session, and network access rules.",
  "Usage & limits":
    "Track usage by resource and member, then adjust workspace limits.",
}
const usageRangeStats = {
  "This week": {
    creditsUsed: 1820,
    creditsLimit: 5000,
    apiRequests: 124000,
    apiLimit: 300000,
    storageUsedGb: 38,
    storageLimitGb: 120,
    automationsActive: 29,
    automationsLimit: 60,
  },
  "This month": {
    creditsUsed: 7420,
    creditsLimit: 20000,
    apiRequests: 486000,
    apiLimit: 1200000,
    storageUsedGb: 42,
    storageLimitGb: 120,
    automationsActive: 31,
    automationsLimit: 60,
  },
  "All time": {
    creditsUsed: 52840,
    creditsLimit: 120000,
    apiRequests: 2860000,
    apiLimit: 5000000,
    storageUsedGb: 57,
    storageLimitGb: 120,
    automationsActive: 33,
    automationsLimit: 60,
  },
} as const
const usageLimitsRows = [
  {
    key: "credits",
    label: "Credits",
    limitKey: "creditsLimit" as const,
    usedKey: "creditsUsed" as const,
    unit: "",
  },
  {
    key: "requests",
    label: "API requests",
    limitKey: "apiLimit" as const,
    usedKey: "apiRequests" as const,
    unit: "",
  },
  {
    key: "storage",
    label: "Storage",
    limitKey: "storageLimitGb" as const,
    usedKey: "storageUsedGb" as const,
    unit: "GB",
  },
  {
    key: "automations",
    label: "Active automations",
    limitKey: "automationsLimit" as const,
    usedKey: "automationsActive" as const,
    unit: "",
  },
] as const

type StoredChatItem = {
  id: string
  title: string
  updatedAt: number
  pinned?: boolean
  path?: string
}

const AI_CORE_CHATS_STORAGE_KEY = "ai-core-chats"
const AI_CORE_CHATS_UPDATED_EVENT = "ai-core-chats-updated"
const OPEN_SETTINGS_PANEL_EVENT = "open-settings-panel"

type OpenSettingsPanelDetail = {
  section?: SettingsSection
  memberId?: string
  memberQuery?: string
  membersAction?: "invite"
  returnToAdminSection?: AdminConsoleSection
}

const INITIAL_VISIBLE_CHATS = 4
const CHAT_LOAD_STEP = 10
const APPEARANCE_SETTINGS_STORAGE_KEY = "atmet-appearance-settings"
const PERSONALIZATION_SETTINGS_STORAGE_KEY = "atmet-personalization-settings"
const HELP_DOCS_EXTERNAL_URL = "https://atmet.ai/help-docs"
const CHANALOGE_EXTERNAL_URL = "https://chanaloge.com"
const BILLING_PORTAL_EXTERNAL_URL = "#"
const appearanceColorOptions = [
  {
    id: "graphite",
    label: "Graphite",
    primary: "#111111",
    primaryForeground: "#ffffff",
    border: "rgb(23 23 23 / 16%)",
    input: "rgb(23 23 23 / 18%)",
    ring: "rgb(23 23 23 / 30%)",
  },
  {
    id: "cobalt",
    label: "Cobalt",
    primary: "#1e90ff",
    primaryForeground: "#ffffff",
    border: "rgb(30 144 255 / 22%)",
    input: "rgb(30 144 255 / 22%)",
    ring: "rgb(30 144 255 / 36%)",
  },
  {
    id: "emerald",
    label: "Emerald",
    primary: "#059669",
    primaryForeground: "#ffffff",
    border: "rgb(5 150 105 / 22%)",
    input: "rgb(5 150 105 / 22%)",
    ring: "rgb(5 150 105 / 36%)",
  },
  {
    id: "violet",
    label: "Violet",
    primary: "#7c3aed",
    primaryForeground: "#ffffff",
    border: "rgb(124 58 237 / 22%)",
    input: "rgb(124 58 237 / 22%)",
    ring: "rgb(124 58 237 / 36%)",
  },
  {
    id: "rose",
    label: "Rose",
    primary: "#e11d48",
    primaryForeground: "#ffffff",
    border: "rgb(225 29 72 / 22%)",
    input: "rgb(225 29 72 / 22%)",
    ring: "rgb(225 29 72 / 36%)",
  },
  {
    id: "amber",
    label: "Amber",
    primary: "#d97706",
    primaryForeground: "#ffffff",
    border: "rgb(217 119 6 / 22%)",
    input: "rgb(217 119 6 / 22%)",
    ring: "rgb(217 119 6 / 36%)",
  },
  {
    id: "cyan",
    label: "Cyan",
    primary: "#0891b2",
    primaryForeground: "#ffffff",
    border: "rgb(8 145 178 / 22%)",
    input: "rgb(8 145 178 / 22%)",
    ring: "rgb(8 145 178 / 36%)",
  },
  {
    id: "teal",
    label: "Teal",
    primary: "#0f766e",
    primaryForeground: "#ffffff",
    border: "rgb(15 118 110 / 22%)",
    input: "rgb(15 118 110 / 22%)",
    ring: "rgb(15 118 110 / 36%)",
  },
  {
    id: "slate",
    label: "Slate",
    primary: "#334155",
    primaryForeground: "#ffffff",
    border: "rgb(51 65 85 / 22%)",
    input: "rgb(51 65 85 / 22%)",
    ring: "rgb(51 65 85 / 36%)",
  },
] as const

type AppearanceTheme = "light" | "dark" | "system"
type AppearanceColorId = (typeof appearanceColorOptions)[number]["id"]
type FontScale = "smaller" | "default" | "bigger"
type AppearanceSettings = {
  theme: AppearanceTheme
  colorId: AppearanceColorId
  timezone: string
  language: string
  fontScale: FontScale
}

function applyAppearanceColor(colorId: AppearanceColorId) {
  if (typeof document === "undefined") return
  const targetColor =
    appearanceColorOptions.find((option) => option.id === colorId) ??
    appearanceColorOptions[1]
  const root = document.documentElement

  root.style.setProperty("--primary", targetColor.primary)
  root.style.setProperty("--primary-foreground", targetColor.primaryForeground)
  root.style.setProperty("--sidebar-primary", targetColor.primary)
  root.style.setProperty(
    "--sidebar-primary-foreground",
    targetColor.primaryForeground
  )
  root.style.setProperty("--sidebar-ring", targetColor.ring)
  root.style.setProperty("--ring", targetColor.primary)
  root.style.removeProperty("--accent")
  root.style.removeProperty("--border")
  root.style.removeProperty("--input")
  root.style.removeProperty("--sidebar-border")
}

function applyGlobalFontScale(fontScale: FontScale) {
  if (typeof document === "undefined") return
  const root = document.documentElement
  if (fontScale === "smaller") {
    root.style.fontSize = "15px"
    return
  }
  if (fontScale === "bigger") {
    root.style.fontSize = "17px"
    return
  }
  root.style.fontSize = ""
}

function AccountSettingsContent() {
  const roleOptions = [
    "Operations Manager",
    "Product Manager",
    "Software Engineer",
    "Designer",
    "Marketing Manager",
    "Other",
  ] as const
  const [savedProfile, setSavedProfile] = React.useState({
    firstName: accountProfile.firstName,
    lastName: accountProfile.lastName,
    email: accountProfile.email,
    phoneNumber: accountProfile.phoneNumber,
    selectedRole: accountProfile.role as (typeof roleOptions)[number] | string,
    customRole: "",
  })
  const [firstName, setFirstName] = React.useState(accountProfile.firstName)
  const [lastName, setLastName] = React.useState(accountProfile.lastName)
  const [email, setEmail] = React.useState(accountProfile.email)
  const [phoneNumber, setPhoneNumber] = React.useState(
    accountProfile.phoneNumber
  )
  const [selectedRole, setSelectedRole] = React.useState<
    (typeof roleOptions)[number] | string
  >(accountProfile.role)
  const [customRole, setCustomRole] = React.useState("")
  const displayedRole =
    selectedRole === "Other" ? customRole || "Other" : selectedRole
  const hasUnsavedChanges =
    firstName !== savedProfile.firstName ||
    lastName !== savedProfile.lastName ||
    email !== savedProfile.email ||
    phoneNumber !== savedProfile.phoneNumber ||
    selectedRole !== savedProfile.selectedRole ||
    customRole !== savedProfile.customRole

  return (
    <div className="flex min-h-full flex-col">
      <div className="space-y-6">
        <div className="flex items-center gap-2.5">
          <DropdownMenu>
            <div className="group/avatar-edit relative">
              <Avatar className="size-14 !rounded-lg ring-1 ring-border after:!rounded-lg">
                <AvatarImage
                  src={accountProfile.avatarUrl}
                  alt={`${accountProfile.firstName} avatar`}
                  className="!rounded-lg"
                />
                <AvatarFallback className="!rounded-lg text-sm font-semibold">
                  {currentUser.initials}
                </AvatarFallback>
              </Avatar>
              <span className="pointer-events-none absolute inset-0 rounded-lg bg-background/20 opacity-0 backdrop-blur-sm transition-opacity duration-200 group-focus-within/avatar-edit:opacity-100 group-hover/avatar-edit:opacity-100" />
              <DropdownMenuTrigger
                render={
                  <button
                    type="button"
                    className="absolute inset-0 z-10 flex cursor-pointer items-center justify-center rounded-lg opacity-0 transition-opacity duration-200 group-focus-within/avatar-edit:opacity-100 group-hover/avatar-edit:opacity-100"
                    aria-label="Edit profile image"
                  />
                }
              >
                <span className="inline-flex size-8 items-center justify-center rounded-lg border border-border/70 bg-background/90 shadow-xs">
                  <PenLine className="h-3.5 w-3.5" />
                </span>
              </DropdownMenuTrigger>
            </div>
            <DropdownMenuContent
              align="start"
              className="min-w-44 rounded-lg p-1"
            >
              <DropdownMenuItem>
                <Camera className="h-3.5 w-3.5" />
                Upload image
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive">
                <Trash2 className="h-3.5 w-3.5" />
                Delete image
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="space-y-0.5 leading-tight">
            <p className="text-sm font-medium text-foreground">
              {firstName} {lastName}
            </p>
            <p className="text-sm text-muted-foreground">{displayedRole}</p>
          </div>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label
              className="text-muted-foreground"
              htmlFor="settings-first-name"
            >
              <User className="h-3.5 w-3.5 text-muted-foreground/80" />
              First name
            </Label>
            <Input
              id="settings-first-name"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              placeholder="Enter your first name"
              className="h-7"
            />
          </div>
          <div className="space-y-1.5">
            <Label
              className="text-muted-foreground"
              htmlFor="settings-last-name"
            >
              <User className="h-3.5 w-3.5 text-muted-foreground/80" />
              Last name
            </Label>
            <Input
              id="settings-last-name"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              placeholder="Enter your last name"
              className="h-7"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-muted-foreground" htmlFor="settings-email">
              <Mail className="h-3.5 w-3.5 text-muted-foreground/80" />
              Email
            </Label>
            <Input
              id="settings-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@company.com"
              className="h-7"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-muted-foreground" htmlFor="settings-phone">
              <Phone className="h-3.5 w-3.5 text-muted-foreground/80" />
              Phone number
            </Label>
            <Input
              id="settings-phone"
              type="tel"
              value={phoneNumber}
              onChange={(event) => setPhoneNumber(event.target.value)}
              placeholder="+1 (555) 000-0000"
              className="h-7"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-muted-foreground" htmlFor="settings-role">
              <Briefcase className="h-3.5 w-3.5 text-muted-foreground/80" />
              Role
            </Label>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    id="settings-role"
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 w-full justify-between rounded-lg border-input bg-transparent px-2.5 text-sm font-normal"
                  />
                }
              >
                <span>{selectedRole}</span>
                <IconChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="min-w-56 rounded-lg p-1"
              >
                {roleOptions.map((role) => (
                  <DropdownMenuItem
                    key={role}
                    onClick={() => {
                      setSelectedRole(role)
                      if (role !== "Other") setCustomRole("")
                    }}
                  >
                    {role}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            {selectedRole === "Other" && (
              <Input
                id="settings-custom-role"
                value={customRole}
                onChange={(event) => setCustomRole(event.target.value)}
                placeholder="Type your role"
                className="h-7"
              />
            )}
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-muted-foreground" htmlFor="settings-user-id">
              <Hash className="h-3.5 w-3.5 text-muted-foreground/80" />
              User ID
            </Label>
            <div className="flex items-center gap-2">
              <p
                id="settings-user-id"
                className="font-mono text-sm text-foreground"
              >
                {accountProfile.userId}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label="Copy user ID"
                onClick={() =>
                  void navigator.clipboard.writeText(accountProfile.userId)
                }
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2 pt-5 pb-1">
        <section>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-foreground">Password</p>
              <p className="text-sm text-muted-foreground">
                Update your password to keep your account secure.
              </p>
            </div>
            <Button type="button" variant="outline" size="sm">
              <Mail className="h-3.5 w-3.5" />
              Send a link
            </Button>
          </div>
        </section>

        <section>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-destructive">
                Danger Zone
              </p>
              <p className="text-sm text-muted-foreground">
                Permanently delete your account and all associated workspaces.
              </p>
            </div>
            <Button type="button" variant="destructive" size="sm">
              <Trash2 className="h-3.5 w-3.5" />
              Delete my account
            </Button>
          </div>
        </section>
      </div>
      <div className="mt-auto flex justify-end pt-5 pb-1">
        <Button
          type="button"
          size="sm"
          disabled={!hasUnsavedChanges}
          onClick={() =>
            setSavedProfile({
              firstName,
              lastName,
              email,
              phoneNumber,
              selectedRole,
              customRole,
            })
          }
        >
          <Check className="h-3.5 w-3.5" />
          Save
        </Button>
      </div>
    </div>
  )
}

function PersonalizationSettingsContent() {
  const initialAnswers = React.useMemo(
    () => ({
      aboutMe: "",
      communicationStyle: "",
      preferences: "",
    }),
    []
  )
  const [savedAnswers, setSavedAnswers] = React.useState(initialAnswers)
  const [answers, setAnswers] = React.useState(initialAnswers)

  React.useEffect(() => {
    try {
      const rawSettings = window.localStorage.getItem(
        PERSONALIZATION_SETTINGS_STORAGE_KEY
      )
      if (!rawSettings) return
      const parsed = JSON.parse(rawSettings) as Partial<typeof initialAnswers>
      const nextAnswers = {
        aboutMe:
          typeof parsed.aboutMe === "string" ? parsed.aboutMe : initialAnswers.aboutMe,
        communicationStyle:
          typeof parsed.communicationStyle === "string"
            ? parsed.communicationStyle
            : initialAnswers.communicationStyle,
        preferences:
          typeof parsed.preferences === "string"
            ? parsed.preferences
            : initialAnswers.preferences,
      }
      setSavedAnswers(nextAnswers)
      setAnswers(nextAnswers)
    } catch {}
  }, [initialAnswers])

  const hasUnsavedChanges =
    answers.aboutMe !== savedAnswers.aboutMe ||
    answers.communicationStyle !== savedAnswers.communicationStyle ||
    answers.preferences !== savedAnswers.preferences

  return (
    <div className="space-y-3 pb-1">
      <section className="space-y-0.5">
        <p className="text-sm font-semibold text-foreground">Personalization</p>
        <p className="text-sm text-muted-foreground">
          Add saved answers about yourself so the assistant can personalize your
          experience.
        </p>
      </section>

      <section className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="personalization-about-me">About me</Label>
          <Textarea
            id="personalization-about-me"
            value={answers.aboutMe}
            onChange={(event) =>
              setAnswers((previous) => ({
                ...previous,
                aboutMe: event.target.value,
              }))
            }
            placeholder="Write a short summary about yourself."
            className="min-h-[90px]"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="personalization-communication-style">
            Preferred communication style
          </Label>
          <Textarea
            id="personalization-communication-style"
            value={answers.communicationStyle}
            onChange={(event) =>
              setAnswers((previous) => ({
                ...previous,
                communicationStyle: event.target.value,
              }))
            }
            placeholder="Example: concise answers, Arabic + English mixed, include examples."
            className="min-h-[90px]"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="personalization-preferences">My preferences</Label>
          <Textarea
            id="personalization-preferences"
            value={answers.preferences}
            onChange={(event) =>
              setAnswers((previous) => ({
                ...previous,
                preferences: event.target.value,
              }))
            }
            placeholder="Anything the assistant should remember for better help."
            className="min-h-[90px]"
          />
        </div>
      </section>

      <div className="flex justify-end">
        <Button
          type="button"
          size="sm"
          disabled={!hasUnsavedChanges}
          onClick={() => {
            setSavedAnswers(answers)
            window.localStorage.setItem(
              PERSONALIZATION_SETTINGS_STORAGE_KEY,
              JSON.stringify(answers)
            )
          }}
        >
          <Check className="h-3.5 w-3.5" />
          Save
        </Button>
      </div>
    </div>
  )
}

function NotificationSettingsContent() {
  const digestOptions = [
    "Real-time",
    "Daily digest",
    "Weekly digest",
    "Off",
  ] as const
  const notificationCategories = [
    {
      key: "security",
      label: "Security alerts",
      icon: KeyRound,
    },
    {
      key: "product",
      label: "Product updates",
      icon: Briefcase,
    },
    {
      key: "tips",
      label: "Tips and recommendations",
      icon: IconBell,
    },
  ] as const

  const defaultSettings = {
    categoryChannels: {
      security: { email: true, inApp: true },
      product: { email: true, inApp: true },
      tips: { email: false, inApp: false },
    },
    digest: "Daily digest" as (typeof digestOptions)[number],
    quietHours: false,
    quietFrom: "22:00",
    quietTo: "07:00",
  }

  const [notificationSettings, setNotificationSettings] =
    React.useState(defaultSettings)
  const [savedNotificationSettings, setSavedNotificationSettings] =
    React.useState(defaultSettings)
  const categoryChannels =
    notificationSettings.categoryChannels ?? defaultSettings.categoryChannels
  const savedCategoryChannels =
    savedNotificationSettings.categoryChannels ??
    defaultSettings.categoryChannels

  const hasUnsavedChanges =
    JSON.stringify(categoryChannels) !==
      JSON.stringify(savedCategoryChannels) ||
    notificationSettings.digest !== savedNotificationSettings.digest ||
    notificationSettings.quietHours !== savedNotificationSettings.quietHours ||
    notificationSettings.quietFrom !== savedNotificationSettings.quietFrom ||
    notificationSettings.quietTo !== savedNotificationSettings.quietTo

  return (
    <div className="flex min-h-full flex-col">
      <div className="space-y-3">
        <section className="space-y-1.5">
          <p className="text-sm font-medium text-foreground">Notify me about</p>
          <div className="space-y-2">
            {notificationCategories.map((category) => {
              const CategoryIcon = category.icon
              return (
                <div
                  key={category.key}
                  className="rounded-lg border border-input bg-transparent px-2.5 py-2"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                      <CategoryIcon className="h-3.5 w-3.5 text-muted-foreground/80" />
                      <p className="text-sm font-medium text-foreground">
                        {category.label}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={
                            categoryChannels[category.key]?.email ?? false
                          }
                          onChange={(event) =>
                            setNotificationSettings((prev) => ({
                              ...prev,
                              categoryChannels: {
                                ...(prev.categoryChannels ??
                                  defaultSettings.categoryChannels),
                                [category.key]: {
                                  ...(prev.categoryChannels ??
                                    defaultSettings.categoryChannels)[
                                    category.key
                                  ],
                                  email: event.target.checked,
                                },
                              },
                            }))
                          }
                          className="size-3.5 rounded border-input accent-primary"
                        />
                        <Mail className="h-3.5 w-3.5 text-muted-foreground/80" />
                        Email
                      </label>
                      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={
                            categoryChannels[category.key]?.inApp ?? false
                          }
                          onChange={(event) =>
                            setNotificationSettings((prev) => ({
                              ...prev,
                              categoryChannels: {
                                ...(prev.categoryChannels ??
                                  defaultSettings.categoryChannels),
                                [category.key]: {
                                  ...(prev.categoryChannels ??
                                    defaultSettings.categoryChannels)[
                                    category.key
                                  ],
                                  inApp: event.target.checked,
                                },
                              },
                            }))
                          }
                          className="size-3.5 rounded border-input accent-primary"
                        />
                        <IconBell className="h-3.5 w-3.5 text-muted-foreground/80" />
                        In-app
                      </label>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <div className="space-y-1.5">
          <Label
            className="text-muted-foreground"
            htmlFor="settings-digest-frequency"
          >
            <IconBell className="h-3.5 w-3.5 text-muted-foreground/80" />
            Digest frequency
          </Label>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  id="settings-digest-frequency"
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 w-full justify-between rounded-lg border-input bg-transparent px-2.5 text-sm font-normal"
                />
              }
            >
              <span>{notificationSettings.digest}</span>
              <IconChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="min-w-56 rounded-lg p-1"
            >
              {digestOptions.map((digest) => (
                <DropdownMenuItem
                  key={digest}
                  onClick={() =>
                    setNotificationSettings((prev) => ({
                      ...prev,
                      digest,
                    }))
                  }
                >
                  {digest}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="space-y-2 pt-5 pb-1">
        <section>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                <input
                  type="checkbox"
                  checked={notificationSettings.quietHours}
                  onChange={(event) =>
                    setNotificationSettings((prev) => ({
                      ...prev,
                      quietHours: event.target.checked,
                    }))
                  }
                  className="size-3.5 rounded border-input accent-primary"
                />
                Quiet hours
              </label>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="time"
                value={notificationSettings.quietFrom}
                onChange={(event) =>
                  setNotificationSettings((prev) => ({
                    ...prev,
                    quietFrom: event.target.value,
                  }))
                }
                disabled={!notificationSettings.quietHours}
                className="h-7 w-28"
              />
              <span className="text-sm text-muted-foreground">to</span>
              <Input
                type="time"
                value={notificationSettings.quietTo}
                onChange={(event) =>
                  setNotificationSettings((prev) => ({
                    ...prev,
                    quietTo: event.target.value,
                  }))
                }
                disabled={!notificationSettings.quietHours}
                className="h-7 w-28"
              />
            </div>
          </div>
        </section>
      </div>
      <div className="mt-auto flex justify-end pt-5 pb-1">
        <Button
          type="button"
          size="sm"
          disabled={!hasUnsavedChanges}
          onClick={() =>
            setSavedNotificationSettings({
              ...notificationSettings,
              categoryChannels,
            })
          }
        >
          <Check className="h-3.5 w-3.5" />
          Save
        </Button>
      </div>
    </div>
  )
}

function GeneralSettingsContent({
  currentTheme,
  setTheme,
  onUnsavedChangesChange,
}: {
  currentTheme?: string
  setTheme: (theme: string) => void
  onUnsavedChangesChange?: (hasUnsavedChanges: boolean) => void
}) {
  const inferredTimezone = React.useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
    } catch {
      return "UTC"
    }
  }, [])
  const timezoneOptions = React.useMemo(() => {
    const base = [
      "Asia/Amman",
      "Asia/Dubai",
      "Asia/Riyadh",
      "Europe/London",
      "UTC",
      "America/New_York",
      "America/Los_Angeles",
      "Asia/Tokyo",
    ]
    return base.includes(inferredTimezone) ? base : [inferredTimezone, ...base]
  }, [inferredTimezone])
  const languageOptions = [
    "English",
    "Arabic",
    "French",
    "Spanish",
    "German",
    "Japanese",
  ] as const
  const initializedRef = React.useRef(false)
  const [appearanceSettings, setAppearanceSettings] =
    React.useState<AppearanceSettings>({
      theme: "system",
      colorId: "cobalt",
      timezone: inferredTimezone,
      language: "English",
      fontScale: "default",
    })
  const [savedAppearanceSettings, setSavedAppearanceSettings] =
    React.useState<AppearanceSettings>({
      theme: "system",
      colorId: "cobalt",
      timezone: inferredTimezone,
      language: "English",
      fontScale: "default",
    })

  React.useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    const fallbackTheme: AppearanceTheme =
      currentTheme === "light" ||
      currentTheme === "dark" ||
      currentTheme === "system"
        ? currentTheme
        : "system"
    const fallbackSettings: AppearanceSettings = {
      theme: fallbackTheme,
      colorId: "cobalt",
      timezone: inferredTimezone,
      language: "English",
      fontScale: "default",
    }

    if (typeof window === "undefined") {
      setAppearanceSettings(fallbackSettings)
      setSavedAppearanceSettings(fallbackSettings)
      return
    }

    const rawSettings = window.localStorage.getItem(
      APPEARANCE_SETTINGS_STORAGE_KEY
    )
    if (!rawSettings) {
      setAppearanceSettings(fallbackSettings)
      setSavedAppearanceSettings(fallbackSettings)
      applyAppearanceColor(fallbackSettings.colorId)
      applyGlobalFontScale(fallbackSettings.fontScale)
      return
    }

    try {
      const parsed = JSON.parse(rawSettings) as Partial<AppearanceSettings>
      const nextSettings: AppearanceSettings = {
        theme:
          parsed.theme === "light" ||
          parsed.theme === "dark" ||
          parsed.theme === "system"
            ? parsed.theme
            : fallbackSettings.theme,
        colorId: appearanceColorOptions.some(
          (option) => option.id === parsed.colorId
        )
          ? (parsed.colorId as AppearanceColorId)
          : fallbackSettings.colorId,
        timezone:
          typeof parsed.timezone === "string"
            ? parsed.timezone
            : fallbackSettings.timezone,
        language:
          typeof parsed.language === "string"
            ? parsed.language
            : fallbackSettings.language,
        fontScale:
          parsed.fontScale === "smaller" ||
          parsed.fontScale === "default" ||
          parsed.fontScale === "bigger"
            ? parsed.fontScale
            : fallbackSettings.fontScale,
      }

      setAppearanceSettings(nextSettings)
      setSavedAppearanceSettings(nextSettings)
      applyAppearanceColor(nextSettings.colorId)
      applyGlobalFontScale(nextSettings.fontScale)
      setTheme(nextSettings.theme)
    } catch {
      setAppearanceSettings(fallbackSettings)
      setSavedAppearanceSettings(fallbackSettings)
      applyAppearanceColor(fallbackSettings.colorId)
      applyGlobalFontScale(fallbackSettings.fontScale)
    }
  }, [currentTheme, inferredTimezone, setTheme])

  const hasUnsavedChanges =
    appearanceSettings.theme !== savedAppearanceSettings.theme ||
    appearanceSettings.colorId !== savedAppearanceSettings.colorId ||
    appearanceSettings.timezone !== savedAppearanceSettings.timezone ||
    appearanceSettings.language !== savedAppearanceSettings.language ||
    appearanceSettings.fontScale !== savedAppearanceSettings.fontScale
  const selectedAppearanceColor =
    appearanceColorOptions.find(
      (option) => option.id === appearanceSettings.colorId
    ) ?? appearanceColorOptions[1]

  const themePreviewImageById: Record<"light" | "dark" | "system", string> = {
    light: "/white.png",
    dark: "/dark.png",
    system: "/both.jpg",
  }

  const persistAppearanceSettings = React.useCallback(
    (nextSettings: AppearanceSettings) => {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          APPEARANCE_SETTINGS_STORAGE_KEY,
          JSON.stringify(nextSettings)
        )
      }
    },
    []
  )

  React.useEffect(() => {
    onUnsavedChangesChange?.(hasUnsavedChanges)
    return () => onUnsavedChangesChange?.(false)
  }, [hasUnsavedChanges, onUnsavedChangesChange])

  return (
    <div className="flex min-h-full flex-col">
      <div className="space-y-3">
        <section className="space-y-2">
          <p className="text-sm font-medium text-foreground">Appearance</p>
          <div className="space-y-1.5">
            <Label className="text-muted-foreground">
              <Palette className="h-3.5 w-3.5 text-muted-foreground/80" />
              Theme mode
            </Label>
            <div className="grid gap-2 sm:grid-cols-3">
              {(
                [
                  { id: "light", label: "Light", icon: IconSun },
                  { id: "dark", label: "Dark", icon: IconMoon },
                  { id: "system", label: "System", icon: Monitor },
                ] as const
              ).map((themeOption) => {
                const ThemeIcon = themeOption.icon
                return (
                  <button
                    key={themeOption.id}
                    type="button"
                    onClick={() =>
                      setAppearanceSettings((prev) => {
                        const nextSettings: AppearanceSettings = {
                          ...prev,
                          theme: themeOption.id,
                        }
                        setTheme(themeOption.id)
                        setSavedAppearanceSettings((previousSaved) => ({
                          ...previousSaved,
                          theme: themeOption.id,
                        }))
                        persistAppearanceSettings(nextSettings)
                        return nextSettings
                      })
                    }
                    className={cn(
                      "group rounded-xl p-2 text-left transition-colors hover:bg-muted/20"
                    )}
                  >
                    <div
                      className={cn(
                        "relative h-32 w-full overflow-hidden rounded-md border transition-colors",
                        appearanceSettings.theme === themeOption.id
                          ? "border-primary ring-1 ring-primary/35"
                          : "border-input/80 group-hover:border-input"
                      )}
                    >
                      <Image
                        src={themePreviewImageById[themeOption.id]}
                        alt={`${themeOption.label} preview`}
                        fill
                        sizes="(max-width: 768px) 33vw, 180px"
                        className="object-cover"
                      />
                    </div>
                    <div className="mt-2 flex items-center justify-center gap-1.5 text-sm font-medium text-foreground">
                      <ThemeIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      {themeOption.label}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-muted-foreground">
              <Palette className="h-3.5 w-3.5 text-muted-foreground/80" />
              Primary color
            </Label>
            <ColorSelector
              colors={appearanceColorOptions.map((colorOption) => colorOption.primary)}
              defaultValue={selectedAppearanceColor.primary}
              onColorSelect={(selectedColor) => {
                const matchedColor = appearanceColorOptions.find(
                  (colorOption) => colorOption.primary === selectedColor
                )
                if (!matchedColor) return
                setAppearanceSettings((prev) => ({
                  ...prev,
                  colorId: matchedColor.id,
                }))
                setSavedAppearanceSettings((previousSaved) => ({
                  ...previousSaved,
                  colorId: matchedColor.id,
                }))
                applyAppearanceColor(matchedColor.id)
                const nextSettings: AppearanceSettings = {
                  ...appearanceSettings,
                  colorId: matchedColor.id,
                }
                persistAppearanceSettings(nextSettings)
              }}
              className="flex flex-wrap items-center gap-2"
            />
            <p className="text-xs text-muted-foreground">
              Applies to primary buttons and focused field borders.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { id: "smaller", label: "Smaller" },
                { id: "default", label: "Default" },
                { id: "bigger", label: "Bigger" },
              ] as const
            ).map((fontOption) => (
              <Button
                key={fontOption.id}
                type="button"
                variant={
                  appearanceSettings.fontScale === fontOption.id
                    ? "default"
                    : "outline"
                }
                size="sm"
                className="h-7"
                onClick={() =>
                  setAppearanceSettings((prev) => ({
                    ...prev,
                    fontScale: fontOption.id,
                  }))
                }
              >
                {fontOption.label}
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Applies globally across the entire website.
          </p>
        </section>

        <section className="space-y-2">
          <p className="text-sm font-medium text-foreground">
            Time and language
          </p>
          <div className="space-y-1.5">
            <Label
              className="text-muted-foreground"
              htmlFor="settings-timezone"
            >
              <Clock3 className="h-3.5 w-3.5 text-muted-foreground/80" />
              Time zone
            </Label>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    id="settings-timezone"
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 w-full justify-between rounded-lg border-input bg-transparent px-2.5 text-sm font-normal"
                  />
                }
              >
                <span>{appearanceSettings.timezone}</span>
                <IconChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="min-w-56 rounded-lg p-1"
              >
                {timezoneOptions.map((timezone) => (
                  <DropdownMenuItem
                    key={timezone}
                    onClick={() =>
                      setAppearanceSettings((prev) => ({
                        ...prev,
                        timezone,
                      }))
                    }
                  >
                    {timezone}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="space-y-1.5">
            <Label
              className="text-muted-foreground"
              htmlFor="settings-language"
            >
              <Languages className="h-3.5 w-3.5 text-muted-foreground/80" />
              Language
            </Label>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    id="settings-language"
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 w-full justify-between rounded-lg border-input bg-transparent px-2.5 text-sm font-normal"
                  />
                }
              >
                <span>{appearanceSettings.language}</span>
                <IconChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="min-w-56 rounded-lg p-1"
              >
                {languageOptions.map((language) => (
                  <DropdownMenuItem
                    key={language}
                    onClick={() =>
                      setAppearanceSettings((prev) => ({
                        ...prev,
                        language,
                      }))
                    }
                  >
                    <Globe2 className="h-3.5 w-3.5 text-muted-foreground/80" />
                    {language}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </section>
      </div>
      <div className="mt-auto flex justify-end pt-5 pb-1">
        <Button
          type="button"
          size="sm"
          disabled={!hasUnsavedChanges}
          onClick={() => {
            setSavedAppearanceSettings(appearanceSettings)
            setTheme(appearanceSettings.theme)
            applyAppearanceColor(appearanceSettings.colorId)
            applyGlobalFontScale(appearanceSettings.fontScale)
            if (typeof window !== "undefined") {
              window.localStorage.setItem(
                APPEARANCE_SETTINGS_STORAGE_KEY,
                JSON.stringify(appearanceSettings)
              )
            }
          }}
        >
          <Check className="h-3.5 w-3.5" />
          Save
        </Button>
      </div>
    </div>
  )
}

function WorkspaceSettingsContent({
  workspace,
  onSaveWorkspace,
  onGoToMembers,
}: {
  workspace: WorkspaceProfile
  onSaveWorkspace: (workspace: WorkspaceProfile) => void
  onGoToMembers: () => void
}) {
  const imageInputRef = React.useRef<HTMLInputElement>(null)
  const [savedWorkspace, setSavedWorkspace] = React.useState({
    name: workspace.name,
    description: workspace.description,
    avatarUrl: workspace.avatarUrl ?? null,
    country: workspace.country,
  })
  const [workspaceName, setWorkspaceName] = React.useState(workspace.name)
  const [description, setDescription] = React.useState(workspace.description)
  const [country, setCountry] = React.useState(workspace.country)
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(
    workspace.avatarUrl ?? null
  )

  React.useEffect(() => {
    setWorkspaceName(workspace.name)
    setDescription(workspace.description)
    setCountry(workspace.country)
    setAvatarUrl(workspace.avatarUrl ?? null)
    setSavedWorkspace({
      name: workspace.name,
      description: workspace.description,
      avatarUrl: workspace.avatarUrl ?? null,
      country: workspace.country,
    })
  }, [
    workspace.avatarUrl,
    workspace.description,
    workspace.country,
    workspace.id,
    workspace.name,
  ])

  const hasUnsavedChanges =
    workspaceName !== savedWorkspace.name ||
    description !== savedWorkspace.description ||
    avatarUrl !== savedWorkspace.avatarUrl ||
    country !== savedWorkspace.country

  const handleWorkspaceImageUpload = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setAvatarUrl(reader.result)
      }
    }
    reader.readAsDataURL(file)
    event.currentTarget.value = ""
  }
  const openWorkspaceImagePicker = React.useCallback(() => {
    window.setTimeout(() => {
      imageInputRef.current?.click()
    }, 0)
  }, [])

  const displayName = workspaceName.trim() || "Workspace"
  const displayInitials = deriveInitialsFromName(displayName)

  return (
    <div className="flex min-h-full flex-col">
      <div className="space-y-3">
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={handleWorkspaceImageUpload}
        />
        <div className="flex items-center gap-2.5">
          <DropdownMenu>
            <div className="group/workspace-avatar relative">
              <Avatar className="size-14 !rounded-lg ring-1 ring-border after:!rounded-lg">
                <AvatarImage
                  src={avatarUrl ?? undefined}
                  alt={`${displayName} avatar`}
                  className="!rounded-lg"
                />
                <AvatarFallback className="!rounded-lg text-sm font-semibold">
                  {displayInitials}
                </AvatarFallback>
              </Avatar>
              <span className="pointer-events-none absolute inset-0 rounded-lg bg-background/20 opacity-0 backdrop-blur-sm transition-opacity duration-200 group-focus-within/workspace-avatar:opacity-100 group-hover/workspace-avatar:opacity-100" />
              <DropdownMenuTrigger
                render={
                  <button
                    type="button"
                    className="absolute inset-0 z-10 flex cursor-pointer items-center justify-center rounded-lg opacity-0 transition-opacity duration-200 group-focus-within/workspace-avatar:opacity-100 group-hover/workspace-avatar:opacity-100"
                    aria-label="Edit workspace image"
                  />
                }
              >
                <span className="inline-flex size-8 items-center justify-center rounded-lg border border-border/70 bg-background/90 shadow-xs">
                  <PenLine className="h-3.5 w-3.5" />
                </span>
              </DropdownMenuTrigger>
            </div>
            <DropdownMenuContent
              align="start"
              className="min-w-44 rounded-lg p-1"
            >
              <DropdownMenuItem
                onClick={openWorkspaceImagePicker}
              >
                <Camera className="h-3.5 w-3.5" />
                Upload image
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setAvatarUrl(null)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete image
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="space-y-0.5 leading-tight">
            <p className="text-sm font-medium text-foreground">
              {displayName}
            </p>
            <p className="text-sm text-muted-foreground">Workspace profile</p>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label
            className="text-muted-foreground"
            htmlFor="settings-workspace-name"
          >
            <IconBuilding className="h-3.5 w-3.5 text-muted-foreground/80" />
            Workspace name
          </Label>
          <Input
            id="settings-workspace-name"
            value={workspaceName}
            onChange={(event) => setWorkspaceName(event.target.value)}
            placeholder="Enter workspace name"
            className="h-7"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Label
              className="text-muted-foreground"
              htmlFor="settings-workspace-email"
            >
              <Mail className="h-3.5 w-3.5 text-muted-foreground/80" />
              Primary email
            </Label>
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    className="inline-flex size-4 items-center justify-center rounded-full border border-border text-[10px] leading-none font-semibold text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
                    aria-label="Primary email cannot be edited"
                  >
                    !
                  </button>
                }
              />
              <TooltipContent className="max-w-64 text-xs">
                You can&apos;t edit the primary email. Contact support to update
                your primary email.
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="relative">
            <Input
              id="settings-workspace-email"
              type="email"
              value={workspace.primaryEmail}
              disabled
              className="h-7 cursor-not-allowed bg-muted/55 pr-20 text-muted-foreground disabled:opacity-100"
            />
            <span className="pointer-events-none absolute inset-y-0 right-2 inline-flex items-center text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
              Read only
            </span>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-muted-foreground">
            <Globe2 className="h-3.5 w-3.5 text-muted-foreground/80" />
            Country
          </Label>
          <AdminSelect
            value={country}
            options={workspaceCountries}
            onChange={setCountry}
          />
        </div>

        <div className="space-y-1.5">
          <Label
            className="text-muted-foreground"
            htmlFor="settings-workspace-description"
          >
            <IconFileText className="h-3.5 w-3.5 text-muted-foreground/80" />
            Description
          </Label>
          <Textarea
            id="settings-workspace-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Describe your workspace..."
            className="min-h-20 resize-none rounded-lg border-input"
          />
        </div>
      </div>

      <div className="space-y-3 pt-6 pb-1">
        <section>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-foreground">Members</p>
              <p className="text-sm text-muted-foreground">
                Manage workspace members, invites, and permissions.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onGoToMembers}
            >
              <IconUsers className="h-3.5 w-3.5" />
              Go to members
            </Button>
          </div>
        </section>

        <section className="space-y-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-destructive">
                Delete workspace
              </p>
              <p className="text-sm text-muted-foreground">
                Permanently delete this workspace and all associated data.
              </p>
            </div>
            <Button type="button" variant="destructive" size="sm">
              <Trash2 className="h-3.5 w-3.5" />
              Delete workspace
            </Button>
          </div>
        </section>
      </div>
      <div className="mt-auto flex justify-end pt-5 pb-1">
        <Button
          type="button"
          size="sm"
          disabled={!hasUnsavedChanges}
          onClick={() => {
            const nextWorkspace: WorkspaceProfile = {
              ...workspace,
              name: displayName,
              description,
              avatarUrl,
              country,
              initials: deriveInitialsFromName(displayName),
            }
            setSavedWorkspace({
              name: displayName,
              description,
              avatarUrl,
              country,
            })
            onSaveWorkspace(nextWorkspace)
          }}
        >
          <Check className="h-3.5 w-3.5" />
          Save
        </Button>
      </div>
    </div>
  )
}

function MembersSettingsContent({
  quickActionToken = 0,
  quickSearchQuery = "",
  quickSelectedMemberId = null,
  quickInviteToken = 0,
  profileBackLabel = "Back to members",
  onProfileBack,
}: {
  quickActionToken?: number
  quickSearchQuery?: string
  quickSelectedMemberId?: string | null
  quickInviteToken?: number
  profileBackLabel?: string
  onProfileBack?: () => void
}) {
  const roleFilters = ["All users", ...platformRoles] as const
  const inviteRoleOptions = platformRoles
  const creditsRanges = ["All time", "This month", "This week"] as const
  const seatsLimit = 10
  const [searchQuery, setSearchQuery] = React.useState("")
  const [roleFilter, setRoleFilter] =
    React.useState<(typeof roleFilters)[number]>("All users")
  const [selectedMemberId, setSelectedMemberId] = React.useState<string | null>(
    null
  )
  const [creditsRange, setCreditsRange] =
    React.useState<(typeof creditsRanges)[number]>("All time")
  const [isInviteOpen, setIsInviteOpen] = React.useState(false)
  const [inviteRole, setInviteRole] =
    React.useState<(typeof inviteRoleOptions)[number]>("Workspace Member")
  const [inviteInput, setInviteInput] = React.useState("")
  const [inviteEmails, setInviteEmails] = React.useState<string[]>([])
  const [inviteError, setInviteError] = React.useState("")
  const roleBadgeClasses: Record<WorkspaceMember["role"], BadgeVariant> = {
    "Super Admin": "violet",
    Admin: "blue",
    "Workspace Admin": "blue",
    "Workspace Member": "neutral",
  }
  const appStatusClasses: Record<WorkspaceMemberApp["status"], BadgeVariant> = {
    Connected: "green",
    Disconnected: "neutral",
  }

  const filteredMembers = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    return workspaceMembers.filter((member) => {
      const matchesRole =
        roleFilter === "All users" || member.role === roleFilter
      if (!matchesRole) return false
      if (!query) return true
      return (
        member.name.toLowerCase().includes(query) ||
        member.email.toLowerCase().includes(query)
      )
    })
  }, [searchQuery, roleFilter])
  const seatsUsed = workspaceMembers.length
  const seatsProgress = Math.min(100, (seatsUsed / seatsLimit) * 100)
  const selectedMember = React.useMemo(
    () =>
      workspaceMembers.find((member) => member.id === selectedMemberId) ?? null,
    [selectedMemberId]
  )
  const selectedCreditsUsage = React.useMemo(() => {
    if (!selectedMember) return 0
    if (creditsRange === "This month")
      return selectedMember.creditsUsage.thisMonth
    if (creditsRange === "This week")
      return selectedMember.creditsUsage.thisWeek
    return selectedMember.creditsUsage.allTime
  }, [selectedMember, creditsRange])
  const formattedCreditsUsage = React.useMemo(
    () => new Intl.NumberFormat("en-US").format(selectedCreditsUsage),
    [selectedCreditsUsage]
  )
  const creditsChartData = React.useMemo(() => {
    if (!selectedMember) return [] as { label: string; value: number }[]

    const buildSeries = (total: number, weights: number[]) => {
      const weightSum = weights.reduce((sum, weight) => sum + weight, 0) || 1
      return weights.map((weight) =>
        Math.max(0, Math.round((total * weight) / weightSum))
      )
    }

    if (creditsRange === "All time") {
      const labels = ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr"]
      const values = buildSeries(
        selectedMember.creditsUsage.allTime,
        [9, 12, 11, 15, 16, 19, 18]
      )
      return labels.map((label, index) => ({
        label,
        value: values[index] ?? 0,
      }))
    }

    if (creditsRange === "This month") {
      const labels = ["Week 1", "Week 2", "Week 3", "Week 4"]
      const values = buildSeries(
        selectedMember.creditsUsage.thisMonth,
        [22, 28, 24, 26]
      )
      return labels.map((label, index) => ({
        label,
        value: values[index] ?? 0,
      }))
    }

    const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    const values = buildSeries(
      selectedMember.creditsUsage.thisWeek,
      [12, 16, 15, 14, 13, 17, 13]
    )
    return labels.map((label, index) => ({ label, value: values[index] ?? 0 }))
  }, [selectedMember, creditsRange])

  const addInviteEmails = React.useCallback((raw: string) => {
    const tokens = raw
      .split(/[\s,;]+/)
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean)
    if (tokens.length === 0) return { added: 0, invalid: 0 }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    let invalid = 0
    let added = 0

    setInviteEmails((previous) => {
      const seen = new Set(previous.map((value) => value.toLowerCase()))
      const next = [...previous]
      for (const token of tokens) {
        if (!emailPattern.test(token)) {
          invalid += 1
          continue
        }
        if (seen.has(token)) continue
        seen.add(token)
        next.push(token)
        added += 1
      }
      return next
    })

    return { added, invalid }
  }, [])

  const closeInviteModal = React.useCallback(() => {
    setIsInviteOpen(false)
    setInviteInput("")
    setInviteEmails([])
    setInviteRole("Workspace Member")
    setInviteError("")
  }, [])

  React.useEffect(() => {
    if (!isInviteOpen) return
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeInviteModal()
    }
    window.addEventListener("keydown", onEscape)
    return () => window.removeEventListener("keydown", onEscape)
  }, [isInviteOpen, closeInviteModal])
  React.useEffect(() => {
    if (!selectedMemberId) return
    setCreditsRange("All time")
  }, [selectedMemberId])

  React.useEffect(() => {
    if (quickActionToken === 0) return

    if (quickSelectedMemberId) {
      setSelectedMemberId(quickSelectedMemberId)
      setSearchQuery("")
    } else {
      setSelectedMemberId(null)
      setSearchQuery(quickSearchQuery)
    }

    setRoleFilter("All users")
  }, [quickActionToken, quickSearchQuery, quickSelectedMemberId])

  React.useEffect(() => {
    if (quickInviteToken === 0) return
    setSelectedMemberId(null)
    setSearchQuery("")
    setRoleFilter("All users")
    setInviteInput("")
    setInviteEmails([])
    setInviteError("")
    setInviteRole("Workspace Member")
    setIsInviteOpen(true)
  }, [quickInviteToken])

  const submitInvite = () => {
    const tokens = inviteInput
      .split(/[\s,;]+/)
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean)
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const validTokens = tokens.filter((token) => emailPattern.test(token))
    const merged = Array.from(
      new Set([
        ...inviteEmails.map((email) => email.toLowerCase()),
        ...validTokens,
      ])
    )

    if (merged.length === 0) {
      setInviteError("Please enter at least one valid email address.")
      return
    }

    closeInviteModal()
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {selectedMember ? (
        <>
          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="-ml-1 text-muted-foreground hover:text-foreground"
              onClick={() => {
                setSelectedMemberId(null)
                onProfileBack?.()
              }}
            >
              <IconChevronLeft className="h-3.5 w-3.5" />
              {profileBackLabel}
            </Button>
          </div>

          <div className="mt-2 min-h-0 flex-1 space-y-4 overflow-y-auto pe-1">
            <section className="space-y-2.5">
              <p className="text-sm font-semibold text-foreground">
                User profile
              </p>
              <div className="flex items-center gap-2.5">
                <Avatar className="size-10 !rounded-full">
                  <AvatarImage
                    src={selectedMember.avatarUrl}
                    alt={selectedMember.name}
                    className="!rounded-full object-cover"
                  />
                  <AvatarFallback className="!rounded-full text-xs font-semibold">
                    {selectedMember.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-0.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="text-sm font-medium text-foreground">
                      {selectedMember.name}
                    </p>
                    <Badge variant={roleBadgeClasses[selectedMember.role]}>
                      {selectedMember.role}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {selectedMember.profileRole}
                  </p>
                </div>
              </div>

              <div className="grid gap-2.5 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground">Email</Label>
                  <Input
                    type="email"
                    value={selectedMember.email}
                    disabled
                    className="h-7 cursor-not-allowed bg-muted/55 text-muted-foreground disabled:opacity-100"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground">Last login</Label>
                  <Input
                    value={selectedMember.lastLogin}
                    disabled
                    className="h-7 cursor-not-allowed bg-muted/55 text-muted-foreground disabled:opacity-100"
                  />
                </div>
              </div>
            </section>

            <section className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-foreground">
                  Usage of credits
                </p>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 justify-between rounded-lg border-input bg-transparent px-2.5 text-[0.8rem] font-normal sm:min-w-28"
                      />
                    }
                  >
                    <span>{creditsRange}</span>
                    <IconChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="min-w-32 rounded-lg p-1"
                  >
                    {creditsRanges.map((range) => (
                      <DropdownMenuItem
                        key={range}
                        onClick={() => setCreditsRange(range)}
                      >
                        {range}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="rounded-xl border border-border bg-background px-3 py-2.5">
                <p className="text-base font-semibold text-foreground">
                  {formattedCreditsUsage} credits
                </p>
                <p className="text-xs text-muted-foreground">
                  Consumption for {creditsRange.toLowerCase()}.
                </p>
                <BarInteractive
                  data={creditsChartData}
                  className="mt-2.5 h-44"
                />
              </div>
            </section>

            <section className="space-y-2.5">
              <p className="text-sm font-semibold text-foreground">
                Integrated apps
              </p>
              <div className="overflow-hidden rounded-xl border border-border bg-background">
                <table className="w-full table-fixed border-collapse text-[0.8rem]">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="w-[35%] px-2.5 py-1.5 text-left font-medium">
                        App
                      </th>
                      <th className="w-[25%] px-2.5 py-1.5 text-left font-medium">
                        Category
                      </th>
                      <th className="w-[20%] px-2.5 py-1.5 text-left font-medium">
                        Status
                      </th>
                      <th className="w-[20%] px-2.5 py-1.5 text-left font-medium">
                        Last used
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedMember.integratedApps.map((app) => (
                      <tr
                        key={app.name}
                        className="border-b border-border/70 last:border-b-0"
                      >
                        <td className="px-2.5 py-1.5 font-medium text-foreground">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-[min(var(--radius-md),9px)] border border-border bg-muted/45 text-[10px] font-semibold text-foreground">
                              {app.name.slice(0, 1).toUpperCase()}
                            </span>
                            <span className="truncate">{app.name}</span>
                          </div>
                        </td>
                        <td className="truncate px-2.5 py-1.5 text-muted-foreground">
                          {app.category}
                        </td>
                        <td className="px-2.5 py-1.5">
                          <Badge variant={appStatusClasses[app.status]}>
                            {app.status}
                          </Badge>
                        </td>
                        <td className="truncate px-2.5 py-1.5 text-muted-foreground">
                          {app.lastUsed}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative w-full sm:max-w-sm">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search by name or email"
                  className="h-7 pl-8"
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 justify-between rounded-lg border-input bg-transparent px-2.5 text-[0.8rem] font-normal sm:min-w-36"
                    />
                  }
                >
                  <span className="inline-flex items-center gap-1.5">
                    <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                    {roleFilter}
                  </span>
                  <IconChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="min-w-40 rounded-lg p-1"
                >
                  {roleFilters.map((role) => (
                    <DropdownMenuItem
                      key={role}
                      onClick={() => setRoleFilter(role)}
                    >
                      {role}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => setIsInviteOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              Invite
            </Button>
          </div>

          <section className="mt-3 space-y-2 px-1 py-1">
            <div className="flex items-center justify-between gap-2">
              <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <IconUsers className="h-3.5 w-3.5 text-muted-foreground" />
                Seat limit
              </p>
              <span className="text-sm text-muted-foreground">
                {seatsUsed} / {seatsLimit}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary/80"
                style={{ width: `${seatsProgress}%` }}
              />
            </div>
          </section>

          <div className="mt-3 min-h-0 flex-1 overflow-auto">
            <div className="overflow-hidden rounded-xl border border-border bg-background">
              <table className="w-full min-w-0 table-fixed border-collapse text-[0.8rem]">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="w-[48%] px-2.5 py-1.5 text-left font-medium">
                      <span className="inline-flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5" />
                        Name & email
                      </span>
                    </th>
                    <th className="w-[20%] px-2.5 py-1.5 text-left font-medium">
                      <span className="inline-flex items-center gap-1.5">
                        <Briefcase className="h-3.5 w-3.5" />
                        User type
                      </span>
                    </th>
                    <th className="w-[24%] px-2.5 py-1.5 text-left font-medium">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock3 className="h-3.5 w-3.5" />
                        Last login
                      </span>
                    </th>
                    <th className="w-11 px-2 py-1.5 text-center font-medium">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.map((member) => (
                    <tr
                      key={member.id}
                      onClick={() => setSelectedMemberId(member.id)}
                      className="cursor-pointer border-b border-border/70 transition-colors last:border-b-0 hover:bg-muted/35"
                    >
                      <td className="px-2.5 py-1.5 pe-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="size-7 !rounded-full">
                            <AvatarImage
                              src={member.avatarUrl}
                              alt={member.name}
                              className="!rounded-full object-cover"
                            />
                            <AvatarFallback className="!rounded-full text-[10px] font-semibold">
                              {member.initials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="truncate text-[0.8rem] font-medium text-foreground">
                              {member.name}
                            </p>
                            <p className="truncate text-[11px] text-muted-foreground">
                              {member.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-2.5 py-1.5 pe-3 text-[0.8rem] text-foreground">
                        <Badge variant={roleBadgeClasses[member.role]}>
                          {member.role}
                        </Badge>
                      </td>
                      <td className="px-2.5 py-1.5 text-[0.8rem] text-muted-foreground">
                        {member.lastLogin}
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                type="button"
                                size="icon-xs"
                                variant="ghost"
                                className="border-0 bg-transparent text-muted-foreground shadow-none hover:bg-transparent hover:text-foreground aria-expanded:bg-transparent"
                                aria-label={`Actions for ${member.name}`}
                                onClick={(event) => event.stopPropagation()}
                              />
                            }
                          >
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="min-w-40 rounded-lg p-1"
                          >
                            <DropdownMenuItem
                              onClick={() => setSelectedMemberId(member.id)}
                            >
                              <User className="h-3.5 w-3.5" />
                              Go to profile
                            </DropdownMenuItem>
                            <DropdownMenuItem variant="destructive">
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete user
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredMembers.length === 0 && (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No members match your current search or filter.
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {isInviteOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/50 p-4 backdrop-blur-[1px]"
          onClick={(event) => {
            if (event.target === event.currentTarget) closeInviteModal()
          }}
        >
          <div className="w-full max-w-xl overflow-hidden rounded-xl border border-border bg-background shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="inline-flex items-center gap-2.5">
                <UserPlus className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-semibold text-foreground">
                  Invite team members
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="text-muted-foreground"
                onClick={closeInviteModal}
              >
                <IconX className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="space-y-3.5 px-4 py-3.5">
              <div className="space-y-2">
                <Label className="text-muted-foreground">
                  Send invite to ...
                </Label>
                <div className="flex min-h-24 flex-wrap content-start items-start gap-1.5 rounded-lg border border-input bg-background px-2.5 py-2 focus-within:border-primary">
                  {inviteEmails.map((email) => (
                    <Badge
                      key={email}
                      variant="neutral"
                      className="gap-1.5 text-foreground"
                    >
                      {email}
                      <button
                        type="button"
                        onClick={() =>
                          setInviteEmails((previous) =>
                            previous.filter((item) => item !== email)
                          )
                        }
                        className="text-muted-foreground transition-colors hover:text-foreground"
                        aria-label={`Remove ${email}`}
                      >
                        <IconX className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                  <input
                    type="text"
                    value={inviteInput}
                    onChange={(event) => {
                      setInviteInput(event.target.value)
                      if (inviteError) setInviteError("")
                    }}
                    onKeyDown={(event) => {
                      const shouldCommitOnSpace =
                        event.key === " " && inviteInput.trim().includes("@")
                      if (
                        event.key === "Enter" ||
                        event.key === "," ||
                        event.key === ";" ||
                        shouldCommitOnSpace
                      ) {
                        event.preventDefault()
                        const { invalid } = addInviteEmails(inviteInput)
                        setInviteInput("")
                        if (invalid > 0) {
                          setInviteError(
                            "Some entries were ignored because they are invalid."
                          )
                        }
                      }
                    }}
                    onPaste={(event) => {
                      const pasted = event.clipboardData.getData("text")
                      if (!/[,\n;\s]/.test(pasted)) return
                      event.preventDefault()
                      const { invalid } = addInviteEmails(pasted)
                      if (invalid > 0) {
                        setInviteError(
                          "Some entries were ignored because they are invalid."
                        )
                      }
                    }}
                    onBlur={() => {
                      if (!inviteInput.trim()) return
                      const { invalid } = addInviteEmails(inviteInput)
                      setInviteInput("")
                      if (invalid > 0) {
                        setInviteError(
                          "Some entries were ignored because they are invalid."
                        )
                      }
                    }}
                    placeholder={
                      inviteEmails.length === 0 ? "name@company.com" : ""
                    }
                    className="h-6 min-w-[180px] flex-1 border-0 bg-transparent text-[0.8rem] text-foreground outline-none placeholder:text-muted-foreground"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Invite as</Label>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 w-full justify-between rounded-lg border-input bg-transparent px-2.5 text-[0.8rem] font-normal"
                      />
                    }
                  >
                    <span>{inviteRole}</span>
                    <IconChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="start"
                    className="min-w-40 rounded-lg p-1"
                  >
                    {inviteRoleOptions.map((role) => (
                      <DropdownMenuItem
                        key={role}
                        onClick={() => setInviteRole(role)}
                      >
                        {role}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {inviteError && (
                <p className="text-xs text-destructive">{inviteError}</p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={closeInviteModal}
              >
                Cancel
              </Button>
              <Button type="button" size="sm" onClick={submitInvite}>
                <Mail className="h-3.5 w-3.5" />
                Send invites
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function UsageLimitsSettingsContent() {
  const usageRanges = ["This week", "This month", "All time"] as const
  const [usageRange, setUsageRange] =
    React.useState<(typeof usageRanges)[number]>("This month")
  const defaultUserLimits = React.useMemo<Record<string, number>>(
    () =>
      Object.fromEntries(
        workspaceMembers.map((member) => [
          member.id,
          member.role === "Super Admin"
            ? 6000
            : member.role === "Admin"
              ? 4000
              : 2500,
        ])
      ),
    []
  )
  const [userLimits, setUserLimits] =
    React.useState<Record<string, number>>(defaultUserLimits)
  const [savedUserLimits, setSavedUserLimits] =
    React.useState<Record<string, number>>(defaultUserLimits)

  const stats = usageRangeStats[usageRange]
  const creditsPercentage = Math.min(
    100,
    (stats.creditsUsed / stats.creditsLimit) * 100
  )
  const hasUserLimitsChanges =
    JSON.stringify(userLimits) !== JSON.stringify(savedUserLimits)
  const chartData = React.useMemo(() => {
    if (usageRange === "All time") {
      return [
        { label: "Oct", value: 5400 },
        { label: "Nov", value: 6900 },
        { label: "Dec", value: 6400 },
        { label: "Jan", value: 7900 },
        { label: "Feb", value: 8350 },
        { label: "Mar", value: 9200 },
        { label: "Apr", value: 8690 },
      ]
    }
    if (usageRange === "This week") {
      return [
        { label: "Mon", value: 210 },
        { label: "Tue", value: 280 },
        { label: "Wed", value: 260 },
        { label: "Thu", value: 240 },
        { label: "Fri", value: 310 },
        { label: "Sat", value: 270 },
        { label: "Sun", value: 250 },
      ]
    }
    return [
      { label: "W1", value: 1520 },
      { label: "W2", value: 1860 },
      { label: "W3", value: 2010 },
      { label: "W4", value: 2030 },
    ]
  }, [usageRange])

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-0.5">
          <p className="text-sm font-semibold text-foreground">
            Usage overview
          </p>
          <p className="text-sm text-muted-foreground">
            Monitor consumption, quotas, and workspace limits.
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 justify-between rounded-lg border-input bg-transparent px-2.5 text-[0.8rem] font-normal sm:min-w-32"
              />
            }
          >
            <span>{usageRange}</span>
            <IconChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-32 rounded-lg p-1">
            {usageRanges.map((range) => (
              <DropdownMenuItem
                key={range}
                onClick={() => setUsageRange(range)}
              >
                {range}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-3 min-h-0 flex-1 space-y-3 overflow-y-auto">
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-border bg-background px-3 py-2.5">
            <p className="text-[11px] text-muted-foreground">Credits used</p>
            <p className="text-sm font-semibold text-foreground">
              {stats.creditsUsed.toLocaleString()} /{" "}
              {stats.creditsLimit.toLocaleString()}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-background px-3 py-2.5">
            <p className="text-[11px] text-muted-foreground">API requests</p>
            <p className="text-sm font-semibold text-foreground">
              {stats.apiRequests.toLocaleString()} /{" "}
              {stats.apiLimit.toLocaleString()}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-background px-3 py-2.5">
            <p className="text-[11px] text-muted-foreground">Storage</p>
            <p className="text-sm font-semibold text-foreground">
              {stats.storageUsedGb}GB / {stats.storageLimitGb}GB
            </p>
          </div>
          <div className="rounded-xl border border-border bg-background px-3 py-2.5">
            <p className="text-[11px] text-muted-foreground">Automations</p>
            <p className="text-sm font-semibold text-foreground">
              {stats.automationsActive} / {stats.automationsLimit}
            </p>
          </div>
        </div>

        <section className="rounded-xl border border-border bg-background p-2.5">
          <ChartBarPattern
            title="Usage trend"
            description={`Consumption across ${usageRange.toLowerCase()}.`}
            badgeLabel={usageRange}
            data={chartData.map((point) => ({
              label: point.label,
              usage: point.value,
              baseline: Math.max(Math.round(point.value * 0.78), 1),
            }))}
          />
        </section>

        <section className="overflow-hidden rounded-xl border border-border bg-background">
          <table className="w-full table-fixed border-collapse text-[0.8rem]">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="w-[30%] px-2.5 py-1.5 text-left font-medium">
                  Resource
                </th>
                <th className="w-[35%] px-2.5 py-1.5 text-left font-medium">
                  Usage
                </th>
                <th className="w-[20%] px-2.5 py-1.5 text-left font-medium">
                  Limit
                </th>
                <th className="w-[15%] px-2.5 py-1.5 text-left font-medium">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {usageLimitsRows.map((row) => {
                const used = stats[row.usedKey]
                const limit = stats[row.limitKey]
                const progress = Math.min(
                  100,
                  (used / Math.max(limit, 1)) * 100
                )
                const nearLimit = progress >= 80
                return (
                  <tr
                    key={row.key}
                    className="border-b border-border/70 last:border-b-0"
                  >
                    <td className="px-2.5 py-1.5 font-medium text-foreground">
                      {row.label}
                    </td>
                    <td className="px-2.5 py-1.5">
                      <div className="space-y-1">
                        <p className="text-[11px] text-muted-foreground">
                          {used.toLocaleString()}
                          {row.unit ? ` ${row.unit}` : ""}
                        </p>
                        <div className="h-1.5 rounded-full bg-muted">
                          <div
                            className={cn(
                              "h-full rounded-full",
                              nearLimit ? "bg-destructive/70" : "bg-primary/70"
                            )}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-2.5 py-1.5 text-muted-foreground">
                      {limit.toLocaleString()}
                      {row.unit ? ` ${row.unit}` : ""}
                    </td>
                    <td className="px-2.5 py-1.5">
                      <Badge variant={nearLimit ? "red" : "green"}>
                        {nearLimit ? "Near limit" : "Within limit"}
                      </Badge>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </section>

        <section className="overflow-hidden rounded-xl border border-border bg-background">
          <div className="border-b border-border px-3 py-2.5">
            <div className="space-y-0.5">
              <p className="text-sm font-semibold text-foreground">
                Per-user limits
              </p>
              <p className="text-xs text-muted-foreground">
                Set a monthly credits cap for each member.
              </p>
            </div>
          </div>
          <table className="w-full table-fixed border-collapse text-[0.8rem]">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="w-[46%] px-2.5 py-1.5 text-left font-medium">
                  User
                </th>
                <th className="w-[22%] px-2.5 py-1.5 text-left font-medium">
                  User type
                </th>
                <th className="w-[24%] px-2.5 py-1.5 text-left font-medium">
                  Monthly limit
                </th>
                <th className="w-[8%] px-2.5 py-1.5 text-left font-medium">
                  Unit
                </th>
              </tr>
            </thead>
            <tbody>
              {workspaceMembers.map((member) => (
                <tr
                  key={member.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => openUserProfile(member.name)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault()
                      openUserProfile(member.name)
                    }
                  }}
                  className="cursor-pointer border-b border-border/70 transition-colors last:border-b-0 hover:bg-muted/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                >
                  <td className="px-2.5 py-1.5">
                    <div className="flex items-center gap-2.5">
                      <Avatar className="size-7 !rounded-full">
                        <AvatarImage
                          src={member.avatarUrl}
                          alt={member.name}
                          className="!rounded-full object-cover"
                        />
                        <AvatarFallback className="!rounded-full text-[10px] font-semibold">
                          {member.initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-[0.8rem] font-medium text-foreground">
                          {member.name}
                        </p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {member.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-2.5 py-1.5">
                    <Badge
                      variant={member.role === "Workspace Member" ? "neutral" : "violet"}
                    >
                      {member.role}
                    </Badge>
                  </td>
                  <td className="px-2.5 py-1.5">
                    <Input
                      type="number"
                      min={0}
                      step={100}
                      value={userLimits[member.id] ?? 0}
                      onClick={(event) => event.stopPropagation()}
                      onKeyDown={(event) => event.stopPropagation()}
                      onChange={(event) => {
                        const parsed = Number(event.target.value)
                        setUserLimits((previous) => ({
                          ...previous,
                          [member.id]: Number.isFinite(parsed)
                            ? Math.max(0, parsed)
                            : 0,
                        }))
                      }}
                      className="h-7"
                    />
                  </td>
                  <td className="px-2.5 py-1.5 text-muted-foreground">
                    credits
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex justify-end border-t border-border px-3 py-2.5">
            <Button
              type="button"
              size="sm"
              disabled={!hasUserLimitsChanges}
              onClick={() => setSavedUserLimits(userLimits)}
            >
              <Check className="h-3.5 w-3.5" />
              Save limits
            </Button>
          </div>
        </section>
      </div>
    </div>
  )
}

function IntegrationsSettingsContent() {
  const [nameFilter, setNameFilter] = React.useState("")
  const [categoryFilter, setCategoryFilter] = React.useState("all")
  const [viewMode, setViewMode] = React.useState<"workspace" | "users">(
    "workspace"
  )
  const [disconnectedAppsByName, setDisconnectedAppsByName] = React.useState<
    Record<string, boolean>
  >({})
  const [forcedAppsByName, setForcedAppsByName] = React.useState<
    Record<string, boolean>
  >(() => ({
    Slack: true,
    Notion: true,
  }))

  const appRows = React.useMemo(() => {
    const appMap = new Map<
      string,
      { name: string; category: string; connectedUsers: number }
    >()

    for (const member of workspaceMembers) {
      for (const app of member.integratedApps) {
        if (app.status !== "Connected") continue
        if (disconnectedAppsByName[app.name]) continue
        const existing = appMap.get(app.name)
        if (existing) {
          appMap.set(app.name, {
            ...existing,
            connectedUsers: existing.connectedUsers + 1,
          })
          continue
        }

        appMap.set(app.name, {
          name: app.name,
          category: app.category,
          connectedUsers: 1,
        })
      }
    }

    return Array.from(appMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    )
  }, [disconnectedAppsByName])

  const categoryOptions = React.useMemo(
    () => Array.from(new Set(appRows.map((app) => app.category))).sort(),
    [appRows]
  )

  const filteredAppRows = React.useMemo(() => {
    const loweredFilter = nameFilter.trim().toLowerCase()
    return appRows.filter((app) => {
      const matchesName =
        loweredFilter.length === 0 ||
        app.name.toLowerCase().includes(loweredFilter) ||
        app.category.toLowerCase().includes(loweredFilter)
      const matchesCategory =
        categoryFilter === "all" || app.category === categoryFilter
      return matchesName && matchesCategory
    })
  }, [appRows, categoryFilter, nameFilter])

  const forcedAppNames = React.useMemo(
    () =>
      Object.entries(forcedAppsByName)
        .filter(([, isForced]) => isForced)
        .map(([name]) => name),
    [forcedAppsByName]
  )

  const categoryFilterLabel =
    categoryFilter === "all" ? "All categories" : categoryFilter
  const hasAnyConnectedApps = appRows.length > 0
  const handleDisconnectApp = React.useCallback((appName: string) => {
    setDisconnectedAppsByName((previous) => ({
      ...previous,
      [appName]: true,
    }))
    setForcedAppsByName((previous) => ({
      ...previous,
      [appName]: false,
    }))
  }, [])

  return (
    <div className="space-y-3 pb-1">
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 py-1">
        <div className="inline-flex rounded-[min(var(--radius-md),12px)] bg-muted p-0.5">
          <Button
            type="button"
            size="xs"
            variant={viewMode === "workspace" ? "default" : "ghost"}
            className="rounded-[min(var(--radius-md),10px)]"
            onClick={() => setViewMode("workspace")}
          >
            Workspace apps
          </Button>
          <Button
            type="button"
            size="xs"
            variant={viewMode === "users" ? "default" : "ghost"}
            className="rounded-[min(var(--radius-md),10px)]"
            onClick={() => setViewMode("users")}
          >
            Member access
          </Button>
        </div>
      </div>

      {viewMode === "workspace" ? (
        <>
          {!hasAnyConnectedApps ? (
            <EmptyIntegrationsPattern />
          ) : (
            <>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative w-full sm:max-w-sm">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  value={nameFilter}
                  onChange={(event) => setNameFilter(event.target.value)}
                  placeholder="Search app by name"
                  className="h-7 pl-8"
                />
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 justify-between rounded-[min(var(--radius-md),12px)] border border-transparent bg-sidebar px-2.5 text-[0.8rem] font-normal text-foreground hover:bg-sidebar-accent sm:min-w-44"
                    />
                  }
                >
                  <span className="inline-flex items-center gap-1.5">
                    <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                    {categoryFilterLabel}
                  </span>
                  <IconChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="min-w-44 rounded-lg p-1"
                >
                  <DropdownMenuItem onClick={() => setCategoryFilter("all")}>
                    All categories
                  </DropdownMenuItem>
                  {categoryOptions.map((category) => (
                    <DropdownMenuItem
                      key={category}
                      onClick={() => setCategoryFilter(category)}
                    >
                      {category}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {filteredAppRows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
              No integrations match your current filters.
            </div>
          ) : (
            <section className="overflow-hidden rounded-xl border border-border bg-background">
              <table className="w-full table-fixed border-collapse text-[0.8rem]">
                <thead>
                  <tr className="border-b border-border bg-muted/25 text-muted-foreground">
                    <th className="w-[28%] px-2.5 py-1.5 text-left font-medium">
                      Integration
                    </th>
                    <th className="w-[20%] px-2.5 py-1.5 text-left font-medium">
                      Category
                    </th>
                    <th className="w-[14%] px-2.5 py-1.5 text-left font-medium">
                      Connected users
                    </th>
                    <th className="w-[38%] px-2.5 py-1.5 text-right font-medium">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAppRows.map((app) => {
                    const isForced = Boolean(forcedAppsByName[app.name])
                    const connectedUsersCount = isForced
                      ? workspaceMembers.length
                      : app.connectedUsers

                    return (
                      <tr
                        key={app.name}
                        className="border-b border-border/70 last:border-b-0"
                      >
                        <td className="px-2.5 py-1.5">
                          <div className="flex items-center gap-2.5">
                            <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-[min(var(--radius-md),9px)] border border-border bg-muted/45 text-[10px] font-semibold text-foreground">
                              {app.name.slice(0, 1).toUpperCase()}
                            </span>
                            <div className="flex min-w-0 items-center gap-1.5">
                              <span className="truncate font-medium text-foreground">
                                {app.name}
                              </span>
                              <Badge
                                variant={isForced ? "blue" : "neutral"}
                                className="shrink-0"
                              >
                                {isForced ? "Forced" : "Optional"}
                              </Badge>
                            </div>
                          </div>
                        </td>
                        <td className="truncate px-2.5 py-1.5 text-muted-foreground">
                          {app.category}
                        </td>
                        <td className="px-2.5 py-1.5 text-foreground">
                          {connectedUsersCount} / {workspaceMembers.length}
                        </td>
                        <td className="px-2.5 py-1.5 text-right">
                          <div className="flex flex-nowrap justify-end gap-1.5">
                            <Button
                              type="button"
                              size="xs"
                              variant="ghost"
                              className="shrink-0 rounded-[min(var(--radius-md),12px)] border border-transparent bg-sidebar text-foreground hover:bg-sidebar-accent"
                              onClick={() =>
                                setForcedAppsByName((previous) => ({
                                  ...previous,
                                  [app.name]: !isForced,
                                }))
                              }
                            >
                              {isForced ? "Disable force" : "Force to all"}
                            </Button>
                            <Button
                              type="button"
                              size="xs"
                              variant="ghost"
                              className="shrink-0 rounded-[min(var(--radius-md),12px)] border border-transparent bg-sidebar text-foreground hover:bg-sidebar-accent"
                              onClick={() => handleDisconnectApp(app.name)}
                            >
                              Unconnect
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </section>
          )}
            </>
          )}
        </>
      ) : (
        hasAnyConnectedApps || forcedAppNames.length > 0 ? (
          <section className="overflow-hidden rounded-xl border border-border bg-background">
            <table className="w-full table-fixed border-collapse text-[0.8rem]">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="w-[34%] px-2.5 py-1.5 text-left font-medium">
                    Member
                  </th>
                  <th className="w-[20%] px-2.5 py-1.5 text-left font-medium">
                    Role
                  </th>
                  <th className="w-[20%] px-2.5 py-1.5 text-left font-medium">
                    Effective integrations
                  </th>
                  <th className="w-[26%] px-2.5 py-1.5 text-left font-medium">
                    Forced integrations
                  </th>
                </tr>
              </thead>
              <tbody>
                {workspaceMembers.map((member) => {
                  const connectedNames = member.integratedApps
                    .filter(
                      (app) =>
                        app.status === "Connected" &&
                        !disconnectedAppsByName[app.name]
                    )
                    .map((app) => app.name)
                  const effectiveSet = new Set([
                    ...connectedNames,
                    ...forcedAppNames,
                  ])

                  return (
                    <tr
                      key={member.id}
                      className="border-b border-border/70 last:border-b-0"
                    >
                      <td className="px-2.5 py-1.5 pe-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="size-7 !rounded-full">
                            <AvatarImage
                              src={member.avatarUrl}
                              alt={member.name}
                              className="!rounded-full object-cover"
                            />
                            <AvatarFallback className="!rounded-full text-[10px] font-semibold">
                              {member.initials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="truncate text-[0.8rem] font-medium text-foreground">
                              {member.name}
                            </p>
                            <p className="truncate text-[11px] text-muted-foreground">
                              {member.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-2.5 py-1.5 text-foreground">
                        {member.role}
                      </td>
                      <td className="px-2.5 py-1.5 text-foreground">
                        {effectiveSet.size}
                      </td>
                      <td className="px-2.5 py-1.5">
                        {forcedAppNames.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {forcedAppNames.map((appName) => (
                              <Badge
                                key={`${member.id}-${appName}`}
                                variant="blue"
                              >
                                {appName}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">
                            None
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </section>
        ) : (
          <EmptyIntegrationsPattern />
        )
      )}
    </div>
  )
}

function DataControlsSettingsContent() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="space-y-0.5">
        <p className="text-sm font-semibold text-foreground">Data controls</p>
        <p className="text-sm text-muted-foreground">
          Manage permanent deletion actions for workspace data.
        </p>
      </div>

      <div className="mt-4 space-y-3">
        <section className="flex flex-col gap-2 rounded-xl border border-border bg-background px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-0.5">
            <p className="text-sm font-medium text-foreground">
              Delete all uploaded files
            </p>
            <p className="text-sm text-muted-foreground">
              Permanently remove all uploaded documents and assets.
            </p>
          </div>
          <Button type="button" variant="destructive" size="sm">
            <Trash2 className="h-3.5 w-3.5" />
            Delete files
          </Button>
        </section>

        <section className="flex flex-col gap-2 rounded-xl border border-border bg-background px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-0.5">
            <p className="text-sm font-medium text-foreground">
              Delete all chats and workflows
            </p>
            <p className="text-sm text-muted-foreground">
              Permanently remove conversation history and workflow data.
            </p>
          </div>
          <Button type="button" variant="destructive" size="sm">
            <Trash2 className="h-3.5 w-3.5" />
            Delete chats and workflows
          </Button>
        </section>
      </div>
    </div>
  )
}

function ReferAndEarnSettingsContent() {
  const referredUsers = 12
  const totalCredits = 310
  const referralCode = accountProfile.userId.replace(/^usr_/, "").toUpperCase()
  const referralLink = React.useMemo(() => {
    if (typeof window === "undefined") {
      return `https://app.atmet.ai/signup?ref=${referralCode}`
    }
    return `${window.location.origin}/signup?ref=${referralCode}`
  }, [referralCode])
  const [copied, setCopied] = React.useState(false)
  const [payoutStatus, setPayoutStatus] = React.useState("")

  React.useEffect(() => {
    if (!copied) return
    const timeoutId = window.setTimeout(() => {
      setCopied(false)
    }, 2000)
    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [copied])

  const handleCopy = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(referralLink)
      setCopied(true)
    } catch {}
  }, [referralLink])

  const handleShare = React.useCallback(async () => {
    const shareMessage =
      "Join Atmet AI with my referral link and get 25% for your first year."
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({
          title: "Atmet AI referral",
          text: shareMessage,
          url: referralLink,
        })
        return
      }
      await navigator.clipboard.writeText(referralLink)
      setCopied(true)
    } catch {}
  }, [referralLink])

  const handleRequestMoney = React.useCallback(() => {
    setPayoutStatus("Payout request submitted. Our team will contact you soon.")
  }, [])

  return (
    <div className="space-y-3 pb-1">
      <div className="space-y-0.5 px-1">
        <p className="text-sm font-semibold text-foreground">Refer and earn</p>
        <p className="text-sm text-muted-foreground">
          Share your unique link. New clients get 25% for one year, and you
          earn referral credits when they pay.
        </p>
      </div>

      <section className="p-1">
        <Label htmlFor="referral-link" className="text-xs text-muted-foreground">
          Your unique referral link
        </Label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <Input id="referral-link" value={referralLink} readOnly />
          <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
            <Copy className="h-3.5 w-3.5" />
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button type="button" size="sm" onClick={handleShare}>
            <Share2 className="h-3.5 w-3.5" />
            Share
          </Button>
        </div>
      </section>

      <section className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-background px-3 py-2.5">
          <p className="text-[11px] text-muted-foreground">Referred users</p>
          <p className="text-sm font-semibold text-foreground">{referredUsers}</p>
        </div>
        <div className="rounded-xl border border-border bg-background px-3 py-2.5">
          <p className="text-[11px] text-muted-foreground">Total credits</p>
          <p className="text-sm font-semibold text-foreground">
            {totalCredits.toLocaleString()} credits
          </p>
        </div>
        <div className="rounded-xl border border-border bg-background px-3 py-2.5">
          <p className="text-[11px] text-muted-foreground">Balance payout</p>
          <Button type="button" size="sm" className="mt-1" onClick={handleRequestMoney}>
            Request money
          </Button>
          {payoutStatus ? (
            <p className="mt-2 text-xs text-muted-foreground">{payoutStatus}</p>
          ) : null}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-sidebar p-3">
        <p className="text-sm font-semibold text-foreground">Example earnings</p>
        <p className="mt-1 text-sm text-muted-foreground">
          If a referred client stays on the monthly plan for 12 months, you
          receive 120 credits. If they choose the yearly plan, you receive 150
          credits from that purchase.
        </p>
      </section>
    </div>
  )
}

function BillingSettingsContent({
  onGoToMembers,
  onGoToUsageLimits,
}: {
  onGoToMembers: () => void
  onGoToUsageLimits: () => void
}) {
  const seatsUsed = 1
  const seatsLimit = 1
  const creditsUsed = 0
  const creditsLimit = 250

  const seatsProgress = Math.min(100, (seatsUsed / seatsLimit) * 100)
  const creditsProgress = Math.min(100, (creditsUsed / creditsLimit) * 100)

  return (
    <div className="space-y-3 pb-1">
      <section className="rounded-xl border border-border bg-sidebar p-2.5 sm:p-3">
        <div className="overflow-hidden rounded-xl border border-border bg-background">
          <div className="grid md:grid-cols-2">
            <div className="flex min-h-[148px] flex-col justify-between gap-3 px-4 py-3.5 md:border-r md:border-border">
              <div className="flex items-start gap-2.5">
                <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/30 text-foreground">
                  <IconBuilding className="h-4 w-4" />
                </span>
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold text-foreground">
                    Free plan
                  </p>
                  <p className="text-sm text-muted-foreground">
                    $0.00 per user/month, billed monthly
                  </p>
                </div>
              </div>
              <div>
                <Button type="button" size="sm">
                  <Plus className="h-3.5 w-3.5" />
                  Explore plans
                </Button>
              </div>
            </div>

            <div className="flex min-h-[148px] flex-col justify-between gap-3 px-4 py-3.5">
              <div className="space-y-0.5">
                <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  Upcoming bill
                  <IconHelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                </p>
                <p className="text-sm text-muted-foreground">
                  Renews on Apr 20, 2026
                </p>
              </div>
              <div className="flex items-end justify-between">
                <button
                  type="button"
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  Show details
                </button>
                <p className="text-3xl leading-none font-semibold text-foreground">
                  $0.00
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-3 grid md:grid-cols-2 md:divide-x md:divide-border/60">
          <div className="space-y-2.5 border-b border-border/60 px-1 py-1.5 md:border-b-0 md:px-3 md:py-2.5">
            <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <IconUsers className="h-3.5 w-3.5 text-muted-foreground" />
              Seats
            </p>
            <p className="text-sm text-muted-foreground">
              {seatsUsed} / {seatsLimit}
            </p>
            <div className="h-1.5 rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary/80"
                style={{ width: `${seatsProgress}%` }}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onGoToMembers}
            >
              Manage seats
            </Button>
          </div>

          <div className="space-y-2.5 px-1 py-1.5 md:px-3 md:py-2.5">
            <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <IconCreditCard className="h-3.5 w-3.5 text-muted-foreground" />
              Credits
              <IconHelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
            </p>
            <p className="text-sm text-muted-foreground">
              {creditsUsed.toLocaleString()} / {creditsLimit.toLocaleString()}
            </p>
            <div className="h-1.5 rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary/35"
                style={{ width: `${creditsProgress}%` }}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onGoToUsageLimits}
            >
              Usage
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-background px-4 py-3.5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-0.5">
            <p className="text-sm font-semibold text-foreground">
              Manage billing
            </p>
            <p className="text-sm text-muted-foreground">
              View and manage your billing details.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() =>
              window.open(
                BILLING_PORTAL_EXTERNAL_URL,
                "_blank",
                "noopener,noreferrer"
              )
            }
          >
            Billing portal
            <IconChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </section>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Need help?</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              window.location.href = "mailto:support@atmet.ai"
            }}
          >
            Contact support
          </Button>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="text-destructive hover:text-destructive"
        >
          Cancel subscription
        </Button>
      </div>
    </div>
  )
}

type AdminBadgeTone = "default" | "success" | "info" | "danger" | "warning" | "secondary"

const adminBadgeVariants: Record<AdminBadgeTone, BadgeVariant> = {
  default: "neutral",
  success: "green",
  info: "blue",
  danger: "red",
  warning: "amber",
  secondary: "neutral",
}

const adminActivityRows = [
  {
    timestamp: "Today, 10:42 AM",
    actor: "Amir Haddad",
    initials: "AH",
    type: "Login",
    tone: "info" as const,
    description: "Signed in from Amman office network.",
  },
  {
    timestamp: "Today, 10:18 AM",
    actor: "Lina Saad",
    initials: "LS",
    type: "Workflow run",
    tone: "success" as const,
    description: "Ran customer renewal summary workflow.",
  },
  {
    timestamp: "Today, 09:56 AM",
    actor: "System",
    initials: "SY",
    type: "Error",
    tone: "danger" as const,
    description: "Slack delivery failed for workflow error alert.",
  },
  {
    timestamp: "Today, 09:21 AM",
    actor: "Fadi Mourad",
    initials: "FM",
    type: "Settings changed",
    tone: "warning" as const,
    description: "Updated workflow publishing permission for members.",
  },
  {
    timestamp: "Yesterday, 06:44 PM",
    actor: "Yara Nasser",
    initials: "YN",
    type: "File uploaded",
    tone: "default" as const,
    description: "Uploaded Q2 campaign budget spreadsheet.",
  },
  {
    timestamp: "Yesterday, 05:12 PM",
    actor: "Omar Khaled",
    initials: "OK",
    type: "Workflow run",
    tone: "success" as const,
    description: "Generated weekly support handoff report.",
  },
  {
    timestamp: "Yesterday, 04:30 PM",
    actor: "Amir Haddad",
    initials: "AH",
    type: "Member invited",
    tone: "info" as const,
    description: "Invited dina.saleh@atmet.ai as Workspace Member.",
  },
  {
    timestamp: "Yesterday, 01:05 PM",
    actor: "Lina Saad",
    initials: "LS",
    type: "File uploaded",
    tone: "default" as const,
    description: "Added product feedback import data.",
  },
  {
    timestamp: "Mar 24, 2026",
    actor: "System",
    initials: "SY",
    type: "Error",
    tone: "danger" as const,
    description: "API key request exceeded monthly workspace cap.",
  },
  {
    timestamp: "Mar 24, 2026",
    actor: "Amir Haddad",
    initials: "AH",
    type: "Settings changed",
    tone: "warning" as const,
    description: "Changed session timeout from 24 hours to 8 hours.",
  },
] as const

const adminMembers = [
  {
    id: "adm_mem_001",
    name: "Amir Haddad",
    email: "amir.haddad@atmet.ai",
    role: "Super Admin",
    workspace: "Documentation",
    status: "Active",
    lastActive: "Today, 10:42 AM",
    initials: "AH",
    avatarUrl: accountProfile.avatarUrl,
  },
  {
    id: "adm_mem_002",
    name: "Lina Saad",
    email: "lina.saad@atmet.ai",
    role: "Admin",
    workspace: "Product",
    status: "Active",
    lastActive: "Today, 09:15 AM",
    initials: "LS",
    avatarUrl:
      "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=120&q=80",
  },
  {
    id: "adm_mem_003",
    name: "Omar Khaled",
    email: "omar.khaled@atmet.ai",
    role: "Workspace Admin",
    workspace: "Operations",
    status: "Active",
    lastActive: "Yesterday, 07:40 PM",
    initials: "OK",
    avatarUrl:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80",
  },
  {
    id: "adm_mem_004",
    name: "Yara Nasser",
    email: "yara.nasser@atmet.ai",
    role: "Workspace Member",
    workspace: "Marketing",
    status: "Invited",
    lastActive: "Pending invite",
    initials: "YN",
    avatarUrl:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=120&q=80",
  },
  {
    id: "adm_mem_005",
    name: "Fadi Mourad",
    email: "fadi.mourad@atmet.ai",
    role: "Workspace Admin",
    workspace: "Documentation",
    status: "Suspended",
    lastActive: "Mar 24, 2026",
    initials: "FM",
    avatarUrl:
      "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?auto=format&fit=crop&w=120&q=80",
  },
] as const

const adminIntegrationRows = [
  {
    app: "Slack",
    connectedBy: "Amir Haddad",
    status: "Connected",
    tone: "success" as const,
    scope: "Messages, channels",
    lastUsed: "Today",
    forced: true,
  },
  {
    app: "Google Drive",
    connectedBy: "Lina Saad",
    status: "Connected",
    tone: "success" as const,
    scope: "Files, folders",
    lastUsed: "Yesterday",
    forced: false,
  },
  {
    app: "Zendesk",
    connectedBy: "Omar Khaled",
    status: "Error",
    tone: "danger" as const,
    scope: "Tickets, users",
    lastUsed: "Mar 24, 2026",
    forced: false,
  },
  {
    app: "Salesforce",
    connectedBy: "Not connected",
    status: "Not configured",
    tone: "secondary" as const,
    scope: "Accounts, deals",
    lastUsed: "Never",
    forced: false,
  },
] as const

const adminAuditRows = [
  {
    id: "audit_001",
    timestamp: "Today, 10:42 AM",
    actor: "Amir Haddad",
    initials: "AH",
    eventType: "Login",
    tone: "info" as const,
    target: "Admin console",
    ip: "10.14.20.19",
    details: { method: "password", mfa: true, region: "Amman" },
  },
  {
    id: "audit_002",
    timestamp: "Today, 10:18 AM",
    actor: "Lina Saad",
    initials: "LS",
    eventType: "Workflow run",
    tone: "success" as const,
    target: "Renewal summary",
    ip: "10.14.21.33",
    details: { workflowId: "wf_renewal_42", status: "completed" },
  },
  {
    id: "audit_003",
    timestamp: "Today, 09:56 AM",
    actor: "System",
    initials: "SY",
    eventType: "Error",
    tone: "danger" as const,
    target: "Slack alert",
    ip: "127.0.0.1",
    details: { code: "slack_webhook_failed", retries: 3 },
  },
  {
    id: "audit_004",
    timestamp: "Yesterday, 04:30 PM",
    actor: "Amir Haddad",
    initials: "AH",
    eventType: "Member invited",
    tone: "info" as const,
    target: "dina.saleh@atmet.ai",
    ip: "10.14.20.19",
    details: { role: "Workspace Member", inviteId: "inv_8831" },
  },
] as const

function AdminPage({
  section,
  actions,
  children,
}: {
  section: AdminConsoleSection
  actions?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-col gap-2 px-1 pb-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-0.5">
          <h2 className="text-base font-medium text-foreground">{section}</h2>
          <p className="text-[13px] text-muted-foreground">
            {adminConsoleDescriptions[section]}
          </p>
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap gap-1.5">{actions}</div> : null}
      </div>
      <div className="no-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto px-1 pb-1 [&_input:not([type=checkbox])]:h-7">
        {children}
      </div>
    </div>
  )
}

function AdminSelect({
  label,
  value,
  options,
  onChange,
  className,
}: {
  label?: string
  value: string
  options: readonly string[]
  onChange: (value: string) => void
  className?: string
}) {
  return (
    <div className={cn("space-y-1 text-[13px] text-muted-foreground", className)}>
      {label ? <span>{label}</span> : null}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="surface-sidebar-field h-7 w-full justify-between rounded-lg border-input bg-transparent px-2.5 text-sm font-normal text-foreground"
            />
          }
        >
          <span className="truncate">{value}</span>
          <IconChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-40 rounded-lg p-1">
          {options.map((option) => (
            <DropdownMenuItem key={option} onClick={() => onChange(option)}>
              {option}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

function AdminToggle({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean
  disabled?: boolean
  onChange?: (checked: boolean) => void
}) {
  return (
    <button
      type="button"
      data-toggle-control="true"
      disabled={disabled}
      aria-pressed={checked}
      onClick={() => onChange?.(!checked)}
      className={cn(
        "inline-flex h-6 w-11 shrink-0 items-center overflow-hidden rounded-full border-[0.5px] border-border bg-muted px-0.5 transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        checked && "bg-primary"
      )}
    >
      <span
        className={cn(
          "block size-5 rounded-full bg-background transition-transform",
          checked && "translate-x-5"
        )}
      />
    </button>
  )
}

function AdminSaveBar({
  children = "Save",
  onClick,
}: {
  children?: React.ReactNode
  onClick?: () => void
}) {
  return (
    <div className="sticky bottom-0 -mx-1 flex justify-end border-t border-border bg-background/95 px-1 pt-3">
      <Button type="button" size="sm" onClick={onClick}>
        {children}
      </Button>
    </div>
  )
}

function AdminEmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex min-h-52 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-background px-4 py-8 text-center">
      <Icon className="h-6 w-6 text-muted-foreground" />
      <p className="mt-2 text-sm font-medium text-foreground">{title}</p>
      <p className="mt-1 max-w-sm text-[13px] text-muted-foreground">
        {description}
      </p>
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  )
}

function openUserProfile(name: string, returnToAdminSection?: AdminConsoleSection) {
  const member = workspaceMembers.find((candidate) => candidate.name === name)
  if (!member) return

  window.dispatchEvent(
    new CustomEvent<OpenSettingsPanelDetail>(OPEN_SETTINGS_PANEL_EVENT, {
      detail: {
        section: "Members",
        memberId: member.id,
        memberQuery: member.name,
        returnToAdminSection,
      },
    })
  )
}

function AdminAvatar({
  initials,
  name,
  returnToAdminSection,
}: {
  initials: string
  name: string
  returnToAdminSection?: AdminConsoleSection
}) {
  const avatar = (
    <Avatar className="size-7 !rounded-full">
      <AvatarFallback className="!rounded-full text-[10px] font-medium">
        {initials}
      </AvatarFallback>
      <span className="sr-only">{name}</span>
    </Avatar>
  )

  if (!workspaceMembers.some((member) => member.name === name)) return avatar

  return (
    <button
      type="button"
      data-toggle-control="true"
      onClick={(event) => {
        event.stopPropagation()
        openUserProfile(name, returnToAdminSection)
      }}
      className="rounded-full outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      aria-label={`Open ${name}'s profile`}
    >
      {avatar}
    </button>
  )
}

function AdminOverviewConsoleContent() {
  const [datePeriod, setDatePeriod] = React.useState("Last 7 days")
  const [activityQuery, setActivityQuery] = React.useState("")
  const [activityType, setActivityType] = React.useState("All event types")
  const [activityWorkspace, setActivityWorkspace] = React.useState("All workspaces")
  const [activityActor, setActivityActor] = React.useState("All actors")
  const statsByPeriod = {
    Today: [
      { label: "Active users", value: "128" },
      { label: "New users", value: "8" },
      { label: "New workspaces", value: "2" },
      { label: "Workflow runs", value: "1,842" },
      { label: "Errors", value: "7" },
      { label: "Storage used", value: "42 GB" },
    ],
    "Last 7 days": [
      { label: "Active users", value: "412" },
      { label: "New users", value: "46" },
      { label: "New workspaces", value: "11" },
      { label: "Workflow runs", value: "9,684" },
      { label: "Errors", value: "31" },
      { label: "Storage used", value: "42 GB" },
    ],
    "Last 30 days": [
      { label: "Active users", value: "1,284" },
      { label: "New users", value: "186" },
      { label: "New workspaces", value: "38" },
      { label: "Workflow runs", value: "38,420" },
      { label: "Errors", value: "124" },
      { label: "Storage used", value: "42 GB" },
    ],
    "Last 90 days": [
      { label: "Active users", value: "2,916" },
      { label: "New users", value: "521" },
      { label: "New workspaces", value: "96" },
      { label: "Workflow runs", value: "112,680" },
      { label: "Errors", value: "348" },
      { label: "Storage used", value: "42 GB" },
    ],
  } as const
  const stats = statsByPeriod[datePeriod as keyof typeof statsByPeriod]
  const activityRows = adminActivityRows.map((row) => ({
    ...row,
    workspace:
      adminMembers.find((member) => member.name === row.actor)?.workspace ??
      "System",
  }))
  const filteredActivityRows = activityRows.filter((row) => {
    const normalizedQuery = activityQuery.trim().toLowerCase()
    const matchesQuery =
      normalizedQuery.length === 0 ||
      row.actor.toLowerCase().includes(normalizedQuery) ||
      row.workspace.toLowerCase().includes(normalizedQuery) ||
      row.description.toLowerCase().includes(normalizedQuery)
    const matchesType =
      activityType === "All event types" || row.type === activityType
    const matchesWorkspace =
      activityWorkspace === "All workspaces" ||
      row.workspace === activityWorkspace
    const matchesActor = activityActor === "All actors" || row.actor === activityActor
    const matchesPeriod =
      datePeriod === "Last 90 days" ||
      datePeriod === "Last 30 days" ||
      (datePeriod === "Last 7 days" && !row.timestamp.startsWith("Mar 24")) ||
      (datePeriod === "Today" && row.timestamp.startsWith("Today"))
    return matchesQuery && matchesType && matchesWorkspace && matchesActor && matchesPeriod
  })

  return (
    <AdminPage
      section="Admin overview"
      actions={
        <>
          <AdminSelect
            value={datePeriod}
            options={["Today", "Last 7 days", "Last 30 days", "Last 90 days"]}
            onChange={setDatePeriod}
            className="w-36"
          />
          <Button type="button" size="sm">
            <IconUserPlus className="h-3.5 w-3.5" />
            Invite user
          </Button>
          <Button type="button" variant="outline" size="sm">
            <IconDownload className="h-3.5 w-3.5" />
            Export usage
          </Button>
        </>
      }
    >
      <section className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-lg bg-muted px-3 py-3">
            <p className="text-[13px] text-muted-foreground">{stat.label}</p>
            <p className="mt-1 text-2xl font-medium tabular-nums text-foreground">
              {stat.value}
            </p>
          </div>
        ))}
      </section>

      <section className="overflow-hidden rounded-xl border border-border bg-background">
        <div className="border-b border-border px-3 py-2.5">
          <p className="text-sm font-medium text-foreground">Recent activity</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_150px_150px_150px]">
            <div className="relative">
              <IconSearch className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={activityQuery}
                onChange={(event) => setActivityQuery(event.target.value)}
                placeholder="Search activity"
                className="h-7 pl-8"
              />
            </div>
            <AdminSelect
              value={activityType}
              options={["All event types", ...Array.from(new Set(activityRows.map((row) => row.type)))]}
              onChange={setActivityType}
            />
            <AdminSelect
              value={activityWorkspace}
              options={["All workspaces", ...initialWorkspaces.map((workspace) => workspace.name), "System"]}
              onChange={setActivityWorkspace}
            />
            <AdminSelect
              value={activityActor}
              options={["All actors", ...Array.from(new Set(activityRows.map((row) => row.actor)))]}
              onChange={setActivityActor}
            />
          </div>
        </div>
        <div className="divide-y divide-border">
          {filteredActivityRows.map((row) => (
            <div
              key={`${row.timestamp}-${row.actor}-${row.description}`}
              onClick={() => openUserProfile(row.actor, "Admin overview")}
              className={cn(
                "grid gap-2 px-3 py-2.5 text-sm sm:grid-cols-[140px_1fr_160px_150px] sm:items-center",
                row.actor !== "System" &&
                  "cursor-pointer transition-colors hover:bg-muted/35"
              )}
            >
              <span className="text-[13px] text-muted-foreground">{row.timestamp}</span>
              <span className="flex items-center gap-2 text-foreground">
                <AdminAvatar
                  initials={row.initials}
                  name={row.actor}
                  returnToAdminSection="Admin overview"
                />
                <button
                  type="button"
                  onClick={() => openUserProfile(row.actor, "Admin overview")}
                  className="text-left"
                >
                  {row.actor}
                </button>
              </span>
              <span className="truncate text-[13px] text-foreground">{row.workspace}</span>
              <Badge variant={adminBadgeVariants[row.tone]}>{row.type}</Badge>
            </div>
          ))}
          {filteredActivityRows.length === 0 ? (
            <p className="px-3 py-8 text-center text-[13px] text-muted-foreground">
              No activity matches the current filters.
            </p>
          ) : null}
        </div>
      </section>
    </AdminPage>
  )
}

function WorkspaceProvisioningConsoleContent() {
  const [workspaceName, setWorkspaceName] = React.useState("")
  const [workspaceSlug, setWorkspaceSlug] = React.useState("")
  const [country, setCountry] = React.useState("Jordan")
  const [plan, setPlan] = React.useState("Team")
  const [ownerName, setOwnerName] = React.useState("")
  const [ownerEmail, setOwnerEmail] = React.useState("")
  const [ownerRole, setOwnerRole] = React.useState<PlatformRole>("Workspace Admin")
  const [apiKeyName, setApiKeyName] = React.useState("Default workspace key")
  const [apiExpiry, setApiExpiry] = React.useState("Never")
  const [apiEnabled, setApiEnabled] = React.useState(true)
  const [workflowsEnabled, setWorkflowsEnabled] = React.useState(true)
  const [appsEnabled, setAppsEnabled] = React.useState(true)
  const [monthlyTokenCap, setMonthlyTokenCap] = React.useState("50000")
  const [seatLimit, setSeatLimit] = React.useState("10")
  const [createdWorkspaces, setCreatedWorkspaces] = React.useState<
    Array<{
      id: string
      name: string
      owner: string
      country: string
      plan: string
      apiKey: string | null
    }>
  >([])

  const provisionWorkspace = () => {
    const trimmedName = workspaceName.trim()
    const trimmedEmail = ownerEmail.trim()
    if (!trimmedName || !trimmedEmail) return

    setCreatedWorkspaces((previous) => [
      {
        id: `provisioned_${Date.now()}`,
        name: trimmedName,
        owner: trimmedEmail,
        country,
        plan,
        apiKey: apiEnabled
          ? `ak_ws_${Math.random().toString(36).slice(2, 14)}`
          : null,
      },
      ...previous,
    ])
    setWorkspaceName("")
    setWorkspaceSlug("")
    setOwnerName("")
    setOwnerEmail("")
  }

  return (
    <AdminPage
      section="Workspace provisioning"
      actions={
        <Button
          type="button"
          size="sm"
          disabled={!workspaceName.trim() || !ownerEmail.trim()}
          onClick={provisionWorkspace}
        >
          <IconPlus className="h-3.5 w-3.5" />
          Create workspace
        </Button>
      }
    >
      <section className="grid gap-3 lg:grid-cols-2">
        <div className="space-y-3 rounded-xl border border-border bg-background p-3">
          <div>
            <p className="text-sm font-medium text-foreground">Workspace setup</p>
            <p className="text-[13px] text-muted-foreground">
              Define the workspace identity and commercial defaults.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="space-y-1 text-[13px] text-muted-foreground">
              Workspace name
              <Input
                value={workspaceName}
                onChange={(event) => {
                  const name = event.target.value
                  setWorkspaceName(name)
                  setWorkspaceSlug(
                    name
                      .toLowerCase()
                      .trim()
                      .replace(/[^a-z0-9]+/g, "-")
                      .replace(/^-|-$/g, "")
                  )
                }}
                placeholder="Acme Operations"
              />
            </label>
            <label className="space-y-1 text-[13px] text-muted-foreground">
              Workspace slug
              <Input
                value={workspaceSlug}
                onChange={(event) => setWorkspaceSlug(event.target.value)}
                placeholder="acme-operations"
              />
            </label>
            <AdminSelect
              label="Country"
              value={country}
              options={workspaceCountries}
              onChange={setCountry}
            />
            <AdminSelect
              label="Plan"
              value={plan}
              options={["Free", "Team", "Business", "Enterprise"]}
              onChange={setPlan}
            />
          </div>
        </div>

        <div className="space-y-3 rounded-xl border border-border bg-background p-3">
          <div>
            <p className="text-sm font-medium text-foreground">Initial user</p>
            <p className="text-[13px] text-muted-foreground">
              Create the first user and assign workspace ownership.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="space-y-1 text-[13px] text-muted-foreground">
              Full name
              <Input
                value={ownerName}
                onChange={(event) => setOwnerName(event.target.value)}
                placeholder="Workspace owner"
              />
            </label>
            <label className="space-y-1 text-[13px] text-muted-foreground">
              Email address
              <Input
                type="email"
                value={ownerEmail}
                onChange={(event) => setOwnerEmail(event.target.value)}
                placeholder="owner@company.com"
              />
            </label>
            <AdminSelect
              label="Role"
              value={ownerRole}
              options={platformRoles}
              onChange={(value) => setOwnerRole(value as PlatformRole)}
              className="sm:col-span-2"
            />
          </div>
        </div>

        <div className="space-y-3 rounded-xl border border-border bg-background p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-foreground">API access</p>
              <p className="text-[13px] text-muted-foreground">
                Generate a workspace API key during provisioning.
              </p>
            </div>
            <AdminToggle checked={apiEnabled} onChange={setApiEnabled} />
          </div>
          {apiEnabled ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="space-y-1 text-[13px] text-muted-foreground">
                Key name
                <Input
                  value={apiKeyName}
                  onChange={(event) => setApiKeyName(event.target.value)}
                />
              </label>
              <AdminSelect
                label="Expiry"
                value={apiExpiry}
                options={["Never", "30 days", "90 days", "1 year"]}
                onChange={setApiExpiry}
              />
              <div className="sm:col-span-2">
                <p className="text-[13px] text-muted-foreground">Scopes</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {["Chat", "Workflows", "Files", "Apps", "Members"].map((scope) => (
                    <Badge key={scope} variant="neutral">
                      {scope}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="space-y-3 rounded-xl border border-border bg-background p-3">
          <div>
            <p className="text-sm font-medium text-foreground">Limits and features</p>
            <p className="text-[13px] text-muted-foreground">
              Apply the initial operating guardrails for the workspace.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="space-y-1 text-[13px] text-muted-foreground">
              Monthly token cap
              <Input
                type="number"
                value={monthlyTokenCap}
                onChange={(event) => setMonthlyTokenCap(event.target.value)}
              />
            </label>
            <label className="space-y-1 text-[13px] text-muted-foreground">
              Seat limit
              <Input
                type="number"
                value={seatLimit}
                onChange={(event) => setSeatLimit(event.target.value)}
              />
            </label>
          </div>
          <div className="space-y-2">
            {[
              ["Workflow creation", workflowsEnabled, setWorkflowsEnabled],
              ["App connections", appsEnabled, setAppsEnabled],
            ].map(([label, checked, setChecked]) => (
              <div
                key={label as string}
                className="flex items-center justify-between gap-3 rounded-lg bg-muted/60 px-2.5 py-2"
              >
                <span className="text-[13px] font-medium text-foreground">
                  {label as string}
                </span>
                <AdminToggle
                  checked={checked as boolean}
                  onChange={setChecked as React.Dispatch<React.SetStateAction<boolean>>}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {createdWorkspaces.length > 0 ? (
        <section className="overflow-hidden rounded-xl border border-border bg-background">
          <div className="border-b border-border px-3 py-2.5">
            <p className="text-sm font-medium text-foreground">
              Recently provisioned
            </p>
          </div>
          <table className="w-full table-fixed border-collapse text-[0.8rem]">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="w-[22%] px-2.5 py-1.5 text-left font-medium">Workspace</th>
                <th className="w-[24%] px-2.5 py-1.5 text-left font-medium">Initial user</th>
                <th className="w-[16%] px-2.5 py-1.5 text-left font-medium">Country</th>
                <th className="w-[12%] px-2.5 py-1.5 text-left font-medium">Plan</th>
                <th className="w-[26%] px-2.5 py-1.5 text-left font-medium">API key</th>
              </tr>
            </thead>
            <tbody>
              {createdWorkspaces.map((workspace) => (
                <tr key={workspace.id} className="border-b border-border/70 last:border-b-0">
                  <td className="px-2.5 py-2 font-medium text-foreground">{workspace.name}</td>
                  <td className="truncate px-2.5 py-2 text-muted-foreground">{workspace.owner}</td>
                  <td className="truncate px-2.5 py-2 text-foreground">{workspace.country}</td>
                  <td className="px-2.5 py-2"><Badge variant="blue">{workspace.plan}</Badge></td>
                  <td className="px-2.5 py-2 text-muted-foreground">
                    {workspace.apiKey ? (
                      <span className="font-mono text-xs">{workspace.apiKey}</span>
                    ) : (
                      "Disabled"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}
    </AdminPage>
  )
}

function UsersWorkspacesConsoleContent() {
  const [query, setQuery] = React.useState("")
  const [roleFilter, setRoleFilter] = React.useState("All roles")
  const [statusFilter, setStatusFilter] = React.useState("All")
  const [selectedRows, setSelectedRows] = React.useState<string[]>([])
  const [inviteOpen, setInviteOpen] = React.useState(false)
  const [inviteEmail, setInviteEmail] = React.useState("")
  const [inviteRole, setInviteRole] = React.useState<PlatformRole>("Workspace Member")
  const statusTones: Record<string, AdminBadgeTone> = {
    Active: "success",
    Invited: "info",
    Suspended: "warning",
  }
  const filteredMembers = adminMembers.filter((member) => {
    const matchesQuery =
      query.trim().length === 0 ||
      member.name.toLowerCase().includes(query.toLowerCase()) ||
      member.email.toLowerCase().includes(query.toLowerCase()) ||
      member.workspace.toLowerCase().includes(query.toLowerCase())
    const matchesRole = roleFilter === "All roles" || member.role === roleFilter
    const matchesStatus = statusFilter === "All" || member.status === statusFilter
    return matchesQuery && matchesRole && matchesStatus
  })
  const allFilteredSelected =
    filteredMembers.length > 0 &&
    filteredMembers.every((member) => selectedRows.includes(member.id))

  return (
    <AdminPage section="Users & workspaces">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <IconSearch className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name, email, or workspace"
              className="h-8 pl-8"
            />
          </div>
          <AdminSelect
            value={roleFilter}
            options={["All roles", ...platformRoles]}
            onChange={setRoleFilter}
            className="sm:w-36"
          />
          <AdminSelect
            value={statusFilter}
            options={["All", "Active", "Invited", "Suspended"]}
            onChange={setStatusFilter}
            className="sm:w-36"
          />
        </div>
        <Button type="button" size="sm" onClick={() => setInviteOpen(true)}>
          <IconUserPlus className="h-3.5 w-3.5" />
          Invite user
        </Button>
      </div>

      {selectedRows.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted px-3 py-2">
          <p className="text-[13px] text-muted-foreground">
            {selectedRows.length} selected
          </p>
          <div className="flex gap-1.5">
            <Button type="button" size="xs" variant="outline">Suspend selected</Button>
            <Button type="button" size="xs" variant="destructive">Remove selected</Button>
          </div>
        </div>
      ) : null}

      {inviteOpen ? (
        <section className="rounded-xl border border-border bg-background p-3">
          <div className="grid gap-2 sm:grid-cols-[1fr_160px_auto] sm:items-end">
            <label className="space-y-1 text-[13px] text-muted-foreground">
              Email address
              <Input
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                placeholder="member@company.com"
                className="h-8"
              />
            </label>
            <AdminSelect
              label="Role"
              value={inviteRole}
              options={platformRoles}
              onChange={(value) => setInviteRole(value as PlatformRole)}
            />
            <Button
              type="button"
              size="sm"
              onClick={() => {
                setInviteOpen(false)
                setInviteEmail("")
                setInviteRole("Workspace Member")
              }}
            >
              Send invite
            </Button>
          </div>
        </section>
      ) : null}

      {filteredMembers.length === 0 ? (
        <AdminEmptyState
          icon={IconUsers}
          title="No users found"
          description="No users or workspace assignments match the current search and filters."
          action={
            <Button type="button" size="sm" onClick={() => setInviteOpen(true)}>
              Invite your first user
            </Button>
          }
        />
      ) : (
        <section className="overflow-hidden rounded-xl border border-border bg-background">
          <table className="w-full table-fixed border-collapse text-[0.8rem]">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="w-8 px-2 py-1.5 text-left font-medium">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={(event) =>
                      setSelectedRows(
                        event.target.checked
                          ? filteredMembers.map((member) => member.id)
                          : []
                      )
                    }
                    className="accent-primary"
                    aria-label="Select all members"
                  />
                </th>
                <th className="w-[18%] px-2.5 py-1.5 text-left font-medium">Name</th>
                <th className="w-[21%] px-2.5 py-1.5 text-left font-medium">Email</th>
                <th className="w-[14%] px-2.5 py-1.5 text-left font-medium">Workspace</th>
                <th className="w-[10%] px-2.5 py-1.5 text-left font-medium">Role</th>
                <th className="w-[11%] px-2.5 py-1.5 text-left font-medium">Status</th>
                <th className="w-[17%] px-2.5 py-1.5 text-left font-medium">Last active</th>
                <th className="w-[9%] px-2.5 py-1.5 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map((member) => (
                <tr
                  key={member.id}
                  onClick={() => openUserProfile(member.name, "Users & workspaces")}
                  className="cursor-pointer border-b border-border/70 transition-colors last:border-b-0 hover:bg-muted/35"
                >
                  <td className="px-2 py-2">
                    <input
                      type="checkbox"
                      checked={selectedRows.includes(member.id)}
                      onClick={(event) => event.stopPropagation()}
                      onChange={(event) =>
                        setSelectedRows((previous) =>
                          event.target.checked
                            ? [...previous, member.id]
                            : previous.filter((id) => id !== member.id)
                        )
                      }
                      className="accent-primary"
                      aria-label={`Select ${member.name}`}
                    />
                  </td>
                  <td className="px-2.5 py-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <AdminAvatar
                        initials={member.initials}
                        name={member.name}
                        returnToAdminSection="Users & workspaces"
                      />
                      <button
                        type="button"
                        onClick={() => openUserProfile(member.name, "Users & workspaces")}
                        className="truncate text-left font-medium text-foreground"
                      >
                        {member.name}
                      </button>
                    </div>
                  </td>
                  <td className="truncate px-2.5 py-2 text-muted-foreground">{member.email}</td>
                  <td className="truncate px-2.5 py-2 text-foreground">{member.workspace}</td>
                  <td className="px-2.5 py-2 text-foreground">{member.role}</td>
                  <td className="px-2.5 py-2">
                    <Badge variant={adminBadgeVariants[statusTones[member.status]]}>
                      {member.status}
                    </Badge>
                  </td>
                  <td className="px-2.5 py-2 text-muted-foreground">{member.lastActive}</td>
                  <td className="px-2.5 py-2 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={<Button type="button" variant="ghost" size="icon-xs" aria-label={`${member.name} actions`} onClick={(event) => event.stopPropagation()} />}
                      >
                        <IconDots className="h-3.5 w-3.5" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="min-w-36">
                        <DropdownMenuItem>Change role</DropdownMenuItem>
                        <DropdownMenuItem>Suspend</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive">Remove</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </AdminPage>
  )
}

function RolesPermissionsConsoleContent() {
  const roles = platformRoles
  const permissions = [
    ["aiChatAccess", "AI chat access", "Use workspace AI chat and model routing."],
    ["workflowCreation", "Workflow creation", "Create workflow drafts and internal automations."],
    ["workflowPublishing", "Workflow publishing", "Publish workflow versions for team use."],
    ["skillCreation", "Skill creation", "Create reusable skills and prompt tools."],
    ["fileUpload", "File upload", "Upload workspace documents and business data."],
    ["appConnections", "App connections", "Connect and authorize external applications."],
    ["adminConsoleAccess", "Admin console access", "Open and manage admin console pages."],
    ["apiKeyAccess", "API key access", "Create and revoke workspace API keys."],
    ["billingAccess", "Billing access", "View plan, invoices, and payment method."],
  ] as const
  type PermissionKey = (typeof permissions)[number][0]
  const adminDefaults = Object.fromEntries(
    permissions.map(([key]) => [key, true])
  ) as Record<PermissionKey, boolean>
  const [selectedRole, setSelectedRole] =
    React.useState<PlatformRole>("Super Admin")
  const [rolePermissions, setRolePermissions] = React.useState<
    Record<"Workspace Admin" | "Workspace Member", Record<PermissionKey, boolean>>
  >({
    "Workspace Admin": {
      ...adminDefaults,
      adminConsoleAccess: false,
      apiKeyAccess: false,
      billingAccess: false,
    },
    "Workspace Member": {
      ...adminDefaults,
      workflowPublishing: false,
      adminConsoleAccess: false,
      apiKeyAccess: false,
      billingAccess: false,
    },
  })
  const selectedPermissions =
    selectedRole === "Super Admin" || selectedRole === "Admin"
      ? adminDefaults
      : rolePermissions[selectedRole]

  return (
    <AdminPage section="Roles & permissions">
      <div className="grid min-h-0 gap-3 lg:grid-cols-[220px_1fr]">
        <section className="rounded-xl border border-border bg-background p-2">
          <div className="space-y-1">
            {roles.map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => setSelectedRole(role)}
                className={cn(
                  "flex h-8 w-full items-center justify-between rounded-md px-2 text-left text-sm transition-colors",
                  selectedRole === role
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                {role}
                <IconChevronRight className="h-3.5 w-3.5" />
              </button>
            ))}
          </div>
          <Button type="button" variant="outline" size="sm" className="mt-3 w-full">
            <IconPlus className="h-3.5 w-3.5" />
            Create custom role
          </Button>
        </section>

        <section className="overflow-hidden rounded-xl border border-border bg-background">
          <div className="border-b border-border px-3 py-2.5">
            <p className="text-sm font-medium text-foreground">{selectedRole} permissions</p>
            {selectedRole === "Super Admin" || selectedRole === "Admin" ? (
              <p className="text-[13px] text-muted-foreground">{selectedRole} permissions are locked.</p>
            ) : null}
          </div>
          <div className="divide-y divide-border">
            {permissions.map(([key, name, description]) => (
              <div key={key} className="flex items-center justify-between gap-3 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{name}</p>
                  <p className="text-[13px] text-muted-foreground">{description}</p>
                </div>
                <AdminToggle
                  checked={selectedPermissions[key]}
                  disabled={selectedRole === "Super Admin" || selectedRole === "Admin"}
                  onChange={(checked) => {
                    if (selectedRole === "Super Admin" || selectedRole === "Admin") return
                    setRolePermissions((previous) => ({
                      ...previous,
                      [selectedRole]: {
                        ...previous[selectedRole],
                        [key]: checked,
                      },
                    }))
                  }}
                />
              </div>
            ))}
          </div>
        </section>
      </div>
      <AdminSaveBar />
    </AdminPage>
  )
}

function AccessPoliciesConsoleContent() {
  const [ssoEnabled, setSsoEnabled] = React.useState(false)
  const [domainInput, setDomainInput] = React.useState("")
  const [domains, setDomains] = React.useState(["atmet.ai", "atmet.com"])
  const [mfaMode, setMfaMode] = React.useState("Optional")
  const [sessionTimeout, setSessionTimeout] = React.useState("8 hours")
  const [ipEnabled, setIpEnabled] = React.useState(false)

  return (
    <AdminPage section="Access policies">
      <section className="space-y-3 rounded-xl border border-border bg-background p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-foreground">SSO configuration</p>
            <p className="text-[13px] text-muted-foreground">Require users to authenticate through an identity provider.</p>
          </div>
          <AdminToggle checked={ssoEnabled} onChange={setSsoEnabled} />
        </div>
        {ssoEnabled ? (
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="space-y-1 text-[13px] text-muted-foreground">
              IdP URL
              <Input className="h-8" placeholder="https://idp.company.com/saml" />
            </label>
            <label className="space-y-1 text-[13px] text-muted-foreground">
              Certificate
              <Textarea className="min-h-24" placeholder="Paste certificate" />
            </label>
          </div>
        ) : null}
      </section>

      <section className="rounded-xl border border-border bg-background p-3">
        <p className="text-sm font-medium text-foreground">Allowed email domains</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {domains.map((domain) => (
            <Badge key={domain} variant="neutral" className="gap-1">
              {domain}
              <button
                type="button"
                onClick={() => setDomains((previous) => previous.filter((item) => item !== domain))}
                aria-label={`Remove ${domain}`}
              >
                <IconX className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <Input
            value={domainInput}
            onChange={(event) => setDomainInput(event.target.value)}
            placeholder="company.com"
            className="h-8"
          />
          <Button
            type="button"
            size="sm"
            onClick={() => {
              const nextDomain = domainInput.trim()
              if (!nextDomain) return
              setDomains((previous) => Array.from(new Set([...previous, nextDomain])))
              setDomainInput("")
            }}
          >
            Add
          </Button>
        </div>
      </section>

      <section className="grid gap-3 rounded-xl border border-border bg-background p-3 sm:grid-cols-2">
        <div>
          <p className="mb-1 text-sm font-medium text-foreground">MFA enforcement</p>
          <div className="inline-flex rounded-lg bg-muted p-0.5">
            {["Off", "Optional", "Required"].map((mode) => (
              <Button
                key={mode}
                type="button"
                size="xs"
                variant={mfaMode === mode ? "default" : "ghost"}
                onClick={() => setMfaMode(mode)}
              >
                {mode}
              </Button>
            ))}
          </div>
        </div>
        <AdminSelect
          label="Session timeout"
          value={sessionTimeout}
          options={["1 hour", "8 hours", "24 hours", "7 days"]}
          onChange={setSessionTimeout}
        />
      </section>

      <section className="space-y-3 rounded-xl border border-border bg-background p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-foreground">IP allowlist</p>
            <p className="text-[13px] text-muted-foreground">Restrict access to trusted CIDR ranges.</p>
          </div>
          <AdminToggle checked={ipEnabled} onChange={setIpEnabled} />
        </div>
        {ipEnabled ? <Textarea className="min-h-28" placeholder={"10.0.0.0/8\n192.168.0.0/16"} /> : null}
      </section>
      <AdminSaveBar />
    </AdminPage>
  )
}

function WorkspaceSettingsConsoleContent() {
  const [workspaceName, setWorkspaceName] = React.useState("Documentation")
  const [slug, setSlug] = React.useState("documentation")
  const [timezone, setTimezone] = React.useState("Asia/Amman")
  const [language, setLanguage] = React.useState("English")
  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [deleteText, setDeleteText] = React.useState("")

  return (
    <AdminPage section={"Workspace settings" as AdminConsoleSection}>
      <section className="grid gap-3 rounded-xl border border-border bg-background p-3 sm:grid-cols-2">
        <label className="space-y-1 text-[13px] text-muted-foreground">
          Workspace name
          <Input value={workspaceName} onChange={(event) => setWorkspaceName(event.target.value)} className="h-8" />
        </label>
        <label className="space-y-1 text-[13px] text-muted-foreground">
          Workspace URL/slug
          <div className="flex h-8 items-center rounded-lg border border-input bg-transparent">
            <span className="px-2 text-sm text-muted-foreground">atmet.ai/</span>
            <input
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
              className="min-w-0 flex-1 bg-transparent px-1 text-sm text-foreground outline-none"
            />
          </div>
          <span className="block text-[12px] text-muted-foreground">https://atmet.ai/{slug || "workspace"}</span>
        </label>
        <AdminSelect label="Timezone" value={timezone} options={["Asia/Amman", "UTC", "Europe/London", "America/New_York"]} onChange={setTimezone} />
        <AdminSelect label="Default language" value={language} options={["English", "Arabic", "French", "Spanish"]} onChange={setLanguage} />
      </section>

      <section className="rounded-xl border border-border bg-background p-3">
        <p className="text-sm font-medium text-foreground">Logo</p>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex size-16 items-center justify-center rounded-lg bg-muted text-sm font-medium text-foreground">AT</div>
          <Button type="button" variant="outline" size="sm">Upload new logo</Button>
          <div className="flex min-h-16 flex-1 items-center justify-center rounded-lg border border-dashed border-border px-3 text-[13px] text-muted-foreground">
            Drag and drop a square logo
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-destructive/40 bg-destructive/10 p-3">
        <p className="text-sm font-medium text-destructive">Danger zone</p>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-lg text-[13px] text-muted-foreground">
            Permanently delete this workspace and all its data. This cannot be undone.
          </p>
          <Button type="button" variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
            Delete workspace
          </Button>
        </div>
      </section>
      <AdminSaveBar />

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete workspace</DialogTitle>
            <DialogDescription>
              Type {workspaceName} to confirm permanent deletion.
            </DialogDescription>
          </DialogHeader>
          <Input value={deleteText} onChange={(event) => setDeleteText(event.target.value)} className="h-8" />
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button type="button" variant="destructive" size="sm" disabled={deleteText !== workspaceName}>Delete workspace</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPage>
  )
}

function DataControlsConsoleContent() {
  const [retention, setRetention] = React.useState("90 days")
  const [autoDelete, setAutoDelete] = React.useState(false)
  const [trainingOptOut, setTrainingOptOut] = React.useState(true)
  const [exportConfirmOpen, setExportConfirmOpen] = React.useState(false)

  return (
    <AdminPage section={"Data controls" as AdminConsoleSection}>
      <section className="grid gap-3 rounded-xl border border-border bg-background p-3 sm:grid-cols-2">
        <AdminSelect label="Conversation history retention" value={retention} options={["30 days", "90 days", "1 year", "Forever"]} onChange={setRetention} />
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-foreground">File auto-deletion</p>
              <p className="text-[13px] text-muted-foreground">Remove files after a set number of days.</p>
            </div>
            <AdminToggle checked={autoDelete} onChange={setAutoDelete} />
          </div>
          {autoDelete ? <Input type="number" defaultValue="180" className="h-8" /> : null}
        </div>
      </section>

      <section className="flex items-start justify-between gap-3 rounded-xl border border-border bg-background p-3">
        <div>
          <p className="text-sm font-medium text-foreground">Do not use workspace data to train AI models</p>
          <p className="text-[13px] text-muted-foreground">Opt this workspace out of model training usage.</p>
        </div>
        <AdminToggle checked={trainingOptOut} onChange={setTrainingOptOut} />
      </section>

      <section className="flex flex-col gap-2 rounded-xl border border-border bg-background p-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">Export workspace data</p>
          <p className="text-[13px] text-muted-foreground">Download a full archive of all workspace files, conversations, and workflow data.</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => setExportConfirmOpen(true)}>
          Export all data
        </Button>
      </section>

      <section className="rounded-xl border border-border bg-background p-3">
        <p className="text-sm font-medium text-foreground">GDPR right to erasure</p>
        <p className="text-[13px] text-muted-foreground">Submit a request to remove data associated with a user email after verification.</p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <Input placeholder="person@company.com" className="h-8" />
          <Button type="button" size="sm">Submit erasure request</Button>
        </div>
      </section>
      <AdminSaveBar />

      <Dialog open={exportConfirmOpen} onOpenChange={setExportConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Export workspace data?</DialogTitle>
            <DialogDescription>This prepares a downloadable archive for the current workspace.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => setExportConfirmOpen(false)}>Cancel</Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                const blob = new Blob(["Atmet workspace export"], { type: "text/plain" })
                const url = URL.createObjectURL(blob)
                const link = document.createElement("a")
                link.href = url
                link.download = "atmet-workspace-export.txt"
                link.click()
                URL.revokeObjectURL(url)
                setExportConfirmOpen(false)
              }}
            >
              Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPage>
  )
}

function NotificationsConfigConsoleContent() {
  const [workflowAlerts, setWorkflowAlerts] = React.useState(true)
  const [usageAlerts, setUsageAlerts] = React.useState(true)
  const [digest, setDigest] = React.useState("Daily")
  const [slackEnabled, setSlackEnabled] = React.useState(false)
  const [emailInput, setEmailInput] = React.useState("")
  const [emails, setEmails] = React.useState(["ops@atmet.ai", "security@atmet.ai"])

  return (
    <AdminPage section={"Notifications config" as AdminConsoleSection}>
      <section className="space-y-3 rounded-xl border border-border bg-background p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-foreground">Workflow error alerts</p>
            <p className="text-[13px] text-muted-foreground">Notify admins when workflows fail repeatedly.</p>
          </div>
          <AdminToggle checked={workflowAlerts} onChange={setWorkflowAlerts} />
        </div>
        {workflowAlerts ? (
          <div className="grid gap-2 sm:grid-cols-2">
            <Input type="number" defaultValue="5" className="h-8" aria-label="Alert after errors" />
            <Input type="number" defaultValue="30" className="h-8" aria-label="Within minutes" />
          </div>
        ) : null}
      </section>

      <section className="space-y-3 rounded-xl border border-border bg-background p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-foreground">Usage alerts</p>
            <p className="text-[13px] text-muted-foreground">Alert when workspace usage approaches monthly limits.</p>
          </div>
          <AdminToggle checked={usageAlerts} onChange={setUsageAlerts} />
        </div>
        {usageAlerts ? <Input type="number" defaultValue="80" className="h-8" aria-label="Monthly limit percentage" /> : null}
      </section>

      <section className="rounded-xl border border-border bg-background p-3">
        <p className="text-sm font-medium text-foreground">Digest emails</p>
        <div className="mt-2 inline-flex rounded-lg bg-muted p-0.5">
          {["Off", "Daily", "Weekly"].map((option) => (
            <Button key={option} type="button" size="xs" variant={digest === option ? "default" : "ghost"} onClick={() => setDigest(option)}>
              {option}
            </Button>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-background p-3">
        <p className="text-sm font-medium text-foreground">Alert recipients</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {emails.map((email) => (
            <Badge key={email} variant="blue" className="gap-1">
              {email}
              <button type="button" onClick={() => setEmails((previous) => previous.filter((item) => item !== email))} aria-label={`Remove ${email}`}>
                <IconX className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <Input value={emailInput} onChange={(event) => setEmailInput(event.target.value)} placeholder="alerts@company.com" className="h-8" />
          <Button
            type="button"
            size="sm"
            onClick={() => {
              const email = emailInput.trim()
              if (!email) return
              setEmails((previous) => Array.from(new Set([...previous, email])))
              setEmailInput("")
            }}
          >
            Add
          </Button>
        </div>
      </section>

      <section className="space-y-3 rounded-xl border border-border bg-background p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-foreground">Slack webhook</p>
            <p className="text-[13px] text-muted-foreground">Send workspace alerts into a Slack channel.</p>
          </div>
          <AdminToggle checked={slackEnabled} onChange={setSlackEnabled} />
        </div>
        {slackEnabled ? <Input placeholder="https://hooks.slack.com/services/..." className="h-8" /> : null}
      </section>
      <AdminSaveBar />
    </AdminPage>
  )
}

function IntegrationsManagementConsoleContent() {
  const integrationRows: readonly (typeof adminIntegrationRows)[number][] =
    adminIntegrationRows

  return (
    <AdminPage
      section={"Integrations management" as AdminConsoleSection}
      actions={<Button type="button" size="sm"><IconPlus className="h-3.5 w-3.5" />Add integration</Button>}
    >
      {integrationRows.length === 0 ? (
        <AdminEmptyState icon={IconPlug} title="No integrations connected" description="No workspace apps are connected yet." action={<Button type="button" size="sm">Add your first integration</Button>} />
      ) : (
        <section className="overflow-hidden rounded-xl border border-border bg-background">
          <table className="w-full table-fixed border-collapse text-[0.8rem]">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="w-[23%] px-2.5 py-1.5 text-left font-medium">App</th>
                <th className="w-[18%] px-2.5 py-1.5 text-left font-medium">Connected by</th>
                <th className="w-[15%] px-2.5 py-1.5 text-left font-medium">Status</th>
                <th className="w-[22%] px-2.5 py-1.5 text-left font-medium">Scope</th>
                <th className="w-[13%] px-2.5 py-1.5 text-left font-medium">Last used</th>
                <th className="w-[9%] px-2.5 py-1.5 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {integrationRows.map((row) => (
                <tr key={row.app} className={cn("border-b border-border/70 last:border-b-0", row.status === "Error" && "bg-destructive/10")}>
                  <td className="px-2.5 py-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex size-6 items-center justify-center rounded-md bg-muted text-[10px] font-medium text-foreground">{row.app.slice(0, 1)}</span>
                      <span className="font-medium text-foreground">{row.app}</span>
                      {row.forced ? <Badge variant="blue">Force-enabled</Badge> : null}
                    </div>
                  </td>
                  <td className="truncate px-2.5 py-2 text-muted-foreground">{row.connectedBy}</td>
                  <td className="px-2.5 py-2"><Badge variant={adminBadgeVariants[row.tone]}>{row.status}</Badge></td>
                  <td className="truncate px-2.5 py-2 text-muted-foreground">{row.scope}</td>
                  <td className="px-2.5 py-2 text-muted-foreground">{row.lastUsed}</td>
                  <td className="px-2.5 py-2 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button type="button" variant="ghost" size="icon-xs" aria-label={`${row.app} actions`} />}>
                        <IconDots className="h-3.5 w-3.5" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="min-w-48">
                        <DropdownMenuItem>Revoke access</DropdownMenuItem>
                        <DropdownMenuItem>Force-enable for all members</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive">Disconnect</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </AdminPage>
  )
}

function BillingPlanConsoleContent() {
  const usageBars = [
    ["Seats used", 8, 12],
    ["Storage used", 42, 120],
    ["API calls this month", 486000, 1200000],
  ] as const
  const invoices = [
    ["Mar 01, 2026", "$480.00", "Paid"],
    ["Feb 01, 2026", "$480.00", "Paid"],
    ["Jan 01, 2026", "$420.00", "Pending"],
  ] as const

  return (
    <AdminPage section={"Billing & plan" as AdminConsoleSection}>
      <section className="rounded-xl border border-border bg-background p-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Team plan</p>
            <p className="text-[13px] text-muted-foreground">Monthly billing · renews Apr 01, 2026 · 8 seats · $60 per seat</p>
          </div>
          <Button type="button" size="sm">Upgrade or downgrade</Button>
        </div>
      </section>

      <section className="space-y-3 rounded-xl border border-border bg-background p-3">
        <p className="text-sm font-medium text-foreground">Usage vs. limits</p>
        {usageBars.map(([label, used, limit]) => {
          const progress = Math.min(100, (used / limit) * 100)
          return (
            <div key={label} className="space-y-1">
              <div className="flex justify-between text-[13px]">
                <span className="text-foreground">{label}</span>
                <span className="text-muted-foreground">{used.toLocaleString()} of {limit.toLocaleString()} used</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )
        })}
      </section>

      <section className="flex flex-col gap-2 rounded-xl border border-border bg-background p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <IconCreditCard className="h-5 w-5 text-muted-foreground" />
          <p className="text-sm text-foreground">Visa ending in 4242 · expires 08/28</p>
        </div>
        <Button type="button" variant="outline" size="sm">Change payment method</Button>
      </section>

      <section className="overflow-hidden rounded-xl border border-border bg-background">
        <table className="w-full table-fixed border-collapse text-[0.8rem]">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="px-2.5 py-1.5 text-left font-medium">Date</th>
              <th className="px-2.5 py-1.5 text-left font-medium">Amount</th>
              <th className="px-2.5 py-1.5 text-left font-medium">Status</th>
              <th className="px-2.5 py-1.5 text-right font-medium">Download</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map(([date, amount, status]) => (
              <tr key={date} className="border-b border-border/70 last:border-b-0">
                <td className="px-2.5 py-2 text-foreground">{date}</td>
                <td className="px-2.5 py-2 text-muted-foreground">{amount}</td>
                <td className="px-2.5 py-2"><Badge variant={status === "Paid" ? "green" : "amber"}>{status}</Badge></td>
                <td className="px-2.5 py-2 text-right"><Button type="button" variant="ghost" size="xs"><IconFileText className="h-3.5 w-3.5" />PDF</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="rounded-xl border border-destructive/40 bg-destructive/10 p-3">
        <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive">Cancel plan</Button>
        <p className="mt-1 text-[13px] text-muted-foreground">Stop renewal for the current paid subscription.</p>
      </section>
    </AdminPage>
  )
}

function ApiKeysConsoleContent() {
  const [createOpen, setCreateOpen] = React.useState(false)
  const [createdKey, setCreatedKey] = React.useState("")
  const [keyName, setKeyName] = React.useState("")
  const [revokedKeys, setRevokedKeys] = React.useState<string[]>(["key_003"])
  const keys = [
    { id: "key_001", name: "Workflow runner", prefix: "ak_live_", scopes: "Chat, workflows", createdBy: "Amir Haddad", lastUsed: "Today", status: "Active" },
    { id: "key_002", name: "Finance export", prefix: "ak_fin_", scopes: "Files, billing", createdBy: "Lina Saad", lastUsed: "Yesterday", status: "Active" },
    { id: "key_003", name: "Legacy import", prefix: "ak_old_", scopes: "Files", createdBy: "Fadi Mourad", lastUsed: "Mar 01, 2026", status: "Revoked" },
  ] as const

  return (
    <AdminPage section={"API keys" as AdminConsoleSection} actions={<Button type="button" size="sm" onClick={() => setCreateOpen(true)}><IconKey className="h-3.5 w-3.5" />Create API key</Button>}>
      <section className="overflow-hidden rounded-xl border border-border bg-background">
        <table className="w-full table-fixed border-collapse text-[0.8rem]">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="w-[18%] px-2.5 py-1.5 text-left font-medium">Name</th>
              <th className="w-[16%] px-2.5 py-1.5 text-left font-medium">Key prefix</th>
              <th className="w-[22%] px-2.5 py-1.5 text-left font-medium">Scopes</th>
              <th className="w-[17%] px-2.5 py-1.5 text-left font-medium">Created by</th>
              <th className="w-[12%] px-2.5 py-1.5 text-left font-medium">Last used</th>
              <th className="w-[10%] px-2.5 py-1.5 text-left font-medium">Status</th>
              <th className="w-[5%] px-2.5 py-1.5 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {keys.map((key) => {
              const revoked = revokedKeys.includes(key.id) || key.status === "Revoked"
              return (
                <tr key={key.id} className="border-b border-border/70 last:border-b-0">
                  <td className={cn("px-2.5 py-2 font-medium text-foreground", revoked && "text-muted-foreground line-through")}>{key.name}</td>
                  <td className="px-2.5 py-2 font-mono text-muted-foreground">{key.prefix}••</td>
                  <td className="truncate px-2.5 py-2 text-muted-foreground">{key.scopes}</td>
                  <td className="px-2.5 py-2 text-muted-foreground">{key.createdBy}</td>
                  <td className="px-2.5 py-2 text-muted-foreground">{key.lastUsed}</td>
                  <td className="px-2.5 py-2"><Badge variant={revoked ? "neutral" : "green"}>{revoked ? "Revoked" : "Active"}</Badge></td>
                  <td className="px-2.5 py-2 text-right">
                    {!revoked ? <Button type="button" variant="ghost" size="xs" onClick={() => setRevokedKeys((previous) => [...previous, key.id])}>Revoke</Button> : null}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create API key</DialogTitle>
            <DialogDescription>Choose scopes and expiration for a new workspace key.</DialogDescription>
          </DialogHeader>
          {createdKey ? (
            <div className="rounded-lg border border-border bg-muted p-3">
              <p className="text-[13px] text-muted-foreground">This key will not be shown again.</p>
              <div className="mt-2 flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded-md bg-background px-2 py-1.5 text-xs text-foreground">{createdKey}</code>
                <Button type="button" size="sm" variant="outline" onClick={() => navigator.clipboard?.writeText(createdKey)}>
                  <IconCopy className="h-3.5 w-3.5" />
                  Copy
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <label className="space-y-1 text-[13px] text-muted-foreground">
                Name
                <Input value={keyName} onChange={(event) => setKeyName(event.target.value)} className="h-8" />
              </label>
              <div className="grid gap-2 sm:grid-cols-2">
                {["Chat", "Workflows", "Files", "Skills", "Members", "Billing"].map((scope) => (
                  <label key={scope} className="flex items-center gap-2 text-sm text-foreground">
                    <input type="checkbox" defaultChecked={scope !== "Billing"} className="accent-primary" />
                    {scope}
                  </label>
                ))}
              </div>
              <AdminSelect label="Expiry" value="Never" options={["Never", "30 days", "90 days", "1 year"]} onChange={() => undefined} />
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => { setCreateOpen(false); setCreatedKey(""); setKeyName("") }}>Close</Button>
            {!createdKey ? (
              <Button type="button" size="sm" onClick={() => setCreatedKey(`ak_live_${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`)}>
                Create key
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPage>
  )
}

function AuditLogsConsoleContent() {
  const [expandedRow, setExpandedRow] = React.useState<string | null>(null)
  const [actorQuery, setActorQuery] = React.useState("")
  const filteredRows = adminAuditRows.filter((row) =>
    row.actor.toLowerCase().includes(actorQuery.toLowerCase())
  )

  return (
    <AdminPage section={"Audit logs" as AdminConsoleSection} actions={<Button type="button" variant="outline" size="sm"><IconDownload className="h-3.5 w-3.5" />Export CSV</Button>}>
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
        <label className="relative">
          <IconCalendar className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input type="date" className="h-8 pl-8" />
        </label>
        <Input type="date" className="h-8" />
        <AdminSelect value="All event types" options={["All event types", "Login", "Workflow run", "Error", "Settings changed"]} onChange={() => undefined} />
        <Input value={actorQuery} onChange={(event) => setActorQuery(event.target.value)} placeholder="Search actor" className="h-8" />
      </div>
      {filteredRows.length === 0 ? (
        <AdminEmptyState icon={IconListDetails} title="No audit logs found" description="No events match the current filters." action={<Button type="button" size="sm" variant="outline" onClick={() => setActorQuery("")}>Reset filters</Button>} />
      ) : (
        <section className="overflow-hidden rounded-xl border border-border bg-background">
          <table className="w-full table-fixed border-collapse text-[0.8rem]">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="w-[17%] px-2.5 py-1.5 text-left font-medium">Timestamp</th>
                <th className="w-[18%] px-2.5 py-1.5 text-left font-medium">Actor</th>
                <th className="w-[16%] px-2.5 py-1.5 text-left font-medium">Event type</th>
                <th className="w-[19%] px-2.5 py-1.5 text-left font-medium">Target</th>
                <th className="w-[15%] px-2.5 py-1.5 text-left font-medium">IP address</th>
                <th className="w-[15%] px-2.5 py-1.5 text-left font-medium">Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <React.Fragment key={row.id}>
                  <tr className="cursor-pointer border-b border-border/70" onClick={() => setExpandedRow((previous) => previous === row.id ? null : row.id)}>
                    <td className="px-2.5 py-2 text-muted-foreground">{row.timestamp}</td>
                    <td className="px-2.5 py-2">
                      <div className="flex items-center gap-2"><AdminAvatar initials={row.initials} name={row.actor} /><span className="text-foreground">{row.actor}</span></div>
                    </td>
                    <td className="px-2.5 py-2"><Badge variant={adminBadgeVariants[row.tone]}>{row.eventType}</Badge></td>
                    <td className="px-2.5 py-2 text-muted-foreground">{row.target}</td>
                    <td className="px-2.5 py-2 text-muted-foreground">{row.ip}</td>
                    <td className="px-2.5 py-2 text-muted-foreground">View payload</td>
                  </tr>
                  {expandedRow === row.id ? (
                    <tr className="border-b border-border/70">
                      <td colSpan={6} className="px-2.5 py-2">
                        <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-xs text-foreground">{JSON.stringify(row.details, null, 2)}</pre>
                      </td>
                    </tr>
                  ) : null}
                </React.Fragment>
              ))}
            </tbody>
          </table>
          <div className="flex items-center justify-between border-t border-border px-3 py-2">
            <Button type="button" variant="outline" size="xs">Previous</Button>
            <span className="text-[13px] text-muted-foreground">Page 1 of 1</span>
            <Button type="button" variant="outline" size="xs">Next</Button>
          </div>
        </section>
      )}
    </AdminPage>
  )
}

function UsageLimitsConsoleContent() {
  const [sortKey, setSortKey] = React.useState<"name" | "workspace" | "tokens" | "runs" | "files" | "lastActive">("tokens")
  const [query, setQuery] = React.useState("")
  const [workspaceFilter, setWorkspaceFilter] = React.useState("All workspaces")
  const [roleFilter, setRoleFilter] = React.useState("All roles")
  const usageRows = adminMembers.map((member, index) => ({
    ...member,
    tokens: [3120, 2710, 1840, 1390, 920][index] ?? 500,
    runs: [86, 72, 44, 31, 18][index] ?? 10,
    files: [24, 18, 9, 15, 4][index] ?? 2,
  }))
  const filteredUsageRows = usageRows.filter((row) => {
    const normalizedQuery = query.trim().toLowerCase()
    const matchesQuery =
      normalizedQuery.length === 0 ||
      row.name.toLowerCase().includes(normalizedQuery) ||
      row.email.toLowerCase().includes(normalizedQuery) ||
      row.workspace.toLowerCase().includes(normalizedQuery)
    const matchesWorkspace =
      workspaceFilter === "All workspaces" || row.workspace === workspaceFilter
    const matchesRole = roleFilter === "All roles" || row.role === roleFilter
    return matchesQuery && matchesWorkspace && matchesRole
  })
  const sortedUsageRows = [...filteredUsageRows].sort((a, b) => {
    if (sortKey === "name" || sortKey === "workspace") {
      return a[sortKey].localeCompare(b[sortKey])
    }
    if (sortKey === "lastActive") return a.lastActive.localeCompare(b.lastActive)
    return b[sortKey] - a[sortKey]
  })
  const chartData = [
    "D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8", "D9", "D10", "D11", "D12", "D13", "D14",
  ].map((label, index) => ({ label, value: 1200 + index * 120 + (index % 3) * 180 }))

  return (
    <AdminPage section="Usage & limits" actions={<Button type="button" variant="outline" size="sm"><IconDownload className="h-3.5 w-3.5" />Export usage CSV</Button>}>
      <section className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Tokens this month", "486K"],
          ["Workflow runs", "1,842"],
          ["Storage used", "42 GB"],
          ["API calls", "486K"],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg bg-muted px-3 py-3">
            <p className="text-[13px] text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-medium tabular-nums text-foreground">{value}</p>
          </div>
        ))}
      </section>

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative min-w-0 flex-1">
          <IconSearch className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by member, email, or workspace"
            className="h-7 pl-8"
          />
        </div>
        <AdminSelect
          value={workspaceFilter}
          options={["All workspaces", ...initialWorkspaces.map((workspace) => workspace.name)]}
          onChange={setWorkspaceFilter}
          className="sm:w-40"
        />
        <AdminSelect
          value={roleFilter}
          options={["All roles", ...platformRoles]}
          onChange={setRoleFilter}
          className="sm:w-32"
        />
      </div>

      <section className="overflow-hidden rounded-xl border border-border bg-background">
        <table className="w-full table-fixed border-collapse text-[0.8rem]">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              {[
                ["name", "Name", "w-[22%] text-left"],
                ["workspace", "Workspace", "w-[18%] text-left"],
                ["tokens", "Tokens used", "w-[14%] text-left"],
                ["runs", "Workflow runs", "w-[10%] text-center"],
                ["files", "Files uploaded", "w-[10%] text-center"],
                ["lastActive", "Last active", "w-[26%] text-left"],
              ].map(([key, label, className]) => (
                <th key={key} className={cn("px-2.5 py-1.5 font-medium", className)}>
                  <button type="button" onClick={() => setSortKey(key as typeof sortKey)} className="inline-flex items-center gap-1 hover:text-foreground">
                    {label}
                    <IconChevronDown className="h-3 w-3" />
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedUsageRows.map((row) => (
              <tr
                key={row.id}
                onClick={() => openUserProfile(row.name, "Usage & limits")}
                className="cursor-pointer border-b border-border/70 transition-colors last:border-b-0 hover:bg-muted/35"
              >
                <td className="px-2.5 py-2">
                  <div className="flex items-center gap-2">
                    <AdminAvatar
                      initials={row.initials}
                      name={row.name}
                      returnToAdminSection="Usage & limits"
                    />
                    <button
                      type="button"
                      onClick={() => openUserProfile(row.name, "Usage & limits")}
                      className="font-medium text-foreground"
                    >
                      {row.name}
                    </button>
                  </div>
                </td>
                <td className="truncate px-2.5 py-2 text-foreground">{row.workspace}</td>
                <td className="px-2.5 py-2 text-muted-foreground">{row.tokens.toLocaleString()}</td>
                <td className="px-2.5 py-2 text-center text-muted-foreground">{row.runs}</td>
                <td className="px-2.5 py-2 text-center text-muted-foreground">{row.files}</td>
                <td className="px-2.5 py-2 text-muted-foreground">{row.lastActive}</td>
              </tr>
            ))}
            {sortedUsageRows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-[13px] text-muted-foreground">
                  No usage records match the current filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>

      <section className="rounded-xl border border-border bg-background p-3">
        <p className="text-sm font-medium text-foreground">Daily token usage</p>
        <BarInteractive data={chartData} className="mt-2" />
      </section>

      <section className="grid gap-3 rounded-xl border border-border bg-background p-3 sm:grid-cols-3">
        <label className="space-y-1 text-[13px] text-muted-foreground">Token cap per workspace per month<Input type="number" defaultValue="50000" className="h-8" /></label>
        <label className="space-y-1 text-[13px] text-muted-foreground">Max file size<div className="flex gap-2"><Input type="number" defaultValue="250" className="h-8" /><AdminSelect value="MB" options={["MB", "GB"]} onChange={() => undefined} className="w-24" /></div></label>
        <label className="space-y-1 text-[13px] text-muted-foreground">Max files per workspace<Input type="number" defaultValue="10000" className="h-8" /></label>
        <div className="sm:col-span-3 sm:text-right">
          <Button type="button" size="sm">Save limits</Button>
        </div>
      </section>
    </AdminPage>
  )
}

function renderAdminConsoleContent(section: AdminConsoleSection) {
  switch (section) {
    case "Admin overview":
      return <AdminOverviewConsoleContent />
    case "Workspace provisioning":
      return <WorkspaceProvisioningConsoleContent />
    case "Users & workspaces":
      return <UsersWorkspacesConsoleContent />
    case "Roles & permissions":
      return <RolesPermissionsConsoleContent />
    case "Access policies":
      return <AccessPoliciesConsoleContent />
    case "Usage & limits":
      return <UsageLimitsConsoleContent />
  }
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { theme, resolvedTheme, setTheme } = useTheme()
  const currentWorkspaceMember = React.useMemo(
    () =>
      workspaceMembers.find(
        (member) =>
          member.email.toLowerCase() === accountProfile.email.toLowerCase()
      ) ?? null,
    []
  )
  const isPlatformAdmin =
    currentWorkspaceMember?.role === "Super Admin" ||
    currentWorkspaceMember?.role === "Admin"
  const [settingsOpen, setSettingsOpen] = React.useState(false)
  const [adminConsoleOpen, setAdminConsoleOpen] = React.useState(false)
  const [isSettingsCloseConfirmOpen, setIsSettingsCloseConfirmOpen] =
    React.useState(false)
  const [hasGeneralUnsavedChanges, setHasGeneralUnsavedChanges] =
    React.useState(false)
  const [activeSettingsSection, setActiveSettingsSection] =
    React.useState<SettingsSection>("Account")
  const [activeAdminConsoleSection, setActiveAdminConsoleSection] =
    React.useState<AdminConsoleSection>("Admin overview")
  const [profileReturnAdminSection, setProfileReturnAdminSection] =
    React.useState<AdminConsoleSection | null>(null)
  const [workspaceRecords, setWorkspaceRecords] =
    React.useState<WorkspaceProfile[]>(initialWorkspaces)
  const [selectedWorkspaceId, setSelectedWorkspaceId] = React.useState(
    initialWorkspaces[0]?.id ?? ""
  )
  const [membersQuickSearchQuery, setMembersQuickSearchQuery] =
    React.useState("")
  const [membersQuickSelectedId, setMembersQuickSelectedId] = React.useState<
    string | null
  >(null)
  const [membersQuickActionToken, setMembersQuickActionToken] =
    React.useState(0)
  const [membersQuickInviteToken, setMembersQuickInviteToken] =
    React.useState(0)
  const [storedChats, setStoredChats] = React.useState<StoredChatItem[]>([])
  const [isChatsExpanded, setIsChatsExpanded] = React.useState(true)
  const [visibleChatsCount, setVisibleChatsCount] = React.useState(
    INITIAL_VISIBLE_CHATS
  )
  const [editingChatId, setEditingChatId] = React.useState<string | null>(null)
  const [editingChatTitle, setEditingChatTitle] = React.useState("")
  const discardNextRenameSubmitRef = React.useRef(false)
  const activeChatId = searchParams.get("chat")
  const selectedWorkspace = React.useMemo(
    () => {
      const fallbackWorkspace = workspaceRecords[0] ?? initialWorkspaces[0]
      if (!fallbackWorkspace) return null
      return (
        workspaceRecords.find(
          (workspace) => workspace.id === selectedWorkspaceId
        ) ?? fallbackWorkspace
      )
    },
    [selectedWorkspaceId, workspaceRecords]
  )

  const handleSettingsOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) {
        setSettingsOpen(true)
        return
      }

      if (hasGeneralUnsavedChanges) {
        setIsSettingsCloseConfirmOpen(true)
        return
      }

      setSettingsOpen(false)
    },
    [hasGeneralUnsavedChanges]
  )

  const sortedChats = React.useMemo(() => {
    return [...storedChats].sort((a, b) => {
      const aPinned = Boolean(a.pinned)
      const bPinned = Boolean(b.pinned)
      if (aPinned !== bPinned) return aPinned ? -1 : 1
      return b.updatedAt - a.updatedAt
    })
  }, [storedChats])
  const visibleChats = React.useMemo(
    () => sortedChats.slice(0, visibleChatsCount),
    [sortedChats, visibleChatsCount]
  )
  const pinnedChats = React.useMemo(
    () => visibleChats.filter((chat) => Boolean(chat.pinned)),
    [visibleChats]
  )
  const unpinnedChats = React.useMemo(
    () => visibleChats.filter((chat) => !chat.pinned),
    [visibleChats]
  )

  const readStoredChats = React.useCallback((): StoredChatItem[] => {
    try {
      const raw = window.localStorage.getItem(AI_CORE_CHATS_STORAGE_KEY)
      if (!raw) return []
      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed)) return []

      return parsed.filter(
        (item): item is StoredChatItem =>
          item &&
          typeof item === "object" &&
          typeof item.id === "string" &&
          typeof item.title === "string" &&
          typeof item.updatedAt === "number"
      )
    } catch {
      return []
    }
  }, [])

  const persistStoredChats = React.useCallback(
    (nextChats: StoredChatItem[]) => {
      setStoredChats(nextChats)
      window.localStorage.setItem(
        AI_CORE_CHATS_STORAGE_KEY,
        JSON.stringify(nextChats)
      )
      window.dispatchEvent(new CustomEvent(AI_CORE_CHATS_UPDATED_EVENT))
    },
    []
  )

  const toggleChatPin = React.useCallback(
    (chatId: string) => {
      const nextChats = storedChats.map((chat) =>
        chat.id === chatId ? { ...chat, pinned: !chat.pinned } : chat
      )
      persistStoredChats(nextChats)
    },
    [persistStoredChats, storedChats]
  )

  const startRenamingChat = React.useCallback(
    (chatId: string) => {
      const target = storedChats.find((chat) => chat.id === chatId)
      if (!target) return
      discardNextRenameSubmitRef.current = false
      setEditingChatId(chatId)
      setEditingChatTitle(target.title)
    },
    [storedChats]
  )

  const cancelRenamingChat = React.useCallback(() => {
    setEditingChatId(null)
    setEditingChatTitle("")
  }, [])

  const submitRenamingChat = React.useCallback(
    (chatId: string) => {
      if (discardNextRenameSubmitRef.current) {
        discardNextRenameSubmitRef.current = false
        cancelRenamingChat()
        return
      }

      const target = storedChats.find((chat) => chat.id === chatId)
      if (!target) {
        cancelRenamingChat()
        return
      }

      const trimmedTitle = editingChatTitle.trim()
      if (!trimmedTitle || trimmedTitle === target.title) {
        cancelRenamingChat()
        return
      }

      const nextChats = storedChats.map((chat) =>
        chat.id === chatId ? { ...chat, title: trimmedTitle } : chat
      )
      persistStoredChats(nextChats)
      discardNextRenameSubmitRef.current = false
      cancelRenamingChat()
    },
    [cancelRenamingChat, editingChatTitle, persistStoredChats, storedChats]
  )

  const deleteChat = React.useCallback(
    (chatId: string) => {
      const target = storedChats.find((chat) => chat.id === chatId)
      if (!target) return

      const confirmed = window.confirm(`Delete "${target.title}"?`)
      if (!confirmed) return

      const nextChats = storedChats.filter((chat) => chat.id !== chatId)
      persistStoredChats(nextChats)

      if (activeChatId === chatId) {
        router.push("/ai-core")
      }
    },
    [activeChatId, persistStoredChats, router, storedChats]
  )

  const createNewChat = React.useCallback(() => {
    const now = Date.now()
    const id = `chat-${now}-${Math.random().toString(36).slice(2, 8)}`
    const nextChat: StoredChatItem = {
      id,
      title: "New chat",
      updatedAt: now,
      pinned: false,
      path: `/ai-core?chat=${id}`,
    }

    const nextChats = [nextChat, ...storedChats]
    persistStoredChats(nextChats)
    router.push(nextChat.path ?? "/ai-core")
  }, [persistStoredChats, router, storedChats])

  const handleWorkspaceSave = React.useCallback(
    (nextWorkspace: WorkspaceProfile) => {
      setWorkspaceRecords((previous) =>
        previous.map((workspace) =>
          workspace.id === nextWorkspace.id ? nextWorkspace : workspace
        )
      )
    },
    []
  )

  React.useEffect(() => {
    const syncChats = () => {
      setStoredChats(readStoredChats())
    }

    syncChats()

    const onStorage = (event: StorageEvent) => {
      if (event.key !== AI_CORE_CHATS_STORAGE_KEY) return
      syncChats()
    }

    window.addEventListener(
      AI_CORE_CHATS_UPDATED_EVENT,
      syncChats as EventListener
    )
    window.addEventListener("storage", onStorage)

    return () => {
      window.removeEventListener(
        AI_CORE_CHATS_UPDATED_EVENT,
        syncChats as EventListener
      )
      window.removeEventListener("storage", onStorage)
    }
  }, [readStoredChats])

  React.useEffect(() => {
    const handleOpenSettingsPanel = (event: Event) => {
      const detail = (event as CustomEvent<OpenSettingsPanelDetail>).detail
      const requestedSection = detail?.section
      if (requestedSection === "Refer and earn") return
      const hasMemberTarget = Boolean(detail?.memberId || detail?.memberQuery)
      const fallbackSection = hasMemberTarget ? "Members" : undefined
      const targetSection = requestedSection ?? fallbackSection

      if (
        targetSection &&
        (baseSettingsSections as readonly string[]).includes(targetSection)
      ) {
        setActiveSettingsSection(targetSection as SettingsSection)
      }

      if (targetSection === "Members") {
        setProfileReturnAdminSection(detail?.returnToAdminSection ?? null)
        if (detail?.membersAction === "invite") {
          setMembersQuickSearchQuery("")
          setMembersQuickSelectedId(null)
          setMembersQuickInviteToken((previous) => previous + 1)
        } else {
          setMembersQuickSearchQuery(detail?.memberQuery ?? "")
          setMembersQuickSelectedId(detail?.memberId ?? null)
          setMembersQuickActionToken((previous) => previous + 1)
        }
      }

      setSettingsOpen(true)
    }

    window.addEventListener(
      OPEN_SETTINGS_PANEL_EVENT,
      handleOpenSettingsPanel as EventListener
    )
    return () =>
      window.removeEventListener(
        OPEN_SETTINGS_PANEL_EVENT,
        handleOpenSettingsPanel as EventListener
      )
  }, [])

  const renderSettingsSectionButton = (section: SettingsSection) => {
    const SectionIcon = settingsSectionIcons[section]
    return (
      <button
        key={section}
        disabled={section === "Refer and earn"}
        onClick={() => {
          if (section === "Contact Support") {
            window.location.href = "mailto:support@atmet.ai"
            return
          }
          if (section === "Help Docs") {
            window.open(
              HELP_DOCS_EXTERNAL_URL,
              "_blank",
              "noopener,noreferrer"
            )
            return
          }
          setActiveSettingsSection(section)
        }}
        className={cn(
          "flex h-7 w-full items-center justify-between rounded-md px-2 text-left text-sm transition-colors",
          section === "Refer and earn" && "cursor-not-allowed opacity-50",
          activeSettingsSection === section
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          <SectionIcon className="h-3.5 w-3.5 shrink-0 opacity-80" />
          <span className="truncate">{section}</span>
        </span>
        {section === "Refer and earn" ? (
          <Badge
            variant="red"
            size="sm"
            className="pointer-events-none shrink-0"
          >
            Coming later
          </Badge>
        ) : (
          <IconChevronRight className="h-3.5 w-3.5 shrink-0 opacity-70" />
        )}
      </button>
    )
  }

  const renderAdminConsoleSectionButton = (section: AdminConsoleSection) => {
    const SectionIcon = adminConsoleSectionIcons[section]
    return (
      <button
        key={section}
        type="button"
        onClick={() => setActiveAdminConsoleSection(section)}
        className={cn(
          "flex h-7 w-full items-center justify-between rounded-md px-2 text-left text-sm transition-colors",
          activeAdminConsoleSection === section
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          <SectionIcon className="h-3.5 w-3.5 shrink-0 opacity-80" />
          <span className="truncate">{section}</span>
        </span>
        <IconChevronRight className="h-3.5 w-3.5 shrink-0 opacity-70" />
      </button>
    )
  }

  return (
    <Sidebar variant="sidebar" collapsible="icon" {...props}>
      <SidebarHeader className="gap-0 p-0">
        <div className="h-10 border-b border-sidebar-border px-2 py-1 group-data-[collapsible=icon]:h-auto group-data-[collapsible=icon]:border-b-0">
          <VersionSwitcher
            workspaces={workspaceRecords}
            selectedWorkspaceId={
              selectedWorkspaceId || workspaceRecords[0]?.id || ""
            }
            onSelectedWorkspaceIdChange={setSelectedWorkspaceId}
          />
        </div>
        <div className="px-2 py-2 group-data-[collapsible=icon]:hidden">
          <SearchForm />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup className="pt-0">
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      isActive={item.url !== "#" && pathname.startsWith(item.url)}
                      className="h-7"
                      render={
                        item.url === "#" ? (
                          <a
                            href="#"
                            onClick={(event) => event.preventDefault()}
                          />
                        ) : (
                          <Link href={item.url} />
                        )
                      }
                    >
                      {item.iconType === "hugeicons" ? (
                        <HugeiconsIcon
                          icon={item.icon}
                          strokeWidth={1.35}
                          className="h-3.5 w-3.5 shrink-0 opacity-80"
                        />
                      ) : (
                        <item.icon className="h-3.5 w-3.5 shrink-0 opacity-80" stroke={1.5} />
                      )}
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup className="mt-12 pt-2 group-data-[collapsible=icon]:hidden">
          <div className="mb-1 flex items-center justify-between pr-2 pl-0">
            <button
              type="button"
              onClick={() =>
                setIsChatsExpanded((prev) => {
                  const nextIsExpanded = !prev
                  if (!nextIsExpanded) {
                    setVisibleChatsCount(INITIAL_VISIBLE_CHATS)
                  }
                  return nextIsExpanded
                })
              }
              aria-label={isChatsExpanded ? "Collapse chats" : "Expand chats"}
              className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <span className="text-xs font-medium">Chats</span>
              <IconChevronRight
                className={cn(
                  "h-3.5 w-3.5 transition-transform duration-200",
                  isChatsExpanded && "rotate-90"
                )}
              />
            </button>
            <button
              type="button"
              onClick={createNewChat}
              aria-label="Create new chat"
              className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
          <div
            className={cn(
              "grid transition-[grid-template-rows,opacity] duration-300 ease-out",
              isChatsExpanded
                ? "grid-rows-[1fr] opacity-100"
                : "pointer-events-none grid-rows-[0fr] opacity-0"
            )}
          >
            <div className="overflow-hidden">
              <SidebarGroupContent>
                <SidebarMenu>
                  {pinnedChats.map((chat, index) => (
                    <SidebarMenuItem
                      key={chat.id}
                      className={cn("w-full", index > 0 && "mt-1")}
                    >
                      {editingChatId === chat.id ? (
                        <SidebarMenuButton
                          render={<div />}
                          className="h-7 pr-2"
                        >
                          <input
                            autoFocus
                            value={editingChatTitle}
                            onChange={(event) =>
                              setEditingChatTitle(event.target.value)
                            }
                            onFocus={(event) => event.currentTarget.select()}
                            onClick={(event) => event.stopPropagation()}
                            onKeyDown={(event) => {
                              event.stopPropagation()
                              if (event.key === "Enter") {
                                event.preventDefault()
                                submitRenamingChat(chat.id)
                              }
                              if (event.key === "Escape") {
                                event.preventDefault()
                                discardNextRenameSubmitRef.current = true
                                cancelRenamingChat()
                              }
                            }}
                            onBlur={() => submitRenamingChat(chat.id)}
                            className="h-6 w-full rounded-sm border border-input bg-transparent px-1.5 text-sm outline-hidden focus-visible:border-primary"
                            aria-label="Rename chat"
                          />
                        </SidebarMenuButton>
                      ) : (
                        <>
                          <SidebarMenuButton
                            isActive={
                              pathname.startsWith("/ai-core") &&
                              activeChatId === chat.id
                            }
                            render={
                              <Link
                                href={chat.path ?? `/ai-core?chat=${chat.id}`}
                              />
                            }
                            className="h-7 pr-10 group-hover/menu-item:bg-sidebar-accent group-hover/menu-item:text-sidebar-accent-foreground"
                          >
                            <span className="truncate text-sm">
                              {chat.title}
                            </span>
                          </SidebarMenuButton>
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={
                                <SidebarMenuAction
                                  showOnHover
                                  className="z-10 hover:bg-transparent aria-expanded:bg-transparent"
                                  onClick={(event) => {
                                    event.preventDefault()
                                    event.stopPropagation()
                                  }}
                                  aria-label="Chat options"
                                />
                              }
                            >
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              side="right"
                              className="min-w-36"
                            >
                              <DropdownMenuItem
                                onClick={(event) => {
                                  event.preventDefault()
                                  event.stopPropagation()
                                  toggleChatPin(chat.id)
                                }}
                              >
                                <PinOff className="h-4 w-4 opacity-80" />
                                Unpin chat
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={(event) => {
                                  event.preventDefault()
                                  event.stopPropagation()
                                  startRenamingChat(chat.id)
                                }}
                              >
                                <PenLine className="h-4 w-4 opacity-80" />
                                Rename
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={(event) => {
                                  event.preventDefault()
                                  event.stopPropagation()
                                  deleteChat(chat.id)
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </>
                      )}
                    </SidebarMenuItem>
                  ))}
                  {pinnedChats.length > 0 && unpinnedChats.length > 0 && (
                    <li aria-hidden className="h-4" />
                  )}
                  {unpinnedChats.map((chat, index) => (
                    <SidebarMenuItem
                      key={chat.id}
                      className={cn("w-full", index > 0 && "mt-1")}
                    >
                      {editingChatId === chat.id ? (
                        <SidebarMenuButton
                          render={<div />}
                          className="h-7 pr-2"
                        >
                          <input
                            autoFocus
                            value={editingChatTitle}
                            onChange={(event) =>
                              setEditingChatTitle(event.target.value)
                            }
                            onFocus={(event) => event.currentTarget.select()}
                            onClick={(event) => event.stopPropagation()}
                            onKeyDown={(event) => {
                              event.stopPropagation()
                              if (event.key === "Enter") {
                                event.preventDefault()
                                submitRenamingChat(chat.id)
                              }
                              if (event.key === "Escape") {
                                event.preventDefault()
                                discardNextRenameSubmitRef.current = true
                                cancelRenamingChat()
                              }
                            }}
                            onBlur={() => submitRenamingChat(chat.id)}
                            className="h-6 w-full rounded-sm border border-input bg-transparent px-1.5 text-sm outline-hidden focus-visible:border-primary"
                            aria-label="Rename chat"
                          />
                        </SidebarMenuButton>
                      ) : (
                        <>
                          <SidebarMenuButton
                            isActive={
                              pathname.startsWith("/ai-core") &&
                              activeChatId === chat.id
                            }
                            render={
                              <Link
                                href={chat.path ?? `/ai-core?chat=${chat.id}`}
                              />
                            }
                            className="h-7 pr-10 group-hover/menu-item:bg-sidebar-accent group-hover/menu-item:text-sidebar-accent-foreground"
                          >
                            <span className="truncate text-sm">
                              {chat.title}
                            </span>
                          </SidebarMenuButton>
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={
                                <SidebarMenuAction
                                  showOnHover
                                  className="z-10 hover:bg-transparent aria-expanded:bg-transparent"
                                  onClick={(event) => {
                                    event.preventDefault()
                                    event.stopPropagation()
                                  }}
                                  aria-label="Chat options"
                                />
                              }
                            >
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              side="right"
                              className="min-w-36"
                            >
                              <DropdownMenuItem
                                onClick={(event) => {
                                  event.preventDefault()
                                  event.stopPropagation()
                                  toggleChatPin(chat.id)
                                }}
                              >
                                <Pin className="h-4 w-4 opacity-80" />
                                Pin chat
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={(event) => {
                                  event.preventDefault()
                                  event.stopPropagation()
                                  startRenamingChat(chat.id)
                                }}
                              >
                                <PenLine className="h-4 w-4 opacity-80" />
                                Rename
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={(event) => {
                                  event.preventDefault()
                                  event.stopPropagation()
                                  deleteChat(chat.id)
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </>
                      )}
                    </SidebarMenuItem>
                  ))}
                  {sortedChats.length === 0 && (
                    <SidebarMenuItem>
                      <div className="px-2 py-1.5 text-xs text-muted-foreground">
                        Chats will appear here automatically.
                      </div>
                    </SidebarMenuItem>
                  )}
                </SidebarMenu>
                {sortedChats.length > visibleChatsCount && (
                  <div className="mt-1 flex justify-center px-2">
                    <button
                      type="button"
                      onClick={() =>
                        setVisibleChatsCount((prev) =>
                          Math.min(prev + CHAT_LOAD_STEP, sortedChats.length)
                        )
                      }
                      className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      aria-label="Show more chats"
                    >
                      <IconChevronDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </SidebarGroupContent>
            </div>
          </div>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="group-data-[collapsible=icon]:justify-center"
              render={
                <a
                  href={CHANALOGE_EXTERNAL_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                />
              }
            >
              <RefreshCw className="h-3.5 w-3.5 shrink-0 opacity-80" />
              <span>chanaloge</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          {isPlatformAdmin ? (
            <SidebarMenuItem>
              <Sheet
                open={adminConsoleOpen}
                onOpenChange={(nextOpen) => {
                  if (nextOpen) {
                    setActiveAdminConsoleSection("Admin overview")
                  }
                  setAdminConsoleOpen(nextOpen)
                }}
              >
                <SheetTrigger
                  render={
                    <SidebarMenuButton
                      isActive={adminConsoleOpen}
                      className="group-data-[collapsible=icon]:justify-center"
                    />
                  }
                >
                  <IconShieldCheck className="h-3.5 w-3.5 shrink-0 opacity-80" />
                  <span>Admin console</span>
                </SheetTrigger>
                <SheetContent
                  side="right"
                  className="rounded-2xl border border-border p-0 data-[side=right]:!inset-y-auto data-[side=right]:!top-1/2 data-[side=right]:!right-1/2 data-[side=right]:!h-[min(78vh,720px)] data-[side=right]:!max-h-[min(92svh,760px)] data-[side=right]:!w-[min(980px,92vw)] data-[side=right]:!max-w-none data-[side=right]:!translate-x-1/2 data-[side=right]:!-translate-y-1/2"
                >
                  <div className="flex h-full min-h-0 overflow-hidden rounded-2xl">
                    <aside className="flex h-full min-h-0 w-64 flex-col border-r border-sidebar-border bg-sidebar">
                      <div className="px-4 py-3">
                        <p className="text-sm font-medium text-sidebar-foreground">
                          Admin console
                        </p>
                      </div>
                      <nav className="no-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto px-2 pb-4 pt-4">
                        {adminConsoleGroups.map((group) => (
                          <div key={group.label} className="space-y-1">
                            <p className="px-2 text-[11px] font-medium tracking-wide text-sidebar-foreground/55 uppercase">
                              {group.label}
                            </p>
                            {group.sections.map((section) =>
                              renderAdminConsoleSectionButton(section)
                            )}
                          </div>
                        ))}
                      </nav>
                    </aside>

                    <div className="flex min-w-0 flex-1 flex-col">
                      <SheetHeader className="px-5 py-3 pe-10">
                        <SheetTitle className="text-sm font-medium">
                          {activeAdminConsoleSection}
                        </SheetTitle>
                      </SheetHeader>
                      <div
                        className="no-scrollbar min-h-0 flex-1 overflow-y-auto p-4"
                        data-settings-scope="true"
                      >
                        {renderAdminConsoleContent(activeAdminConsoleSection)}
                      </div>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </SidebarMenuItem>
          ) : null}
          <SidebarMenuItem>
            <Sheet open={settingsOpen} onOpenChange={handleSettingsOpenChange}>
              <SheetTrigger
                render={
                  <SidebarMenuButton
                    isActive={settingsOpen}
                    className="group-data-[collapsible=icon]:justify-center"
                  />
                }
              >
                <IconSettings className="h-3.5 w-3.5 shrink-0 opacity-80" />
                <span>Settings</span>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="rounded-2xl border border-border p-0 data-[side=right]:!inset-y-auto data-[side=right]:!top-1/2 data-[side=right]:!right-1/2 data-[side=right]:!h-[min(78vh,720px)] data-[side=right]:!max-h-[min(92svh,760px)] data-[side=right]:!w-[min(980px,92vw)] data-[side=right]:!max-w-none data-[side=right]:!translate-x-1/2 data-[side=right]:!-translate-y-1/2"
              >
                <div className="flex h-full min-h-0 overflow-hidden rounded-2xl">
                  <aside className="flex h-full min-h-0 w-64 flex-col border-r border-sidebar-border bg-sidebar">
                    <div className="px-4 py-3">
                      <p className="text-sm font-semibold text-sidebar-foreground">
                        Settings
                      </p>
                    </div>
                    <nav className="no-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto px-2 pb-4 pt-4">
                      <div className="space-y-1">
                        {baseSettingsSections.map((section) =>
                          renderSettingsSectionButton(section)
                        )}
                      </div>
                    </nav>
                  </aside>

                  <div className="flex min-w-0 flex-1 flex-col">
                    <SheetHeader className="px-5 py-3 pe-10">
                      <SheetTitle className="text-sm font-semibold">
                        {activeSettingsSection}
                      </SheetTitle>
                    </SheetHeader>
                    <div
                      className="no-scrollbar min-h-0 flex-1 overflow-y-auto p-4"
                      data-settings-scope="true"
                    >
                      {activeSettingsSection === "Account" ? (
                        <AccountSettingsContent />
                      ) : activeSettingsSection === "Notifications" ? (
                        <NotificationSettingsContent />
                      ) : activeSettingsSection === "General" ? (
                        <GeneralSettingsContent
                          currentTheme={theme}
                          setTheme={setTheme}
                          onUnsavedChangesChange={setHasGeneralUnsavedChanges}
                        />
                      ) : activeSettingsSection === "Workspace" ? (
                        selectedWorkspace ? (
                          <WorkspaceSettingsContent
                            workspace={selectedWorkspace}
                            onSaveWorkspace={handleWorkspaceSave}
                            onGoToMembers={() =>
                              setActiveSettingsSection("Members")
                            }
                          />
                        ) : null
                      ) : activeSettingsSection === "Members" ? (
                        <MembersSettingsContent
                          quickActionToken={membersQuickActionToken}
                          quickSearchQuery={membersQuickSearchQuery}
                          quickSelectedMemberId={membersQuickSelectedId}
                          quickInviteToken={membersQuickInviteToken}
                          profileBackLabel={
                            profileReturnAdminSection
                              ? `Back to ${profileReturnAdminSection.toLowerCase()}`
                              : "Back to members"
                          }
                          onProfileBack={
                            profileReturnAdminSection
                              ? () => {
                                  setSettingsOpen(false)
                                  setActiveAdminConsoleSection(
                                    profileReturnAdminSection
                                  )
                                  setAdminConsoleOpen(true)
                                  setProfileReturnAdminSection(null)
                                }
                              : undefined
                          }
                        />
                      ) : activeSettingsSection === "Integrations" ? (
                        <IntegrationsSettingsContent />
                      ) : activeSettingsSection === "Usage and limits" ? (
                        <UsageLimitsSettingsContent />
                      ) : activeSettingsSection === "Data controls" ? (
                        <DataControlsSettingsContent />
                      ) : activeSettingsSection === "Refer and earn" ? (
                        <ReferAndEarnSettingsContent />
                      ) : activeSettingsSection === "Billing" ? (
                        <BillingSettingsContent
                          onGoToMembers={() =>
                            setActiveSettingsSection("Members")
                          }
                          onGoToUsageLimits={() =>
                            setActiveSettingsSection("Usage and limits")
                          }
                        />
                      ) : (
                        <>
                          <p className="text-sm text-muted-foreground">
                            Manage {activeSettingsSection.toLowerCase()}{" "}
                            settings for your account and workspace.
                          </p>
                          <div className="mt-4 divide-y divide-border border-y border-border">
                            {settingsContent[activeSettingsSection].map(
                              (item) => (
                                <div
                                  key={item}
                                  className="flex items-center justify-between py-3"
                                >
                                  <span className="text-sm text-foreground">
                                    {item}
                                  </span>
                                  <Button
                                    size="xs"
                                    variant="ghost"
                                    className="px-1"
                                  >
                                    Edit
                                  </Button>
                                </div>
                              )
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
            <Dialog
              open={isSettingsCloseConfirmOpen}
              onOpenChange={setIsSettingsCloseConfirmOpen}
            >
              <DialogContent className="max-w-sm" showCloseButton={false}>
                <DialogHeader>
                  <DialogTitle>Discard unsaved changes?</DialogTitle>
                  <DialogDescription>
                    You have unsaved changes in General settings. If you close
                    now, those changes will be lost.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsSettingsCloseConfirmOpen(false)}
                  >
                    Keep editing
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      setIsSettingsCloseConfirmOpen(false)
                      setSettingsOpen(false)
                    }}
                  >
                    Discard and close
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <SidebarMenuButton
                    size="lg"
                    data-user-menu-trigger="true"
                    className="group-data-[collapsible=icon]:p-0!"
                  />
                }
              >
                <Avatar className="size-8 shrink-0">
                  <AvatarImage
                    src={accountProfile.avatarUrl}
                    alt={`${currentUser.name} avatar`}
                    className="object-cover"
                  />
                  <AvatarFallback className="text-xs font-semibold">
                    {currentUser.initials}
                  </AvatarFallback>
                </Avatar>
                <span className="grid min-w-0 flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
                  <span className="truncate text-sm font-medium">
                    {currentUser.name}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {currentUser.role}
                  </span>
                </span>
                <IconChevronUp className="ms-auto h-4 w-4 text-muted-foreground group-data-[collapsible=icon]:hidden" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="top" className="w-56">
                <DropdownMenuItem
                  onClick={() =>
                    setTheme(resolvedTheme === "dark" ? "light" : "dark")
                  }
                >
                  {resolvedTheme === "dark" ? (
                    <IconSun className="h-4 w-4" stroke={1.5} />
                  ) : (
                    <IconMoon className="h-4 w-4" stroke={1.5} />
                  )}
                  Theme toggle
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <IconUser className="h-4 w-4" stroke={1.5} />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="justify-between gap-3"
                  disabled
                >
                  <span className="flex min-w-0 items-center gap-1.5 whitespace-nowrap">
                    <Gift className="h-4 w-4" strokeWidth={1.6} />
                    Refer and earn
                  </span>
                  <Badge
                    variant="red"
                    size="sm"
                    className="pointer-events-none shrink-0"
                  >
                    Coming later
                  </Badge>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive">
                  <IconLogout2 className="h-4 w-4" stroke={1.5} />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
