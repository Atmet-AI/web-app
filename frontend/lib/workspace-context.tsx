"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { useRouter, usePathname } from "next/navigation"

export type Workspace = {
  id: string
  name: string
  plan: string
  owner_id: string
  role: string
  avatar_url?: string | null
  country?: string | null
  owner?: {
    email?: string | null
    phone_country?: string | null
  } | null
}

type WorkspaceContextValue = {
  workspaces: Workspace[]
  activeWorkspaceId: string | null
  setActiveWorkspace: (id: string) => void
  refreshWorkspaces: () => Promise<void>
  isLoading: boolean
  apiFetch: (path: string, init?: RequestInit) => Promise<Response>
}

const WorkspaceContext = createContext<WorkspaceContextValue>({
  workspaces: [],
  activeWorkspaceId: null,
  setActiveWorkspace: () => {},
  refreshWorkspaces: async () => {},
  isLoading: true,
  apiFetch: (path, init) => fetch(path, init),
})

const ACTIVE_WS_KEY = "atmet_active_workspace"
export const ATMET_AUTH_CHANGED_EVENT = "atmet-auth-changed"
export const ATMET_USER_UPDATED_EVENT = "atmet-user-updated"

const ONBOARDING_PATH = "/onboarding"
const SKIP_REDIRECT_PATHS = [
  ONBOARDING_PATH,
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/waitlist",
  "/invite",
]

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [activeWorkspaceId, setActiveWorkspaceIdState] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  const loadWorkspaceState = useCallback(async () => {
    const stored = typeof window !== "undefined"
      ? localStorage.getItem(ACTIVE_WS_KEY)
      : null
    const [wsResponse, userResponse] = await Promise.all([
      fetch("/api/workspaces", { cache: "no-store", credentials: "same-origin" }),
      fetch("/api/users/me", { cache: "no-store", credentials: "same-origin" }),
    ])
    const wsPayload = (await wsResponse.json().catch(() => null)) as
      | { data?: { workspaces: Workspace[] } }
      | null
    const userPayload = (await userResponse.json().catch(() => null)) as
      | { data?: { user?: { onboarding_completed?: boolean; platform_role?: string } } }
      | null
    const ws = wsPayload?.data?.workspaces ?? []
    setWorkspaces(ws)

    const isPlatformAdmin = userPayload?.data?.user?.platform_role === "super_admin"
    const needsOnboarding =
      !isPlatformAdmin &&
      (!userPayload?.data?.user?.onboarding_completed || ws.length === 0)

    if (needsOnboarding && !SKIP_REDIRECT_PATHS.some(p => pathname?.startsWith(p))) {
      router.push(ONBOARDING_PATH)
      return
    }

    const storedValid = stored && ws.some((w) => w.id === stored)
    const firstId = ws[0]?.id ?? null
    const activeId = storedValid ? stored : firstId

    setActiveWorkspaceIdState(activeId)
    if (activeId && typeof window !== "undefined") {
      localStorage.setItem(ACTIVE_WS_KEY, activeId)
    }
  }, [pathname, router])

  const refreshWorkspaces = useCallback(async () => {
    await loadWorkspaceState()
  }, [loadWorkspaceState])

  useEffect(() => {
    Promise.resolve()
      .then(loadWorkspaceState)
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [loadWorkspaceState])

  useEffect(() => {
    const refresh = () => {
      setIsLoading(true)
      loadWorkspaceState()
        .catch(() => {})
        .finally(() => setIsLoading(false))
    }

    window.addEventListener(ATMET_AUTH_CHANGED_EVENT, refresh)
    window.addEventListener(ATMET_USER_UPDATED_EVENT, refresh)
    window.addEventListener("focus", refresh)

    return () => {
      window.removeEventListener(ATMET_AUTH_CHANGED_EVENT, refresh)
      window.removeEventListener(ATMET_USER_UPDATED_EVENT, refresh)
      window.removeEventListener("focus", refresh)
    }
  }, [loadWorkspaceState])

  const setActiveWorkspace = useCallback((id: string) => {
    setActiveWorkspaceIdState(id)
    if (typeof window !== "undefined") {
      localStorage.setItem(ACTIVE_WS_KEY, id)
    }
  }, [])

  const apiFetch = useCallback(
    (path: string, init: RequestInit = {}) => {
      const headers = new Headers(init.headers)
      if (activeWorkspaceId) {
        headers.set("x-workspace-id", activeWorkspaceId)
      }
      return fetch(path, {
        ...init,
        headers,
        cache: init.cache ?? "no-store",
        credentials: init.credentials ?? "same-origin",
      })
    },
    [activeWorkspaceId]
  )

  const value = useMemo(
    () => ({ workspaces, activeWorkspaceId, setActiveWorkspace, refreshWorkspaces, isLoading, apiFetch }),
    [workspaces, activeWorkspaceId, setActiveWorkspace, refreshWorkspaces, isLoading, apiFetch]
  )

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}

export function useWorkspace() {
  return useContext(WorkspaceContext)
}
