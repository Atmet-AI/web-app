"use client"

import * as React from "react"
import packageJson from "@/package.json"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { LogoIcon } from "@/components/logo"
import { SearchForm } from "@/components/search-form"
import { WorkflowTopBarActions } from "@/components/workflow-top-bar-actions"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/registry/spell-ui/badge"
import { Button } from "@/components/ui/button"
import {
  ATMET_AUTH_CHANGED_EVENT,
  ATMET_USER_UPDATED_EVENT,
  useWorkspace,
} from "@/lib/workspace-context"
import {
  ATMET_APPEARANCE_SETTINGS_STORAGE_KEY,
  appearanceSettingsStorageKey,
} from "@/lib/sound-preferences"
import {
  Bell,
  Check,
  ChevronDown,
  Crown,
  Gift,
  Loader2,
  LogOut,
  Mail,
  Moon,
  Plus,
  Sun,
  User,
  Users,
  X,
} from "lucide-react"

const ATMET_OPEN_CREATE_WORKSPACE_EVENT = "atmet-open-create-workspace"
const ATMET_OPEN_WORKSPACE_MEMBERS_EVENT = "atmet-open-workspace-members"
const ATMET_OPEN_WORKSPACE_PROFILE_EVENT = "atmet-open-workspace-profile"
const ATMET_OPEN_ACCOUNT_PROFILE_EVENT = "atmet-open-account-profile"

type LiveUser = {
  id: string
  full_name: string | null
  email: string | null
  avatar_url: string | null
}

