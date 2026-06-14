"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import AvatarGroupTooltipTransitionDemo, {
  type ChatParticipant,
} from "@/components/shadcn-studio/avatar/avatar-18"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { useSidebar } from "@/components/ui/sidebar"
import {
  getWorkflowProject,
  workflowProjects,
  type WorkflowProject,
} from "@/lib/workflow-projects"
import {
  WORKFLOW_OPEN_LOG_EVENT,
  WORKFLOW_PUBLISH_EVENT,
  WORKFLOW_RUN_EVENT,
  WORKFLOW_SET_AUTORUN_EVENT,
  WORKFLOW_STATE_EVENT,
  type WorkflowControlEventDetail,
  type WorkflowRunSchedule,
  type WorkflowSetAutoRunEventDetail,
  type WorkflowStateEventDetail,
} from "@/lib/workflow-events"
import { OPEN_NEW_SKILL_DIALOG_EVENT } from "@/lib/skills-events"
import {
  Check,
  ChevronDown,
  ChevronRight,
  Clock3,
  FileClock,
  Loader2,
  Play,
  Plus,
  Rocket,
  X,
} from "lucide-react"
import { HugeiconsIcon } from "@hugeicons/react"
import { SidebarLeftIcon } from "@hugeicons/core-free-icons"

const OPEN_MANAGE_CHAT_USERS_EVENT = "open-manage-chat-users"
const WORKFLOW_PROJECT_PARTICIPANTS_STORAGE_KEY = "workflow-project-participants"
const AI_CORE_CHATS_STORAGE_KEY = "ai-core-chats"
const AI_CORE_CHATS_UPDATED_EVENT = "ai-core-chats-updated"

type StoredChatItem = {
  id: string
  title: string
}

type WorkspaceUser = ChatParticipant & {
  email: string
}

type WorkflowControlState = Omit<WorkflowStateEventDetail, "projectId">

const defaultWorkflowControlState: WorkflowControlState = {
  isRunning: false,
  isPublishing: false,
  publishState: "Draft",
  hasUnpublishedChanges: false,
  runSchedule: { mode: "off" },
}

const routeTitles: Record<string, string> = {
  "/ai-core": "New Chat",
  "/workflow": "Workflow",
  "/automations": "Automations",
  "/skills": "Skills",
  "/integrations": "Apps",
  "/settings": "Settings",
  "/dashboard": "Dashboard",
}

function getPageTitle(pathname: string) {
  if (pathname.startsWith("/workflow")) {
    return "Workflow"
  }
  return routeTitles[pathname] ?? "Platform"
}

const integrationAppNameOverrides: Record<string, string> = {
  aws: "AWS",
  github: "GitHub",
  gitlab: "GitLab",
  "google-drive": "Google Drive",
  "google-calendar": "Google Calendar",
  onedrive: "OneDrive",
  "monday.com": "Monday.com",
  monday: "Monday.com",
  clickup: "ClickUp",
  cloudflare: "Cloudflare",
}

function formatIntegrationAppName(appId: string) {
  const normalized = appId.trim().toLowerCase()
  if (integrationAppNameOverrides[normalized]) {
    return integrationAppNameOverrides[normalized]
  }

  return normalized
    .split("-")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ")
}

function buildFallbackFromName(name: string) {
  const letters = name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
  return letters.slice(0, 2) || "U"
}

function buildWorkspaceEmail(name: string) {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "")
  return `${slug || "user"}@atmet.ai`
}

function getDefaultParticipantsForProject(project: WorkflowProject | null) {
  if (!project) return []
  return project.members.map((member) => ({
    name: member.name,
    fallback: member.initials || buildFallbackFromName(member.name),
  }))
}

