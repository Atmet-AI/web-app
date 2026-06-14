"use client"

import { Badge } from "@/registry/spell-ui/badge"

import { Button } from "@/components/ui/button"
import type { Integration } from "@/lib/integrations-store"

type AppHeaderProps = {
  integration: Integration
  onConnect: () => void
  onDisconnect: () => void
  onReconnect: () => void
  isSubmitting: boolean
}

function getAuthTypeLabel(authType: Integration["authType"]) {
  return authType === "oauth" ? "OAuth 2.0" : "API Key"
}

export function AppHeader({
  integration,
  onConnect,
  onDisconnect,
  onReconnect,
  isSubmitting,
}: AppHeaderProps) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-background text-xs font-semibold text-muted-foreground">
            <img
              src={integration.logo}
              alt={`${integration.name} logo`}
              className="h-7 w-7 rounded-sm object-contain"
              onError={(event) => {
                event.currentTarget.style.display = "none"
              }}
            />
            <span className="sr-only">{integration.name}</span>
          </span>

          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">{integration.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{integration.description}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant="blue">{getAuthTypeLabel(integration.authType)}</Badge>
              <Badge variant={integration.connected ? "green" : "neutral"}>
                {integration.connected ? "Connected" : "Not Connected"}
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {integration.connected ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={onDisconnect}
                disabled={isSubmitting}
                className="h-8 rounded-md"
              >
                Disconnect
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={onReconnect}
                disabled={isSubmitting}
                className="h-8 rounded-md"
              >
                Reconnect
              </Button>
            </>
          ) : (
            <Button
              type="button"
              onClick={onConnect}
              disabled={isSubmitting}
              className="h-8 rounded-md"
            >
              Connect {integration.name}
            </Button>
          )}
        </div>
      </div>
    </section>
  )
}
