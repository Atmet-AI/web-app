"use client"

import * as React from "react"
import Link from "next/link"
import { Search } from "lucide-react"

import { Badge } from "@/registry/spell-ui/badge"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import type { Integration, IntegrationCategory } from "@/lib/integrations-store"

const categoryLabels: Record<IntegrationCategory, string> = {
  communication: "Communication",
  productivity: "Productivity",
  crm: "CRM",
  developer: "Developer",
  social: "Social",
  generic: "Generic",
}

function getAuthTypeLabel(authType: Integration["authType"]) {
  return authType === "oauth" ? "OAuth 2.0" : "API Key"
}

export default function AppsPage() {
  const [integrations, setIntegrations] = React.useState<Integration[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [categoryFilter, setCategoryFilter] = React.useState<"all" | IntegrationCategory>("all")
  const [selectedIntegration, setSelectedIntegration] = React.useState<Integration | null>(null)

  const loadIntegrations = React.useCallback(async () => {
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const response = await fetch("/api/integrations", { cache: "no-store" })

      if (!response.ok) {
        throw new Error("Failed to fetch integrations.")
      }

      const data = (await response.json()) as Integration[]
      setIntegrations(data)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong."
      setErrorMessage(message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void loadIntegrations()
  }, [loadIntegrations])

  const categories = React.useMemo(
    () => Array.from(new Set(integrations.map((integration) => integration.category))),
    [integrations]
  )

  const filteredIntegrations = React.useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()

    return integrations.filter((integration) => {
      const matchesCategory = categoryFilter === "all" || integration.category === categoryFilter
      const matchesQuery =
        normalizedQuery.length === 0 || integration.name.toLowerCase().includes(normalizedQuery)

      return matchesCategory && matchesQuery
    })
  }, [categoryFilter, integrations, searchQuery])

  return (
    <div className="flex min-h-[calc(100vh-2.5rem)] flex-1 flex-col bg-background">
      <section className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div className="space-y-5">
          <header className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Apps</h1>
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
                  variant={categoryFilter === category ? "secondary" : "outline"}
                  onClick={() => setCategoryFilter(category)}
                  className="h-7 text-xs"
                >
                  {categoryLabels[category]}
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
                <article
                  key={integration.slug}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedIntegration(integration)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault()
                      setSelectedIntegration(integration)
                    }
                  }}
                  className="flex min-h-[184px] flex-col rounded-xl bg-sidebar p-3.5 transition-colors hover:bg-sidebar-accent/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="inline-flex h-8 w-8 items-center justify-center overflow-hidden rounded-md bg-sidebar-accent">
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
                    <Badge variant="blue" size="sm">
                      {getAuthTypeLabel(integration.authType)}
                    </Badge>
                    {integration.connected ? (
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
                    <Button
                      render={<Link href={`/apps/${integration.slug}`} />}
                      className={
                        integration.connected
                          ? "h-8 w-full rounded-md bg-sidebar text-xs font-medium text-foreground hover:bg-sidebar-accent"
                          : "h-8 w-full rounded-md bg-black text-xs font-medium text-white hover:bg-black/90"
                      }
                    >
                      {integration.connected ? "Manage" : "Connect"}
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
              No integrations match your current filters.
            </div>
          )}
        </div>
      </section>

      <Dialog
        open={selectedIntegration !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedIntegration(null)
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto p-0 sm:max-w-2xl">
          {selectedIntegration && (
            <>
              <DialogHeader className="border-b border-border p-6">
                <div className="flex items-start gap-4 pr-8">
                  <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-sidebar-accent">
                    <img
                      src={selectedIntegration.logo}
                      alt={`${selectedIntegration.name} logo`}
                      className="h-7 w-7 object-contain"
                    />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <DialogTitle className="text-xl">
                        {selectedIntegration.name}
                      </DialogTitle>
                      <Badge variant="blue" size="sm">
                        {getAuthTypeLabel(selectedIntegration.authType)}
                      </Badge>
                      <Badge
                        variant={selectedIntegration.connected ? "green" : "neutral"}
                        size="sm"
                      >
                        {selectedIntegration.connected ? "Connected" : "Not connected"}
                      </Badge>
                    </div>
                    <DialogDescription className="mt-2 text-pretty leading-6">
                      {selectedIntegration.description}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-6 p-6">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-xl bg-muted/50 p-3">
                    <p className="text-lg font-semibold">{selectedIntegration.triggers.length}</p>
                    <p className="text-xs text-muted-foreground">Triggers</p>
                  </div>
                  <div className="rounded-xl bg-muted/50 p-3">
                    <p className="text-lg font-semibold">{selectedIntegration.actions.length}</p>
                    <p className="text-xs text-muted-foreground">Actions</p>
                  </div>
                  <div className="rounded-xl bg-muted/50 p-3">
                    <p className="text-lg font-semibold">{selectedIntegration.scopes.length}</p>
                    <p className="text-xs text-muted-foreground">Permissions</p>
                  </div>
                </div>

                <section>
                  <h3 className="text-sm font-semibold text-foreground">
                    About this integration
                  </h3>
                  <p className="mt-3 text-pretty text-sm leading-7 text-muted-foreground">
                    {selectedIntegration.description} Connect {selectedIntegration.name} to
                    bring its data and capabilities into your Atmet workflows. Once connected,
                    teams can automate recurring work, respond to important activity, and keep
                    information synchronized without switching between tools.
                  </p>
                  <p className="mt-3 text-pretty text-sm leading-7 text-muted-foreground">
                    This integration uses {getAuthTypeLabel(selectedIntegration.authType)} and
                    requests only the permissions needed for the workflows you choose to run.
                  </p>
                </section>

                <Button
                  render={<Link href={`/apps/${selectedIntegration.slug}`} />}
                  className="w-full"
                >
                  {selectedIntegration.connected
                    ? `Manage ${selectedIntegration.name}`
                    : `Connect ${selectedIntegration.name}`}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