function getAutoRunLabel(runSchedule: WorkflowRunSchedule) {
  if (runSchedule.mode === "off") return "Off"
  if (runSchedule.mode === "every") {
    const unitLabel =
      runSchedule.unit === "minutes"
        ? "minutes"
        : runSchedule.unit === "hours"
          ? "hours"
          : runSchedule.unit === "days"
            ? "days"
            : runSchedule.unit === "weeks"
              ? "weeks"
              : "months"
    return `Every ${runSchedule.value} ${unitLabel}`
  }
  const runAtDate = new Date(runSchedule.atISO)
  if (!Number.isFinite(runAtDate.getTime())) return "At (invalid date)"
  return `At ${runAtDate.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })}`
}

export function PlatformNavbar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { state: sidebarState, toggleSidebar } = useSidebar()
  const userPickerCardRef = useRef<HTMLDivElement>(null)
  const isAiCore = pathname.startsWith("/ai-core")
  const activeChatId = searchParams.get("chat")
  const [activeChatTitle, setActiveChatTitle] = useState("New Chat")
  useEffect(() => {
    if (!isAiCore || !activeChatId) {
      setActiveChatTitle("New Chat")
      return
    }

    const syncActiveChatTitle = () => {
      try {
        const stored = JSON.parse(
          window.localStorage.getItem(AI_CORE_CHATS_STORAGE_KEY) ?? "[]"
        ) as StoredChatItem[]
        setActiveChatTitle(
          stored.find((chat) => chat.id === activeChatId)?.title ?? "New Chat"
        )
      } catch {
        setActiveChatTitle("New Chat")
      }
    }

    syncActiveChatTitle()
    window.addEventListener(
      AI_CORE_CHATS_UPDATED_EVENT,
      syncActiveChatTitle as EventListener
    )
    window.addEventListener("storage", syncActiveChatTitle)
    return () => {
      window.removeEventListener(
        AI_CORE_CHATS_UPDATED_EVENT,
        syncActiveChatTitle as EventListener
      )
      window.removeEventListener("storage", syncActiveChatTitle)
    }
  }, [activeChatId, isAiCore])
  const workflowProjectId = useMemo(() => {
    if (!pathname.startsWith("/workflow/")) return null
    const segments = pathname.split("/").filter(Boolean)
    return segments[1] ?? null
  }, [pathname])
  const activeWorkflowProject = useMemo(
    () => (workflowProjectId ? getWorkflowProject(workflowProjectId) ?? null : null),
    [workflowProjectId]
  )
  const isWorkflowProject = Boolean(activeWorkflowProject && workflowProjectId)
  const isSkills = pathname.startsWith("/skills")
  const integrationAppId = pathname.startsWith("/integrations")
    ? searchParams.get("app")
    : null
  const activeIntegrationAppName = useMemo(
    () => (integrationAppId ? formatIntegrationAppName(integrationAppId) : null),
    [integrationAppId]
  )
  const canManageUsersFromNavbar = isAiCore || isWorkflowProject
  const manageUsersLabel = isWorkflowProject ? "Invite users" : "Manage chat users"
  const isChatOwner = true
  const currentUserFullName = "Amir Haddad"
  const [isUserPickerOpen, setIsUserPickerOpen] = useState(false)
  const [userSearchQuery, setUserSearchQuery] = useState("")
  const workspaceUsers = useMemo<WorkspaceUser[]>(
    () => {
      const users = new Map<string, WorkspaceUser>([
        [
          currentUserFullName,
          { name: currentUserFullName, fallback: "AH", email: "amir.haddad@atmet.ai" },
        ],
        ["Sarah Reed", { name: "Sarah Reed", fallback: "SR", email: "sarah.reed@atmet.ai" }],
        ["Noah Ali", { name: "Noah Ali", fallback: "NA", email: "noah.ali@atmet.ai" }],
        ["Lina Omar", { name: "Lina Omar", fallback: "LO", email: "lina.omar@atmet.ai" }],
        ["Kareem Aziz", { name: "Kareem Aziz", fallback: "KA", email: "kareem.aziz@atmet.ai" }],
        [
          "Automation Bot",
          { name: "Automation Bot", fallback: "AB", email: "automation.bot@atmet.ai" },
        ],
        [
          "Product Manager",
          { name: "Product Manager", fallback: "PM", email: "product.manager@atmet.ai" },
        ],
        ["Engineer", { name: "Engineer", fallback: "EN", email: "engineer@atmet.ai" }],
      ])

      workflowProjects.forEach((project) => {
        project.members.forEach((member) => {
          if (users.has(member.name)) return
          users.set(member.name, {
            name: member.name,
            fallback: member.initials || buildFallbackFromName(member.name),
            email: buildWorkspaceEmail(member.name),
          })
        })
      })

      return Array.from(users.values())
    },
    [currentUserFullName]
  )
  const [aiCoreParticipants, setAiCoreParticipants] = useState<ChatParticipant[]>([
    { name: currentUserFullName, fallback: "AH" },
  ])
  const [workflowParticipantsByProject, setWorkflowParticipantsByProject] = useState<
    Record<string, ChatParticipant[]>
  >({})
  const activeParticipants = useMemo(() => {
    if (isAiCore) return aiCoreParticipants
    if (isWorkflowProject && workflowProjectId) {
      const hasStoredParticipants = Object.prototype.hasOwnProperty.call(
        workflowParticipantsByProject,
        workflowProjectId
      )
      if (hasStoredParticipants) {
        return workflowParticipantsByProject[workflowProjectId] ?? []
      }
      return getDefaultParticipantsForProject(activeWorkflowProject)
    }
    return []
  }, [
    isAiCore,
    aiCoreParticipants,
    isWorkflowProject,
    workflowProjectId,
    workflowParticipantsByProject,
    activeWorkflowProject,
  ])
  const activeParticipantNames = useMemo(
    () => new Set(activeParticipants.map((participant) => participant.name)),
    [activeParticipants]
  )
  const shouldShowParticipantsTrigger = isWorkflowProject || isAiCore
  const [workflowControlStateByProject, setWorkflowControlStateByProject] = useState<
    Record<string, WorkflowControlState>
  >({})
  const activeWorkflowControlState = useMemo<WorkflowControlState>(() => {
    if (!workflowProjectId) return defaultWorkflowControlState
    return workflowControlStateByProject[workflowProjectId] ?? defaultWorkflowControlState
  }, [workflowControlStateByProject, workflowProjectId])
  const workflowPublishButtonLabel = activeWorkflowControlState.isPublishing
    ? "Publishing..."
    : activeWorkflowControlState.hasUnpublishedChanges ||
        activeWorkflowControlState.publishState === "Draft"
      ? "Publish"
      : "Published"
  const [everyIntervalValue, setEveryIntervalValue] = useState("1")
  const [atDateValue, setAtDateValue] = useState<Date>(new Date())
  const [atTimeValue, setAtTimeValue] = useState("09:00")

  useEffect(() => {
    if (activeWorkflowControlState.runSchedule.mode !== "every") return
    setEveryIntervalValue(String(activeWorkflowControlState.runSchedule.value))
  }, [activeWorkflowControlState.runSchedule])

  useEffect(() => {
    if (activeWorkflowControlState.runSchedule.mode !== "at") return
    const parsedDate = new Date(activeWorkflowControlState.runSchedule.atISO)
    if (!Number.isFinite(parsedDate.getTime())) return
    setAtDateValue(parsedDate)
    setAtTimeValue(
      `${String(parsedDate.getHours()).padStart(2, "0")}:${String(
        parsedDate.getMinutes()
      ).padStart(2, "0")}`
    )
  }, [
    activeWorkflowControlState.runSchedule.mode === "at"
      ? activeWorkflowControlState.runSchedule.atISO
      : null,
  ])

  const parsedEveryIntervalValue = useMemo(() => {
    const parsed = Number.parseInt(everyIntervalValue, 10)
    if (!Number.isFinite(parsed)) return 1
    return Math.max(1, Math.min(9999, parsed))
  }, [everyIntervalValue])

  const atScheduleISO = useMemo(() => {
    const [hoursRaw, minutesRaw] = atTimeValue.split(":")
    const parsedHours = Number.parseInt(hoursRaw ?? "", 10)
    const parsedMinutes = Number.parseInt(minutesRaw ?? "", 10)
    const hours = Number.isFinite(parsedHours) ? Math.max(0, Math.min(23, parsedHours)) : 0
    const minutes = Number.isFinite(parsedMinutes)
      ? Math.max(0, Math.min(59, parsedMinutes))
      : 0

    const nextRun = new Date(atDateValue)
    nextRun.setHours(hours, minutes, 0, 0)
    return nextRun.toISOString()
  }, [atDateValue, atTimeValue])

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(WORKFLOW_PROJECT_PARTICIPANTS_STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return

      const cleaned: Record<string, ChatParticipant[]> = {}
      Object.entries(parsed).forEach(([projectId, participants]) => {
        if (!Array.isArray(participants)) return
        cleaned[projectId] = participants
          .filter(
            (participant): participant is ChatParticipant =>
              Boolean(
                participant &&
                  typeof participant === "object" &&
                  typeof participant.name === "string" &&
                  typeof participant.fallback === "string"
              )
          )
          .map((participant) => ({
            name: participant.name,
            fallback: participant.fallback,
            src: participant.src,
          }))
      })
      setWorkflowParticipantsByProject(cleaned)
    } catch {
      setWorkflowParticipantsByProject({})
    }
  }, [])

  useEffect(() => {
    try {
      window.localStorage.setItem(
        WORKFLOW_PROJECT_PARTICIPANTS_STORAGE_KEY,
        JSON.stringify(workflowParticipantsByProject)
      )
    } catch {
      // Ignore storage write errors.
    }
  }, [workflowParticipantsByProject])

  useEffect(() => {
    if (isUserPickerOpen && !canManageUsersFromNavbar) {
      setIsUserPickerOpen(false)
    }
  }, [canManageUsersFromNavbar, isUserPickerOpen])

  useEffect(() => {
    const onWorkflowStateUpdated = (event: Event) => {
      const detail = (event as CustomEvent<WorkflowStateEventDetail>).detail
      if (!detail?.projectId) return
      setWorkflowControlStateByProject((previous) => ({
        ...previous,
        [detail.projectId]: {
          isRunning: detail.isRunning,
          isPublishing: detail.isPublishing,
          publishState: detail.publishState,
          hasUnpublishedChanges: detail.hasUnpublishedChanges,
          runSchedule: detail.runSchedule,
        },
      }))
    }

    window.addEventListener(WORKFLOW_STATE_EVENT, onWorkflowStateUpdated as EventListener)
    return () =>
      window.removeEventListener(
        WORKFLOW_STATE_EVENT,
        onWorkflowStateUpdated as EventListener
      )
  }, [])

  const filteredWorkspaceUsers = useMemo(() => {
    const query = userSearchQuery.trim().toLowerCase()
    if (!query) return workspaceUsers

    return workspaceUsers.filter(
      (workspaceUser) =>
        workspaceUser.name.toLowerCase().includes(query) ||
        workspaceUser.email.toLowerCase().includes(query)
    )
  }, [workspaceUsers, userSearchQuery])

  const openUserPicker = useCallback(() => {
    if (!canManageUsersFromNavbar) return
    setUserSearchQuery("")
    setIsUserPickerOpen(true)
  }, [canManageUsersFromNavbar])

  const closeUserPicker = useCallback(() => {
    setIsUserPickerOpen(false)
  }, [])

  const dispatchWorkflowControlEvent = useCallback(
    (eventName: string) => {
      if (!workflowProjectId) return
      const detail: WorkflowControlEventDetail = { projectId: workflowProjectId }
      try {
        window.dispatchEvent(new CustomEvent(eventName, { detail }))
      } catch (error) {
        console.error("Failed to dispatch workflow control event:", error)
      }
    },
    [workflowProjectId]
  )
  const requestWorkflowRun = useCallback(() => {
    dispatchWorkflowControlEvent(WORKFLOW_RUN_EVENT)
  }, [dispatchWorkflowControlEvent])

  const requestWorkflowPublish = useCallback(() => {
    dispatchWorkflowControlEvent(WORKFLOW_PUBLISH_EVENT)
  }, [dispatchWorkflowControlEvent])

  const openWorkflowExecutionLog = useCallback(() => {
    dispatchWorkflowControlEvent(WORKFLOW_OPEN_LOG_EVENT)
  }, [dispatchWorkflowControlEvent])

  const requestWorkflowSetAutoRun = useCallback(
    (schedule: WorkflowRunSchedule) => {
      if (!workflowProjectId) return
      const detail: WorkflowSetAutoRunEventDetail = {
        projectId: workflowProjectId,
        schedule,
      }
      try {
        window.dispatchEvent(new CustomEvent(WORKFLOW_SET_AUTORUN_EVENT, { detail }))
      } catch (error) {
        console.error("Failed to dispatch workflow auto-run event:", error)
      }
    },
    [workflowProjectId]
  )

  const handleAddUser = useCallback((user: ChatParticipant) => {
    const nextParticipant: ChatParticipant = {
      name: user.name,
      fallback: user.fallback,
      src: user.src,
    }

    if (isAiCore) {
      setAiCoreParticipants((previous) => {
        if (previous.some((participant) => participant.name === nextParticipant.name)) {
          return previous
        }
        return [...previous, nextParticipant]
      })
      return
    }

    if (!isWorkflowProject || !workflowProjectId) return

    setWorkflowParticipantsByProject((previous) => {
      const currentParticipants = Object.prototype.hasOwnProperty.call(
        previous,
        workflowProjectId
      )
        ? previous[workflowProjectId] ?? []
        : getDefaultParticipantsForProject(activeWorkflowProject)

      if (currentParticipants.some((participant) => participant.name === nextParticipant.name)) {
        return previous
      }

      return {
        ...previous,
        [workflowProjectId]: [...currentParticipants, nextParticipant],
      }
    })
  }, [isAiCore, isWorkflowProject, workflowProjectId, activeWorkflowProject])

  const handleRemoveUser = useCallback((user: ChatParticipant) => {
    if (isAiCore) {
      setAiCoreParticipants((previous) =>
        previous.filter((participant) => participant.name !== user.name)
      )
      return
    }

    if (!isWorkflowProject || !workflowProjectId) return

    setWorkflowParticipantsByProject((previous) => {
      const currentParticipants = Object.prototype.hasOwnProperty.call(
        previous,
        workflowProjectId
      )
        ? previous[workflowProjectId] ?? []
        : getDefaultParticipantsForProject(activeWorkflowProject)

      return {
        ...previous,
        [workflowProjectId]: currentParticipants.filter(
          (participant) => participant.name !== user.name
        ),
      }
    })
  }, [isAiCore, isWorkflowProject, workflowProjectId, activeWorkflowProject])

  useEffect(() => {
    const handleOpenEvent = () => {
      if (!canManageUsersFromNavbar) return
      openUserPicker()
    }

    window.addEventListener(OPEN_MANAGE_CHAT_USERS_EVENT, handleOpenEvent as EventListener)
    return () =>
      window.removeEventListener(OPEN_MANAGE_CHAT_USERS_EVENT, handleOpenEvent as EventListener)
  }, [canManageUsersFromNavbar, openUserPicker])

  useEffect(() => {
    if (!isUserPickerOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeUserPicker()
      }
    }

    const handlePointerOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null
      if (!target) return
      if (userPickerCardRef.current?.contains(target)) return
      closeUserPicker()
    }

    document.addEventListener("keydown", handleKeyDown)
    document.addEventListener("mousedown", handlePointerOutside)
    document.addEventListener("touchstart", handlePointerOutside)

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.removeEventListener("mousedown", handlePointerOutside)
      document.removeEventListener("touchstart", handlePointerOutside)
    }
  }, [isUserPickerOpen, closeUserPicker])

  return (
    <>
      <header className="sticky top-0 z-40 flex h-10 shrink-0 items-center justify-between gap-1 border-b bg-background px-3">
        <div className="flex items-center gap-1.5">
          {sidebarState === "collapsed" && (
            <button
              type="button"
              onClick={toggleSidebar}
              aria-label="Expand sidebar"
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <HugeiconsIcon icon={SidebarLeftIcon} strokeWidth={1.5} className="size-4 rtl:rotate-180" />
            </button>
          )}
          <Breadcrumb>
            <BreadcrumbList>
              {isWorkflowProject ? (
                <>
                  <BreadcrumbItem>
                    <BreadcrumbLink
                      render={<button type="button" />}
                      onClick={() => router.push("/workflow")}
                    >
                      Workflow
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>{activeWorkflowProject?.title ?? "Project"}</BreadcrumbPage>
                  </BreadcrumbItem>
                </>
              ) : activeIntegrationAppName ? (
                <>
                  <BreadcrumbItem>
                    <BreadcrumbLink
                      render={<button type="button" />}
                      onClick={() => router.push("/integrations")}
                    >
                      Apps
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>{activeIntegrationAppName}</BreadcrumbPage>
                  </BreadcrumbItem>
                </>
              ) : (
                <BreadcrumbItem>
                  <BreadcrumbPage>
                    {isAiCore ? activeChatTitle : getPageTitle(pathname)}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              )}
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        <div className="flex items-center gap-1.5">
          {isSkills && (
            <Button
              size="sm"
              className="h-7 gap-1.5 px-2.5 text-xs"
              onClick={() => {
                window.dispatchEvent(new CustomEvent(OPEN_NEW_SKILL_DIALOG_EVENT))
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              New skill
            </Button>
          )}
          {isWorkflowProject && (
            <>
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={requestWorkflowRun}
                disabled={activeWorkflowControlState.isRunning}
                className="h-7 gap-1 px-2.5 text-xs disabled:cursor-not-allowed disabled:opacity-70"
              >
                {activeWorkflowControlState.isRunning ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Play className="h-3.5 w-3.5" />
                )}
                {activeWorkflowControlState.isRunning ? "Running..." : "Run"}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      type="button"
                      variant="default"
                      size="sm"
                      disabled={activeWorkflowControlState.isPublishing}
                      className="h-7 gap-1 px-2.5 text-xs disabled:cursor-not-allowed disabled:opacity-70"
                    />
                  }
                >
                  {activeWorkflowControlState.isPublishing ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Rocket className="h-3.5 w-3.5" />
                  )}
                  {workflowPublishButtonLabel}
                  <ChevronDown className="h-3.5 w-3.5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-56">
                  <DropdownMenuGroup>
                    <div className="flex items-center justify-between px-2 py-1.5">
                      <p className="truncate text-sm font-medium text-foreground">
                        {activeWorkflowProject?.title ?? "Workflow Project"}
                      </p>
                      <span className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        v1.2
                      </span>
                    </div>
                  </DropdownMenuGroup>
                  <DropdownMenuItem
                    onClick={requestWorkflowPublish}
                    disabled={activeWorkflowControlState.isPublishing}
                    className="bg-foreground text-background hover:bg-foreground/90 focus:bg-foreground/90 focus:text-background"
                  >
                    <Rocket className="h-3.5 w-3.5" />
                    Update Workflow
                  </DropdownMenuItem>
                  <div className="px-2 py-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Clock3 className="h-3.5 w-3.5" />
                      12m ago by Ethan Walker
                    </span>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="justify-between">
                      <span className="inline-flex items-center gap-1.5">
                        <Play className="h-3.5 w-3.5" />
                        Run Workflow
                      </span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent align="end" className="min-w-52">
                      <DropdownMenuItem
                        onClick={requestWorkflowRun}
                        disabled={activeWorkflowControlState.isRunning}
                      >
                        <Play className="h-3.5 w-3.5" />
                        Run now
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => requestWorkflowSetAutoRun({ mode: "off" })}>
                        Off
                        <span className="ms-auto text-xs text-muted-foreground">
                          {activeWorkflowControlState.runSchedule.mode === "off" ? "Active" : ""}
                        </span>
                      </DropdownMenuItem>
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger>Every</DropdownMenuSubTrigger>
                        <DropdownMenuSubContent align="end" className="min-w-56">
                          {(["minutes", "hours", "days", "weeks", "months"] as const).map(
                            (unit) => {
                              const isActive =
                                activeWorkflowControlState.runSchedule.mode === "every" &&
                                activeWorkflowControlState.runSchedule.unit === unit

                              return (
                                <DropdownMenuSub key={unit}>
                                  <DropdownMenuSubTrigger
                                    className="justify-between"
                                  >
                                    <span>{unit.charAt(0).toUpperCase() + unit.slice(1)}</span>
                                    <span className="ms-auto text-xs text-muted-foreground">
                                      {isActive ? "Active" : ""}
                                    </span>
                                  </DropdownMenuSubTrigger>
                                  <DropdownMenuSubContent align="end" className="min-w-52">
                                    <div
                                      className="px-2 py-2"
                                      onClick={(event) => event.stopPropagation()}
                                      onPointerDown={(event) => event.stopPropagation()}
                                    >
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs text-muted-foreground">Every</span>
                                        <Input
                                          type="number"
                                          min={1}
                                          step={1}
                                          value={everyIntervalValue}
                                          onChange={(event) => {
                                            const rawValue = event.target.value
                                            if (rawValue === "") {
                                              setEveryIntervalValue("")
                                              return
                                            }
                                            const nextValue = Number.parseInt(rawValue, 10)
                                            if (!Number.isFinite(nextValue)) return
                                            setEveryIntervalValue(
                                              String(Math.max(1, Math.min(9999, nextValue)))
                                            )
                                          }}
                                          onKeyDown={(event) => {
                                            event.stopPropagation()
                                            if (event.key !== "Enter") return
                                            event.preventDefault()
                                            const nextValue =
                                              everyIntervalValue.trim() === ""
                                                ? 1
                                                : parsedEveryIntervalValue
                                            setEveryIntervalValue(String(nextValue))
                                            requestWorkflowSetAutoRun({
                                              mode: "every",
                                              value: nextValue,
                                              unit,
                                            })
                                          }}
                                          className="h-8 w-20 text-xs"
                                        />
                                        <span className="text-xs text-muted-foreground">
                                          {unit}
                                        </span>
                                        <button
                                          type="button"
                                          aria-label={`Save ${unit} auto-run interval`}
                                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                                          onClick={() => {
                                            const nextValue =
                                              everyIntervalValue.trim() === ""
                                                ? 1
                                                : parsedEveryIntervalValue
                                            setEveryIntervalValue(String(nextValue))
                                            requestWorkflowSetAutoRun({
                                              mode: "every",
                                              value: nextValue,
                                              unit,
                                            })
                                          }}
                                        >
                                          <Check className="h-4 w-4" />
                                        </button>
                                      </div>
                                    </div>
                                  </DropdownMenuSubContent>
                                </DropdownMenuSub>
                              )
                            }
                          )}
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger>At</DropdownMenuSubTrigger>
                        <DropdownMenuSubContent align="end" className="w-fit min-w-0 p-0">
                          <div
                            className="space-y-3 p-3"
                            onClick={(event) => event.stopPropagation()}
                            onPointerDown={(event) => event.stopPropagation()}
                          >
                            <div className="rounded-lg border border-border">
                              <Calendar
                                mode="single"
                                selected={atDateValue}
                                onSelect={(nextDate) => {
                                  if (!nextDate) return
                                  setAtDateValue(nextDate)
                                }}
                                disabled={(date) => {
                                  const today = new Date()
                                  today.setHours(0, 0, 0, 0)
                                  return date < today
                                }}
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <Input
                                type="time"
                                step={60}
                                value={atTimeValue}
                                onChange={(event) => setAtTimeValue(event.target.value)}
                                onPointerDown={(event) => event.stopPropagation()}
                                onKeyDown={(event) => event.stopPropagation()}
                                className="h-8 text-xs"
                              />
                              <Button
                                type="button"
                                size="sm"
                                className="h-8 px-2"
                                onClick={() =>
                                  requestWorkflowSetAutoRun({
                                    mode: "at",
                                    atISO: atScheduleISO,
                                  })
                                }
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                              {activeWorkflowControlState.runSchedule.mode === "at"
                                ? "Active"
                                : "Select date and time, then save"}
                            </p>
                          </div>
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  <DropdownMenuItem
                    onClick={openWorkflowExecutionLog}
                    className="justify-between"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <FileClock className="h-3.5 w-3.5" />
                      View Execution Log
                    </span>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </DropdownMenuItem>
                  <div className="px-2 py-1 text-[11px] text-muted-foreground">
                    Auto-run: {getAutoRunLabel(activeWorkflowControlState.runSchedule)}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
          {shouldShowParticipantsTrigger && (
            <AvatarGroupTooltipTransitionDemo
              users={activeParticipants}
              onOpenUserPicker={openUserPicker}
              manageUsersLabel={manageUsersLabel}
            />
          )}
        </div>
      </header>
      {canManageUsersFromNavbar && isUserPickerOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
          <div
            ref={userPickerCardRef}
            className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-popover p-3 shadow-xl pointer-events-auto"
          >
            <div className="mb-2 flex items-center justify-between px-1">
              <p className="text-base font-semibold text-popover-foreground">
                {manageUsersLabel}
              </p>
              <button
                type="button"
                aria-label="Close user picker"
                onClick={closeUserPicker}
                className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mb-2 px-1">
              <Input
                value={userSearchQuery}
                onChange={(event) => setUserSearchQuery(event.target.value)}
                placeholder="Search by name or email"
                className="h-8"
              />
            </div>
            <div className="max-h-[70vh] space-y-1 overflow-y-auto">
              {filteredWorkspaceUsers.map((workspaceUser) => {
                const isIncluded = activeParticipantNames.has(workspaceUser.name)
                const isCurrentUser = workspaceUser.name === currentUserFullName
                const canRemove = isChatOwner && isIncluded && !isCurrentUser

                return (
                  <div
                    key={workspaceUser.name}
                    className="flex items-center justify-between gap-2 rounded-md px-1 py-1"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <Avatar size="sm" className="ring-background ring-2">
                        <AvatarImage src={workspaceUser.src} alt={workspaceUser.name} />
                        <AvatarFallback className="text-[10px]">{workspaceUser.fallback}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm text-popover-foreground">
                          {workspaceUser.name}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {workspaceUser.email}
                        </p>
                      </div>
                    </div>
                    {canRemove ? (
                      <button
                        type="button"
                        onClick={() => handleRemoveUser(workspaceUser)}
                        className="px-2 text-xs font-medium text-red-500 hover:text-red-600"
                      >
                        Remove
                      </button>
                    ) : isIncluded ? (
                      <Button size="xs" variant="secondary" disabled>
                        Added
                      </Button>
                    ) : (
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => handleAddUser(workspaceUser)}
                      >
                        Add
                      </Button>
                    )}
                  </div>
                )
              })}
              {filteredWorkspaceUsers.length === 0 && (
                <p className="px-2 py-4 text-center text-sm text-muted-foreground">
                  No users match this search.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
