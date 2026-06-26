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

const ONBOARDING_PATH = "/onboarding"
const SKIP_REDIRECT_PATHS = [ONBOARDING_PATH, "/sign-in", "/sign-up", "/forgot-password", "/verify-email", "/waitlist"]

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [activeWorkspaceId, setActiveWorkspaceIdState] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  const refreshWorkspaces = useCallback(async () => {
    const stored = typeof window !== "undefined"
      ? localStorage.getItem(ACTIVE_WS_KEY)
      : null
    const res = await fetch("/api/workspaces")
    const payload = (await res.json()) as { data?: { workspaces: Workspace[] } }
    const ws = payload.data?.workspaces ?? []
    setWorkspaces(ws)

    const storedValid = stored && ws.some((w) => w.id === stored)
    const firstId = ws[0]?.id ?? null
    const activeId = storedValid ? stored : firstId

    setActiveWorkspaceIdState(activeId)
    if (activeId && typeof window !== "undefined") {
      localStorage.setItem(ACTIVE_WS_KEY, activeId)
    }
  }, [])

  useEffect(() => {
    const stored = typeof window !== "undefined"
      ? localStorage.getItem(ACTIVE_WS_KEY)
      : null

    Promise.all([
      fetch("/api/workspaces").then((r) => r.json()),
      fetch("/api/users/me").then((r) => r.json()),
    ])
      .then(([wsRes, userRes]: [{ data?: { workspaces: Workspace[] } }, { data?: { user: { onboarding_completed?: boolean; platform_role?: string } } }]) => {
        const ws = wsRes.data?.workspaces ?? []
        setWorkspaces(ws)

        const isPlatformAdmin = userRes.data?.user?.platform_role === "super_admin"
        const needsOnboarding =
          !isPlatformAdmin &&
          (!userRes.data?.user?.onboarding_completed || ws.length === 0)

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
      })
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [pathname, router])

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
      return fetch(path, { ...init, headers })
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
