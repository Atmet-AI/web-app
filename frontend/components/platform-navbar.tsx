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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { ATMET_AUTH_CHANGED_EVENT, ATMET_USER_UPDATED_EVENT, useWorkspace } from "@/lib/workspace-context"
import {
  Bell,
  Check,
  ChevronDown,
  ChevronRight,
  Clock3,
  FileClock,
  Loader2,
  Mail,
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
  id: string
  email: string
}

type PendingInvitation = {
  id: string
  token: string
  role: string
  created_at: string
  expires_at: string
  workspace:
    | {
        id: string
        name: string
        avatar_url: string | null
      }
    | Array<{
        id: string
        name: string
        avatar_url: string | null
      }>
    | null
  inviter:
    | {
        full_name: string | null
        email: string | null
      }
    | Array<{
        full_name: string | null
        email: string | null
      }>
    | null
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
  "/workflow": "Agents",
  "/automations": "Automations",
  "/skills": "Skills",
  "/integrations": "Apps",
  "/settings": "Settings",
  "/dashboard": "Dashboard",
}

function getPageTitle(pathname: string) {
  if (pathname.startsWith("/workflow")) {
    return "Agents"
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

function unwrapRelation<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] : value
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
  const { activeWorkspaceId, apiFetch, refreshWorkspaces } = useWorkspace()
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
  const isWorkflowProject = Boolean(workflowProjectId)
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
  const [liveUser, setLiveUser] = useState<{
    id: string
    full_name: string | null
    email: string | null
    avatar_url?: string | null
  } | null>(null)
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([])
  const [isLoadingInvitations, setIsLoadingInvitations] = useState(false)
  const [activeInvitationToken, setActiveInvitationToken] = useState<string | null>(null)
  const [invitationError, setInvitationError] = useState<string | null>(null)
  const [declineInvitation, setDeclineInvitation] = useState<PendingInvitation | null>(null)
  const [workspaceUserRows, setWorkspaceUserRows] = useState<WorkspaceUser[]>([])
  const [isUserPickerOpen, setIsUserPickerOpen] = useState(false)
  const [userSearchQuery, setUserSearchQuery] = useState("")
  const refreshLiveUser = useCallback(() => {
    fetch("/api/users/me", { cache: "no-store", credentials: "same-origin" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { data?: { user?: { id: string; full_name: string | null; email: string | null; avatar_url?: string | null } } } | null) => {
        if (payload?.data?.user) setLiveUser(payload.data.user)
      })
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    refreshLiveUser()
    window.addEventListener(ATMET_AUTH_CHANGED_EVENT, refreshLiveUser)
    window.addEventListener(ATMET_USER_UPDATED_EVENT, refreshLiveUser)
    return () => {
      window.removeEventListener(ATMET_AUTH_CHANGED_EVENT, refreshLiveUser)
      window.removeEventListener(ATMET_USER_UPDATED_EVENT, refreshLiveUser)
    }
  }, [refreshLiveUser])

  const loadPendingInvitations = useCallback(async () => {
    setIsLoadingInvitations(true)
    setInvitationError(null)
    try {
      const response = await fetch("/api/invitations")
      const payload = (await response.json().catch(() => null)) as
        | { data?: { invitations?: PendingInvitation[] }; error?: { message?: string } }
        | null

      if (!response.ok) {
        throw new Error(payload?.error?.message ?? "Unable to load invitations.")
      }

      setPendingInvitations(payload?.data?.invitations ?? [])
    } catch (error) {
      setInvitationError(error instanceof Error ? error.message : "Unable to load invitations.")
      setPendingInvitations([])
    } finally {
      setIsLoadingInvitations(false)
    }
  }, [])

  useEffect(() => {
    if (!liveUser?.email) return
    void loadPendingInvitations()

    const interval = window.setInterval(() => {
      void loadPendingInvitations()
    }, 60_000)

    return () => window.clearInterval(interval)
  }, [liveUser?.email, loadPendingInvitations])

  const respondToInvitation = useCallback(
    async (invitation: PendingInvitation, action: "accept" | "decline") => {
      setActiveInvitationToken(invitation.token)
      setInvitationError(null)
      try {
        const response = await fetch(`/api/invitations/${invitation.token}/respond`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        })
        const payload = (await response.json().catch(() => null)) as
          | { error?: { message?: string } }
          | null

        if (!response.ok) {
          throw new Error(payload?.error?.message ?? `Unable to ${action} invitation.`)
        }

        setPendingInvitations((previous) =>
          previous.filter((item) => item.token !== invitation.token)
        )

        if (action === "accept") {
          await refreshWorkspaces().catch(() => {})
        }
      } catch (error) {
        setInvitationError(error instanceof Error ? error.message : `Unable to ${action} invitation.`)
      } finally {
        setActiveInvitationToken(null)
        if (action === "decline") setDeclineInvitation(null)
      }
    },
    [refreshWorkspaces]
  )
  useEffect(() => {
    if (!activeWorkspaceId) {
      setWorkspaceUserRows([])
      return
    }

    apiFetch(`/api/workspaces/${activeWorkspaceId}/members`)
      .then((response) => (response.ok ? response.json() : null))
      .then(
        (payload: {
          data?: {
            members?: Array<{
              user?: {
                id: string
                email: string | null
                full_name: string | null
                avatar_url: string | null
                status: string | null
              } | null
            }>
          }
        } | null) => {
          setWorkspaceUserRows(
            (payload?.data?.members ?? []).flatMap((member) => {
              const user = member.user
              if (!user?.id || user.status !== "active") return []
              if (liveUser?.email && user.email === liveUser.email) return []

              const name = user.full_name || user.email || "Workspace user"
              return {
                id: user.id,
                name,
                fallback: buildFallbackFromName(name),
                email: user.email ?? "",
                src: user.avatar_url ?? undefined,
              }
            })
          )
        }
      )
      .catch(() => setWorkspaceUserRows([]))
  }, [activeWorkspaceId, apiFetch, liveUser?.email])
  const workspaceUsers = useMemo<WorkspaceUser[]>(
    () => workspaceUserRows,
    [workspaceUserRows]
  )
  const [aiCoreParticipants, setAiCoreParticipants] = useState<WorkspaceUser[]>([])
  const [chatParticipantError, setChatParticipantError] = useState<string | null>(null)
  const [updatingParticipantId, setUpdatingParticipantId] = useState<string | null>(null)
  useEffect(() => {
    if (!isAiCore || !activeChatId) {
      setAiCoreParticipants([])
      setChatParticipantError(null)
      return
    }

    let cancelled = false

    apiFetch(`/api/chats/${activeChatId}/users`, { cache: "no-store" })
      .then(async (response) => {
        const payload = (await response.json().catch(() => null)) as
          | {
              data?: {
                users?: Array<{
                  user?:
                    | {
                        id: string
                        email: string | null
                        full_name: string | null
                        avatar_url?: string | null
                        status?: string | null
                      }
                    | Array<{
                        id: string
                        email: string | null
                        full_name: string | null
                        avatar_url?: string | null
                        status?: string | null
                      }>
                    | null
                }>
              }
              error?: { message?: string }
            }
          | null

        if (!response.ok) {
          throw new Error(payload?.error?.message ?? "Unable to load chat users.")
        }

        return payload?.data?.users ?? []
      })
      .then((rows) => {
        if (cancelled) return

        const participants = rows.flatMap((row) => {
          const user = unwrapRelation(row.user)
          if (!user?.id) return []
          if (user.status && user.status !== "active") return []
          if (liveUser?.email && user.email === liveUser.email) return []

          const name = user.full_name || user.email || "Workspace user"
          return {
            id: user.id,
            name,
            fallback: buildFallbackFromName(name),
            email: user.email ?? "",
            src: user.avatar_url ?? undefined,
          }
        })

        setAiCoreParticipants(participants)
      })
      .catch((error) => {
        if (cancelled) return
        setAiCoreParticipants([])
        setChatParticipantError(
          error instanceof Error ? error.message : "Unable to load chat users."
        )
      })

    return () => {
      cancelled = true
    }
  }, [activeChatId, apiFetch, isAiCore, liveUser?.email])
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
  const activeParticipantEmails = useMemo(
    () =>
      new Set(
        (activeParticipants as WorkspaceUser[])
          .map((participant) => participant.email)
          .filter(Boolean)
      ),
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
    if (!isWorkflowProject || !workflowProjectId) return
    if (
      Object.prototype.hasOwnProperty.call(
        workflowParticipantsByProject,
        workflowProjectId
      )
    ) {
      return
    }

    let cancelled = false

    apiFetch(`/api/automations/${workflowProjectId}`, { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then(
        (
          payload: {
            data?: {
              chatUsers?: Array<{
                user?:
                  | {
                      id: string
                      email: string | null
                      full_name: string | null
                      avatar_url?: string | null
                      status?: string | null
                    }
                  | Array<{
                      id: string
                      email: string | null
                      full_name: string | null
                      avatar_url?: string | null
                      status?: string | null
                    }>
                  | null
              }>
            }
          } | null
        ) => {
          if (cancelled) return

          const participants = (payload?.data?.chatUsers ?? []).flatMap((row) => {
            const user = unwrapRelation(row.user)
            if (!user?.id) return []
            if (user.status && user.status !== "active") return []
            if (liveUser?.email && user.email === liveUser.email) return []

            const name = user.full_name || user.email || "Workspace user"
            return {
              id: user.id,
              name,
              fallback: buildFallbackFromName(name),
              email: user.email ?? "",
              src: user.avatar_url ?? undefined,
            }
          })

          if (participants.length === 0) return

          setWorkflowParticipantsByProject((previous) => {
            if (
              Object.prototype.hasOwnProperty.call(previous, workflowProjectId)
            ) {
              return previous
            }

            return {
              ...previous,
              [workflowProjectId]: participants,
            }
          })
        }
      )
      .catch(() => undefined)

    return () => {
      cancelled = true
    }
  }, [
    apiFetch,
    isWorkflowProject,
    liveUser?.email,
    workflowParticipantsByProject,
    workflowProjectId,
  ])

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

  const handleAddUser = useCallback(async (user: WorkspaceUser) => {
    const nextParticipant: WorkspaceUser = {
      id: user.id,
      name: user.name,
      fallback: user.fallback,
      email: user.email,
      src: user.src,
    }

    if (isAiCore) {
      if (!activeChatId) {
        setChatParticipantError("Send a message first to create this chat, then add people.")
        return
      }

      setChatParticipantError(null)
      setUpdatingParticipantId(user.id)
      try {
        const response = await apiFetch(`/api/chats/${activeChatId}/users`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: user.id }),
        })
        const payload = (await response.json().catch(() => null)) as
          | { error?: { message?: string } }
          | null

        if (!response.ok) {
          throw new Error(payload?.error?.message ?? "Unable to add this user.")
        }

        setAiCoreParticipants((previous) => {
          if (previous.some((participant) => participant.id === nextParticipant.id)) {
            return previous
          }
          return [...previous, nextParticipant]
        })
      } catch (error) {
        setChatParticipantError(
          error instanceof Error ? error.message : "Unable to add this user."
        )
      } finally {
        setUpdatingParticipantId(null)
      }
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

      if (
        currentParticipants.some(
          (participant) => participant.name === nextParticipant.name
        )
      ) {
        return previous
      }

      return {
        ...previous,
        [workflowProjectId]: [...currentParticipants, nextParticipant],
      }
    })
  }, [activeChatId, activeWorkflowProject, apiFetch, isAiCore, isWorkflowProject, workflowProjectId])

  const handleRemoveUser = useCallback(async (user: WorkspaceUser) => {
    if (isAiCore) {
      if (!activeChatId) {
        setAiCoreParticipants((previous) =>
          previous.filter((participant) => participant.id !== user.id)
        )
        return
      }

      setChatParticipantError(null)
      setUpdatingParticipantId(user.id)
      try {
        const response = await apiFetch(`/api/chats/${activeChatId}/users`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: user.id }),
        })
        const payload = (await response.json().catch(() => null)) as
          | { error?: { message?: string } }
          | null

        if (!response.ok) {
          throw new Error(payload?.error?.message ?? "Unable to remove this user.")
        }

        setAiCoreParticipants((previous) =>
          previous.filter((participant) => participant.id !== user.id)
        )
      } catch (error) {
        setChatParticipantError(
          error instanceof Error ? error.message : "Unable to remove this user."
        )
      } finally {
        setUpdatingParticipantId(null)
      }
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
  }, [activeChatId, activeWorkflowProject, apiFetch, isAiCore, isWorkflowProject, workflowProjectId])

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
                      Agents
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
                    className="bg-primary text-primary-foreground hover:bg-primary/90 focus:bg-primary/90 focus:text-primary-foreground"
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
          <DropdownMenu onOpenChange={(open) => {
            if (open) void loadPendingInvitations()
          }}>
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="relative h-7 w-7"
                  aria-label="Notifications"
                />
              }
            >
              <Bell className="h-4 w-4" />
              {pendingInvitations.length > 0 ? (
                <span className="absolute -top-0.5 -right-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-medium leading-none text-primary-foreground tabular-nums">
                  {pendingInvitations.length > 9 ? "9+" : pendingInvitations.length}
                </span>
              ) : null}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-86 p-0">
              <div className="flex items-center justify-between border-b border-border px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-popover-foreground">Notifications</p>
                  <p className="text-xs text-muted-foreground">
                    Workspace invitations
                  </p>
                </div>
                {isLoadingInvitations ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" /> : null}
              </div>
              <div className="max-h-96 overflow-y-auto p-2">
                {invitationError ? (
                  <p className="rounded-md bg-destructive/10 px-2 py-2 text-xs text-destructive">
                    {invitationError}
                  </p>
                ) : null}
                {pendingInvitations.map((invitation) => {
                  const workspace = unwrapRelation(invitation.workspace)
                  const inviter = unwrapRelation(invitation.inviter)
                  const workspaceName = workspace?.name ?? "Workspace"
                  const inviterName = inviter?.full_name || inviter?.email || "A teammate"
                  const isResponding = activeInvitationToken === invitation.token

                  return (
                    <div
                      key={invitation.id}
                      className="rounded-lg px-2 py-2 transition-colors hover:bg-accent/60"
                    >
                      <div className="flex items-start gap-2">
                        <Avatar size="sm" className="mt-0.5 rounded-lg">
                          <AvatarImage src={workspace?.avatar_url ?? undefined} alt={workspaceName} />
                          <AvatarFallback className="rounded-lg text-[10px]">
                            {buildFallbackFromName(workspaceName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-popover-foreground">
                            {workspaceName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Invited by {inviterName}
                          </p>
                          <p className="mt-0.5 text-[11px] capitalize text-muted-foreground">
                            Role: {invitation.role}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 flex gap-2 ps-8">
                        <Button
                          type="button"
                          size="xs"
                          className="flex-1"
                          disabled={isResponding}
                          onClick={(event) => {
                            event.preventDefault()
                            void respondToInvitation(invitation, "accept")
                          }}
                        >
                          {isResponding ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                          Accept
                        </Button>
                        <Button
                          type="button"
                          size="xs"
                          variant="outline"
                          className="flex-1"
                          disabled={isResponding}
                          onClick={(event) => {
                            event.preventDefault()
                            setDeclineInvitation(invitation)
                          }}
                        >
                          <X className="h-3 w-3" />
                          Decline
                        </Button>
                      </div>
                    </div>
                  )
                })}
                {!isLoadingInvitations && pendingInvitations.length === 0 ? (
                  <div className="px-3 py-8 text-center">
                    <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <Mail className="h-4 w-4" />
                    </div>
                    <p className="text-sm font-medium text-popover-foreground">
                      No invitations
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      New workspace invites will appear here.
                    </p>
                  </div>
                ) : null}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
          {shouldShowParticipantsTrigger && (
            <AvatarGroupTooltipTransitionDemo
              users={activeParticipants}
              onOpenUserPicker={openUserPicker}
              manageUsersLabel={manageUsersLabel}
            />
          )}
        </div>
      </header>
      <Dialog open={Boolean(declineInvitation)} onOpenChange={(open) => {
        if (!open) setDeclineInvitation(null)
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline invitation?</DialogTitle>
            <DialogDescription>
              This will remove the pending invitation for{" "}
              {unwrapRelation(declineInvitation?.workspace)?.name ?? "this workspace"}.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeclineInvitation(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={!declineInvitation || activeInvitationToken === declineInvitation.token}
              onClick={() => {
                if (!declineInvitation) return
                void respondToInvitation(declineInvitation, "decline")
              }}
            >
              {declineInvitation && activeInvitationToken === declineInvitation.token ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : null}
              Decline
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
              {isAiCore && !activeChatId ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Send a message first to create this chat, then add teammates.
                </p>
              ) : null}
              {chatParticipantError ? (
                <p className="mt-2 text-xs text-destructive">
                  {chatParticipantError}
                </p>
              ) : null}
            </div>
            <div className="max-h-[70vh] space-y-1 overflow-y-auto">
              {filteredWorkspaceUsers.map((workspaceUser) => {
                const isIncluded =
                  activeParticipantEmails.has(workspaceUser.email) ||
                  activeParticipantNames.has(workspaceUser.name)
                const canRemove = isChatOwner && isIncluded
                const isUpdating = updatingParticipantId === workspaceUser.id
                const canAdd = !isAiCore || Boolean(activeChatId)

                return (
                  <div
                    key={workspaceUser.id}
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
                        disabled={isUpdating}
                        onClick={() => void handleRemoveUser(workspaceUser)}
                        className="px-2 text-xs font-medium text-red-500 hover:text-red-600"
                      >
                        {isUpdating ? "Removing" : "Remove"}
                      </button>
                    ) : isIncluded ? (
                      <Button size="xs" variant="secondary" disabled>
                        {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : "Added"}
                      </Button>
                    ) : (
                      <Button
                        size="xs"
                        variant="outline"
                        disabled={!canAdd || isUpdating}
                        onClick={() => void handleAddUser(workspaceUser)}
                      >
                        {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : "Add"}
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
