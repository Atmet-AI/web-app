"use client"

import * as React from "react"
import Link from "next/link"
import { PlugZap } from "lucide-react"

import { Badge } from "@/registry/spell-ui/badge"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import type { Integration } from "@/lib/integrations-store"

function getAuthTypeLabel(authType: Integration["authType"]) {
  return authType === "oauth" ? "OAuth 2.0" : "API Key"
}

function getStatusBadge(status: Integration["status"]) {
  if (status === "expired") {
    return { label: "Token expired", variant: "amber" as const }
  }

  if (status === "error") {
    return { label: "Error", variant: "red" as const }
  }

  return { label: "Active", variant: "green" as const }
}

function formatConnectedDate(dateIso: string | undefined) {
  if (!dateIso) {
    return "Connected recently"
  }

  const parsed = new Date(dateIso)
  if (Number.isNaN(parsed.getTime())) {
    return "Connected recently"
  }

  const formatted = parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })

  return `Connected ${formatted}`
}

export default function SettingsIntegrationsPage() {
  const [integrations, setIntegrations] = React.useState<Integration[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const [selectedForDisconnect, setSelectedForDisconnect] = React.useState<Integration | null>(null)
  const [isDisconnecting, setIsDisconnecting] = React.useState(false)

  const connectedIntegrations = React.useMemo(
    () => integrations.filter((integration) => integration.connected),
    [integrations]
  )

  const loadIntegrations = React.useCallback(async () => {
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const response = await fetch("/api/integrations", { cache: "no-store" })

      if (!response.ok) {
        throw new Error("Failed to load integrations.")
      }

      const data = (await response.json()) as Integration[]
      setIntegrations(data)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load integrations."
      setErrorMessage(message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void loadIntegrations()
  }, [loadIntegrations])

  const handleConfirmDisconnect = React.useCallback(async () => {
    if (!selectedForDisconnect) return

    setIsDisconnecting(true)

    try {
      const response = await fetch(`/api/integrations/${selectedForDisconnect.slug}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to disconnect integration.")
      }

      setSelectedForDisconnect(null)
      await loadIntegrations()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to disconnect integration."
      setErrorMessage(message)
    } finally {
      setIsDisconnecting(false)
    }
  }, [loadIntegrations, selectedForDisconnect])

  return (
    <div className="flex min-h-[calc(100vh-2.5rem)] flex-1 flex-col bg-background">
      <section className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div className="space-y-5">
          <header className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">My Integrations</h1>
            <p className="text-sm text-muted-foreground">
              Manage connected apps and review their connection status.
            </p>
          </header>

          {errorMessage ? (
            <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {errorMessage}
            </div>
          ) : null}

          {isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="rounded-xl bg-sidebar p-3.5">
                  <div className="flex items-start gap-3">
                    <Skeleton className="h-8 w-8 rounded-md" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-28" />
                    </div>
                  </div>
                  <Skeleton className="mt-4 h-8 w-full" />
                </div>
              ))}
            </div>
          ) : connectedIntegrations.length === 0 ? (
            <Empty className="rounded-2xl border border-dashed border-border bg-card py-12">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <PlugZap className="h-4 w-4" />
                </EmptyMedia>
                <EmptyTitle>No integrations connected yet</EmptyTitle>
                <EmptyDescription>Connect your first app to start automating</EmptyDescription>
              </EmptyHeader>
              <Button render={<Link href="/apps" />} className="h-8 rounded-md">
                Browse integrations
              </Button>
            </Empty>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {connectedIntegrations.map((integration) => {
                const statusBadge = getStatusBadge(integration.status)

                return (
                  <article
                    key={integration.slug}
                    className="flex min-h-[210px] flex-col rounded-xl bg-sidebar p-3.5"
                  >
                    <div className="flex items-start gap-3">
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

                      <div className="min-w-0">
                        <h2 className="truncate text-sm font-semibold tracking-tight text-foreground">
                          {integration.name}
                        </h2>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {formatConnectedDate(integration.connectedAt)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <Badge variant="blue" size="sm">
                        {getAuthTypeLabel(integration.authType)}
                      </Badge>
                      <Badge variant={statusBadge.variant} size="sm">
                        {statusBadge.label}
                      </Badge>
                    </div>

                    <div className="mt-auto flex items-center gap-2 pt-4">
                      <Button
                        render={<Link href={`/apps/${integration.slug}`} />}
                        variant="outline"
                        size="sm"
                        className="h-8 flex-1"
                      >
                        Manage
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 flex-1"
                        onClick={() => setSelectedForDisconnect(integration)}
                      >
                        Disconnect
                      </Button>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      </section>

      <Dialog
        open={selectedForDisconnect !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedForDisconnect(null)
          }
        }}
      >
        <DialogContent className="overflow-hidden rounded-xl! p-0" showCloseButton={!isDisconnecting}>
          <DialogHeader className="border-b border-border px-5 py-4">
            <DialogTitle>Disconnect integration</DialogTitle>
            <DialogDescription>
              {selectedForDisconnect
                ? `Are you sure you want to disconnect ${selectedForDisconnect.name}?`
                : "Are you sure you want to disconnect this integration?"}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 border-t bg-background px-5 py-4 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSelectedForDisconnect(null)}
              disabled={isDisconnecting}
            >
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={handleConfirmDisconnect} disabled={isDisconnecting}>
              {isDisconnecting ? "Disconnecting..." : "Disconnect"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
