"use client"

import { Badge } from "@/registry/spell-ui/badge"

import { Button } from "@/components/ui/button"
import type { Integration } from "@/lib/integrations-store"

type AppHeaderProps = {
  integration: Integration
  onConnect: () => void
  onDisconnect: () => void
  isSubmitting: boolean
  isAvailable?: boolean
}

function getAuthTypeLabel(authType: Integration["authType"]) {
  return authType === "oauth" ? "OAuth 2.0" : "API Key"
}

export function AppHeader({
  integration,
  onConnect,
  onDisconnect,
  isSubmitting,
  isAvailable = true,
}: AppHeaderProps) {
  return (
    <section className="rounded-2xl bg-sidebar/70 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-background/80 text-xs font-semibold text-muted-foreground shadow-[0_1px_0_rgba(0,0,0,0.04)]">
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
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {integration.name}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {integration.description}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant="neutral">
                {getAuthTypeLabel(integration.authType)}
              </Badge>
              {!isAvailable ? (
                <Badge variant="amber">Soon</Badge>
              ) : (
                <Badge
                  variant={
                    integration.status === "active" ? "green" : "neutral"
                  }
                >
                  {integration.connected &&
                  integration.connection_count &&
                  integration.connection_count > 1
                    ? `${integration.connection_count} Connected`
                    : integration.connected
                      ? integration.status === "pending"
                        ? "Pending"
                        : "Connected"
                      : "Not connected"}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!isAvailable ? (
            <Button type="button" disabled className="h-10 rounded-lg">
              Soon
            </Button>
          ) : integration.connected ? (
            <Button
              type="button"
              variant="destructive"
              onClick={onDisconnect}
              disabled={isSubmitting}
              className="h-10 rounded-lg"
            >
              Disconnect
            </Button>
          ) : (
            <Button
              type="button"
              onClick={onConnect}
              disabled={isSubmitting}
              className="h-10 rounded-lg"
            >
              Connect {integration.name}
            </Button>
          )}
        </div>
      </div>
    </section>
  )
}
