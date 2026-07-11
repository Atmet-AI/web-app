"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Search } from "lucide-react"

import { Badge } from "@/registry/spell-ui/badge"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { isIntegrationAvailable } from "@/lib/integrations/availability"
import type {
  CatalogIntegration,
  IntegrationCategory,
} from "@/lib/integrations-catalog"
import { useWorkspace } from "@/lib/workspace-context"

type Integration = CatalogIntegration & {
  connected?: boolean
  status?: string
  connected_at?: string
}

const categoryLabels: Record<IntegrationCategory, string> = {
  communication: "Communication",
  productivity: "Productivity",
  crm: "CRM",
  developer: "Developer",
  social: "Social",
  generic: "Generic",
}

const appActionButtonClass =
  "h-7 w-full rounded-lg px-4 py-0 text-xs font-medium leading-none"

export default function AppsPage() {
  const router = useRouter()
  const {
    activeWorkspaceId,
    apiFetch,
    isLoading: isWorkspaceLoading,
  } = useWorkspace()
  const [integrations, setIntegrations] = React.useState<Integration[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [categoryFilter, setCategoryFilter] = React.useState<
    "all" | IntegrationCategory
  >("all")
  const [availabilityFilter, setAvailabilityFilter] = React.useState<
    "all" | "active" | "soon"
  >("all")

  const loadIntegrations = React.useCallback(async () => {
    if (isWorkspaceLoading || !activeWorkspaceId) return

    setIsLoading(true)
    setErrorMessage(null)

    try {
      const response = await apiFetch("/api/integrations")

      if (!response.ok) {
        throw new Error("Failed to fetch integrations.")
      }

      const res = (await response.json()) as {
        data?: { integrations: Integration[] }
      }
      setIntegrations(res.data?.integrations ?? [])
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Something went wrong."
      setErrorMessage(message)
    } finally {
      setIsLoading(false)
    }
  }, [activeWorkspaceId, apiFetch, isWorkspaceLoading])

  React.useEffect(() => {
    void loadIntegrations()
  }, [loadIntegrations])

  const categories = React.useMemo(
    () =>
      Array.from(
        new Set(integrations.map((integration) => integration.category))
      ),
    [integrations]
  )

  const filteredIntegrations = React.useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()

    return integrations.filter((integration) => {
      const matchesCategory =
        categoryFilter === "all" || integration.category === categoryFilter
      const isAvailable = isIntegrationAvailable(integration)
      const matchesAvailability =
        availabilityFilter === "all" ||
        (availabilityFilter === "active" && isAvailable) ||
        (availabilityFilter === "soon" && !isAvailable)
      const matchesQuery =
        normalizedQuery.length === 0 ||
        integration.name.toLowerCase().includes(normalizedQuery)

      return matchesCategory && matchesAvailability && matchesQuery
    })
  }, [availabilityFilter, categoryFilter, integrations, searchQuery])

  return (
    <div className="flex min-h-[calc(100vh-2.5rem)] flex-1 flex-col bg-background">
      <section className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div className="space-y-5">
          <header className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Apps
            </h1>
            <p className="text-sm text-muted-foreground">
              Browse and manage integrations available for your workspace.
            </p>
          </header>

          <section data-filter-bar-scope="true" className="flex flex-col gap-3">
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search integrations"
                className="surface-filter-field h-7 rounded-lg border-transparent pl-7 text-xs"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant={categoryFilter === "all" ? "secondary" : "outline"}
                onClick={() => setCategoryFilter("all")}
                className="h-7 text-xs"
              >
                All
              </Button>
              {categories.map((category) => (
                <Button
                  key={category}
                  type="button"
                  size="sm"
                  variant={
                    categoryFilter === category ? "secondary" : "outline"
                  }
                  onClick={() => setCategoryFilter(category)}
                  className="h-7 text-xs"
                >
                  {categoryLabels[category]}
                </Button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              {(["all", "active", "soon"] as const).map((status) => (
                <Button
                  key={status}
                  type="button"
                  size="sm"
                  variant={
                    availabilityFilter === status ? "secondary" : "outline"
                  }
                  onClick={() => setAvailabilityFilter(status)}
                  className="h-7 text-xs capitalize"
                >
                  {status === "all" ? "All apps" : status}
                </Button>
              ))}
            </div>
          </section>

          {isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="rounded-xl bg-sidebar p-3.5">
                  <Skeleton className="h-8 w-8 rounded-md" />
                  <div className="mt-2.5 space-y-2">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-5/6" />
                  </div>
                  <Skeleton className="mt-4 h-8 w-full" />
                </div>
              ))}
            </div>
          ) : errorMessage ? (
            <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {errorMessage}
            </div>
          ) : filteredIntegrations.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              {filteredIntegrations.map((integration) => (
                <IntegrationCard
                  key={integration.slug}
                  integration={integration}
                  onOpen={() => router.push(`/apps/${integration.slug}`)}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
              No integrations match your current filters.
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function IntegrationCard({
  integration,
  onOpen,
}: {
  integration: Integration
  onOpen: () => void
}) {
  const isAvailable = isIntegrationAvailable(integration)

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          onOpen()
        }
      }}
      className="flex min-h-[184px] flex-col rounded-xl bg-sidebar p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-colors hover:bg-sidebar-accent/70 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <span className="inline-flex h-8 w-8 items-center justify-center overflow-hidden rounded-md bg-white shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]">
        <img
          src={integration.logo}
          alt={`${integration.name} logo`}
          className="h-5 w-5 object-contain"
          onError={(event) => {
            event.currentTarget.style.display = "none"
          }}
        />
      </span>

      <div className="mt-2.5 space-y-1">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">
          {integration.name}
        </h2>
        <p className="line-clamp-2 text-xs leading-4 text-muted-foreground">
          {integration.description}
        </p>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        <Badge variant="neutral" size="sm">
          {categoryLabels[integration.category]}
        </Badge>
        {isAvailable ? null : (
          <Badge variant="amber" size="sm">
            Soon
          </Badge>
        )}
        {integration.connected && isAvailable ? (
          <Badge variant="green" size="sm">
            Connected
          </Badge>
        ) : null}
      </div>

      <div
        className="mt-auto pt-3"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        {isAvailable ? (
          <Button
            type="button"
            size="sm"
            onClick={onOpen}
            className={
              integration.connected
                ? `${appActionButtonClass} border-0 bg-white text-foreground shadow-none hover:bg-primary hover:text-white dark:bg-sidebar-accent dark:text-foreground dark:hover:bg-primary dark:hover:text-white`
                : `${appActionButtonClass} bg-primary text-primary-foreground hover:bg-primary/90`
            }
          >
            {integration.connected ? "Manage" : "Connect"}
          </Button>
        ) : (
          <Button
            disabled
            size="sm"
            className={`${appActionButtonClass} bg-primary text-primary-foreground`}
          >
            Soon
          </Button>
        )}
      </div>
    </article>
  )
}