type PendingInvitation = {
  id: string
  token: string
  role: string
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

type AppearanceTheme = "light" | "dark" | "system"
type StoredAppearanceSettings = {
  theme?: AppearanceTheme
  timezone?: string
  language?: string
  fontScale?: "smaller" | "default" | "bigger"
  soundsEnabled?: boolean
  playgroundDotsEnabled?: boolean
}

function buildInitials(value: string | null | undefined, fallback = "U") {
  const initials = (value ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((token) => token[0]?.toUpperCase() ?? "")
    .join("")

  return initials || fallback
}

function unwrapRelation<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export function PlatformAppShell({ children }: { children: React.ReactNode }) {
  const {
    workspaces,
    activeWorkspaceId,
    setActiveWorkspace,
    refreshWorkspaces,
  } = useWorkspace()
  const router = useRouter()
  const { resolvedTheme, setTheme } = useTheme()
  const [liveUser, setLiveUser] = React.useState<LiveUser | null>(null)
  const [pendingInvitations, setPendingInvitations] = React.useState<
    PendingInvitation[]
  >([])
  const [isLoadingInvitations, setIsLoadingInvitations] = React.useState(false)
  const [activeInvitationToken, setActiveInvitationToken] = React.useState<
    string | null
  >(null)
  const [invitationError, setInvitationError] = React.useState<string | null>(
    null
  )
  const [declineInvitation, setDeclineInvitation] =
    React.useState<PendingInvitation | null>(null)

  const activeWorkspace =
    workspaces.find((workspace) => workspace.id === activeWorkspaceId) ??
    workspaces[0] ??
    null

  const refreshLiveUser = React.useCallback(() => {
    fetch("/api/users/me", { cache: "no-store", credentials: "same-origin" })
      .then((response) => (response.ok ? response.json() : null))
      .then(
        (
          payload: {
            data?: {
              user?: LiveUser
            }
          } | null
        ) => {
          if (payload?.data?.user) setLiveUser(payload.data.user)
        }
      )
      .catch(() => {})
  }, [])

  React.useEffect(() => {
    refreshLiveUser()
    window.addEventListener(ATMET_AUTH_CHANGED_EVENT, refreshLiveUser)
    window.addEventListener(ATMET_USER_UPDATED_EVENT, refreshLiveUser)

    return () => {
      window.removeEventListener(ATMET_AUTH_CHANGED_EVENT, refreshLiveUser)
      window.removeEventListener(ATMET_USER_UPDATED_EVENT, refreshLiveUser)
    }
  }, [refreshLiveUser])

  const loadPendingInvitations = React.useCallback(async () => {
    setIsLoadingInvitations(true)
    setInvitationError(null)
    try {
      const response = await fetch("/api/invitations")
      const payload = (await response.json().catch(() => null)) as {
        data?: { invitations?: PendingInvitation[] }
        error?: { message?: string }
      } | null

      if (!response.ok) {
        throw new Error(
          payload?.error?.message ?? "Unable to load invitations."
        )
      }

      setPendingInvitations(payload?.data?.invitations ?? [])
    } catch (error) {
      setInvitationError(
        error instanceof Error ? error.message : "Unable to load invitations."
      )
      setPendingInvitations([])
    } finally {
      setIsLoadingInvitations(false)
    }
  }, [])

  React.useEffect(() => {
    if (!liveUser?.email) return
    void loadPendingInvitations()

    const interval = window.setInterval(() => {
      void loadPendingInvitations()
    }, 60_000)

    return () => window.clearInterval(interval)
  }, [liveUser?.email, loadPendingInvitations])

  const respondToInvitation = React.useCallback(
    async (invitation: PendingInvitation, action: "accept" | "decline") => {
      setActiveInvitationToken(invitation.token)
      setInvitationError(null)
      try {
        const response = await fetch(
          `/api/invitations/${invitation.token}/respond`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action }),
          }
        )
        const payload = (await response.json().catch(() => null)) as {
          error?: { message?: string }
        } | null

        if (!response.ok) {
          throw new Error(
            payload?.error?.message ?? `Unable to ${action} invitation.`
          )
        }

        setPendingInvitations((previous) =>
          previous.filter((item) => item.token !== invitation.token)
        )

        if (action === "accept") {
          await refreshWorkspaces().catch(() => {})
        }
      } catch (error) {
        setInvitationError(
          error instanceof Error
            ? error.message
            : `Unable to ${action} invitation.`
        )
      } finally {
        setActiveInvitationToken(null)
        if (action === "decline") setDeclineInvitation(null)
      }
    },
    [refreshWorkspaces]
  )

  const workspaceName = activeWorkspace?.name ?? "Workspace"
  const userName = liveUser?.full_name || liveUser?.email || "Account"

  const dispatchAppEvent = React.useCallback((eventName: string) => {
    window.dispatchEvent(new CustomEvent(eventName))
  }, [])

  const handleSignOut = React.useCallback(async () => {
    try {
      await fetch("/api/auth/sign-out", { method: "POST" })
    } finally {
      setLiveUser(null)
      localStorage.removeItem("atmet_active_workspace")
      window.dispatchEvent(new CustomEvent(ATMET_AUTH_CHANGED_EVENT))
      router.push("/sign-in")
    }
  }, [router])

  const getWorkspaceFallback = React.useCallback(
    (name: string) => buildInitials(name, "W"),
    []
  )

  const toggleTheme = React.useCallback(() => {
    const nextTheme: AppearanceTheme =
      resolvedTheme === "dark" ? "light" : "dark"
    setTheme(nextTheme)

    if (typeof window === "undefined") return

    const userPreferenceKey = liveUser?.id ?? liveUser?.email ?? null
    const storageKey = appearanceSettingsStorageKey(userPreferenceKey)
    const rawSettings =
      window.localStorage.getItem(storageKey) ??
      window.localStorage.getItem(ATMET_APPEARANCE_SETTINGS_STORAGE_KEY)
    let currentSettings: StoredAppearanceSettings = {}

    if (rawSettings) {
      try {
        currentSettings = JSON.parse(rawSettings) as StoredAppearanceSettings
      } catch {
        currentSettings = {}
      }
    }

    const nextSettings: StoredAppearanceSettings = {
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      language: "English",
      fontScale: "default",
      soundsEnabled: true,
      playgroundDotsEnabled: false,
      ...currentSettings,
      theme: nextTheme,
    }

    window.localStorage.setItem(storageKey, JSON.stringify(nextSettings))
  }, [liveUser?.email, liveUser?.id, resolvedTheme, setTheme])

  const workspaceMenuItems = workspaces.length > 0 ? workspaces : []

  const renderWorkspaceAvatar = React.useCallback(
    (workspace: typeof activeWorkspace) => {
      if (!workspace) return null

      return (
        <Avatar className="size-6 shrink-0 rounded-md ring-1 ring-border/70">
          <AvatarImage
            src={workspace.avatar_url ?? undefined}
            alt={workspace.name}
            className="rounded-md object-cover"
          />
          <AvatarFallback className="rounded-md bg-primary/10 text-[10px] font-semibold text-primary">
            {getWorkspaceFallback(workspace.name)}
          </AvatarFallback>
        </Avatar>
      )
    },
    [getWorkspaceFallback]
  )

  return (
    <div
      data-platform-scope="true"
      className="flex h-svh min-h-0 flex-col bg-sidebar px-3 pt-1 pb-3 text-foreground dark:bg-black"
    >
      <header className="relative mx-auto flex h-9 w-full shrink-0 items-center justify-between gap-3 px-1">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex shrink-0 items-center gap-2">
            <span className="inline-flex size-6 items-center justify-center rounded-md bg-background ring-1 ring-border/70">
              <LogoIcon className="size-4" />
            </span>
          </div>
          <div className="hidden h-5 w-px bg-border sm:block" />
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  className="flex min-w-0 items-center gap-2 rounded-lg px-1 py-1 text-left transition-colors hover:bg-black/5 dark:hover:bg-white/7"
                />
              }
            >
              {renderWorkspaceAvatar(activeWorkspace)}
              <div className="min-w-0 leading-tight">
                <p className="truncate text-sm font-medium">{workspaceName}</p>
              </div>
              <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-56">
              {workspaceMenuItems.map((workspace) => (
                <DropdownMenuItem
                  key={workspace.id}
                  onClick={() => setActiveWorkspace(workspace.id)}
                  className="flex items-center justify-between"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <Avatar className="size-5 !rounded-[6px] after:!rounded-[6px]">
                      <AvatarImage
                        src={workspace.avatar_url ?? undefined}
                        alt={`${workspace.name} avatar`}
                        className="!rounded-[6px] object-cover"
                      />
                      <AvatarFallback className="!rounded-[6px] bg-primary/10 text-[11px] font-semibold text-primary">
                        {getWorkspaceFallback(workspace.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate">{workspace.name}</span>
                  </span>
                  {workspace.id === activeWorkspace?.id ? (
                    <Check className="h-4 w-4 text-primary" />
                  ) : null}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() =>
                  dispatchAppEvent(ATMET_OPEN_CREATE_WORKSPACE_EVENT)
                }
              >
                <Plus className="h-4 w-4 opacity-80" />
                Create workspace
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  dispatchAppEvent(ATMET_OPEN_WORKSPACE_MEMBERS_EVENT)
                }
              >
                <Users className="h-4 w-4 opacity-80" />
                Add users to workspace
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  dispatchAppEvent(ATMET_OPEN_WORKSPACE_PROFILE_EVENT)
                }
              >
                <Crown className="h-4 w-4 opacity-80" />
                Workspace profile
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="justify-between gap-3" disabled>
                <span className="flex min-w-0 items-center gap-1.5 whitespace-nowrap">
                  <Gift className="h-4 w-4 opacity-80" />
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
              <DropdownMenuItem className="justify-between gap-3" disabled>
                <span className="flex min-w-0 items-center gap-1.5 whitespace-nowrap">
                  <Crown className="h-4 w-4 opacity-80" />
                  Upgrade plan
                </span>
                <Badge
                  variant="red"
                  size="sm"
                  className="pointer-events-none shrink-0"
                >
                  Coming later
                </Badge>
              </DropdownMenuItem>
              <div className="flex items-center gap-1.5 px-1.5 py-1">
                <span className="text-[10px] whitespace-nowrap text-muted-foreground">
                  Version {packageJson.version}
                </span>
                <Badge
                  variant="blue"
                  size="sm"
                  className="pointer-events-none shrink-0"
                >
                  Alpha
                </Badge>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <SearchForm className="absolute top-1/2 left-1/2 hidden w-96 -translate-x-1/2 -translate-y-1/2 md:block xl:w-[30rem]" />

        <div className="flex min-w-0 items-center justify-end gap-1.5">
          <WorkflowTopBarActions />

          <button
            type="button"
            aria-label={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`}
            className="relative inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground active:scale-[0.96] dark:hover:bg-white/7"
            onClick={toggleTheme}
          >
            <Sun
              className={[
                "absolute size-4 transition-[opacity,transform,filter] duration-300 ease-[cubic-bezier(0.2,0,0,1)]",
                resolvedTheme === "dark"
                  ? "scale-25 opacity-0 blur-[4px]"
                  : "blur-0 scale-100 opacity-100",
              ].join(" ")}
            />
            <Moon
              className={[
                "absolute size-4 transition-[opacity,transform,filter] duration-300 ease-[cubic-bezier(0.2,0,0,1)]",
                resolvedTheme === "dark"
                  ? "blur-0 scale-100 opacity-100"
                  : "scale-25 opacity-0 blur-[4px]",
              ].join(" ")}
            />
          </button>

          <DropdownMenu
            onOpenChange={(open) => {
              if (open) void loadPendingInvitations()
            }}
          >
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  aria-label="Notifications"
                  className="relative inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground dark:hover:bg-white/7"
                />
              }
            >
              <Bell className="size-4" />
              {pendingInvitations.length > 0 ? (
                <span className="absolute top-0.5 right-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-primary px-1 text-[9px] leading-none font-medium text-primary-foreground tabular-nums">
                  {pendingInvitations.length > 9
                    ? "9+"
                    : pendingInvitations.length}
                </span>
              ) : null}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-86 p-0">
              <div className="flex items-center justify-between border-b border-border px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-popover-foreground">
                    Notifications
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Workspace invitations
                  </p>
                </div>
                {isLoadingInvitations ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                ) : null}
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
                  const invitationWorkspaceName = workspace?.name ?? "Workspace"
                  const inviterName =
                    inviter?.full_name || inviter?.email || "A teammate"
                  const isResponding =
                    activeInvitationToken === invitation.token

                  return (
                    <div
                      key={invitation.id}
                      className="rounded-lg px-2 py-2 transition-colors hover:bg-accent/60"
                    >
                      <div className="flex items-start gap-2">
                        <Avatar className="mt-0.5 size-7 rounded-lg">
                          <AvatarImage
                            src={workspace?.avatar_url ?? undefined}
                            alt={invitationWorkspaceName}
                            className="rounded-lg object-cover"
                          />
                          <AvatarFallback className="rounded-lg text-[10px]">
                            {buildInitials(invitationWorkspaceName, "W")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-popover-foreground">
                            {invitationWorkspaceName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Invited by {inviterName}
                          </p>
                          <p className="mt-0.5 text-[11px] text-muted-foreground capitalize">
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
                          {isResponding ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Check className="h-3 w-3" />
                          )}
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

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  className="flex min-w-0 items-center justify-end gap-2 rounded-lg px-1 py-1 text-right transition-colors hover:bg-black/5 dark:hover:bg-white/7"
                />
              }
            >
              <Avatar className="size-6 shrink-0 ring-1 ring-border/70">
                <AvatarImage
                  src={liveUser?.avatar_url ?? undefined}
                  alt={`${userName} avatar`}
                  className="object-cover"
                />
                <AvatarFallback className="text-[10px] font-semibold">
                  {buildInitials(userName)}
                </AvatarFallback>
              </Avatar>
              <div className="hidden min-w-0 text-left leading-tight sm:block">
                <p className="truncate text-sm font-medium">{userName}</p>
              </div>
              <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={toggleTheme}>
                {resolvedTheme === "dark" ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
                Theme toggle
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  dispatchAppEvent(ATMET_OPEN_ACCOUNT_PROFILE_EVENT)
                }
              >
                <User className="h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem className="justify-between gap-3" disabled>
                <span className="flex min-w-0 items-center gap-1.5 whitespace-nowrap">
                  <Gift className="h-4 w-4" />
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
              <DropdownMenuItem
                variant="destructive"
                onClick={() => {
                  void handleSignOut()
                }}
              >
                <LogOut className="h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <Dialog
        open={Boolean(declineInvitation)}
        onOpenChange={(open) => {
          if (!open) setDeclineInvitation(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline invitation?</DialogTitle>
            <DialogDescription>
              This will remove the pending invitation for{" "}
              {unwrapRelation(declineInvitation?.workspace)?.name ??
                "this workspace"}
              .
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
              disabled={activeInvitationToken === declineInvitation?.token}
              onClick={() => {
                if (!declineInvitation) return
                void respondToInvitation(declineInvitation, "decline")
              }}
            >
              {activeInvitationToken === declineInvitation?.token ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              Decline invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="mx-auto flex min-h-0 w-full flex-1 overflow-hidden">
        <div className="relative flex min-h-0 w-full overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  )
}
