"use client"

import { AlertTriangle } from "lucide-react"

import { Badge } from "@/registry/spell-ui/badge"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { Integration } from "@/lib/integrations-store"

type ConnectOAuthModalProps = {
  integration: Integration
  open: boolean
  onOpenChange: (open: boolean) => void
  onContinue: () => void
  isSubmitting: boolean
  errorMessage: string | null
}

export function ConnectOAuthModal({
  integration,
  open,
  onOpenChange,
  onContinue,
  isSubmitting,
  errorMessage,
}: ConnectOAuthModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[calc(100%-1rem)] overflow-hidden rounded-xl! p-0 sm:max-w-xl"
        showCloseButton={!isSubmitting}
      >
        <DialogHeader className="border-b border-border px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg border border-border bg-background">
              <img
                src={integration.logo}
                alt={`${integration.name} logo`}
                className="h-6 w-6 object-contain"
                onError={(event) => {
                  event.currentTarget.style.display = "none"
                }}
              />
            </span>
            <div>
              <DialogTitle>Connect {integration.name} to Atmet</DialogTitle>
              <DialogDescription>
                Review permissions before continuing to {integration.name}.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 px-5 py-4">
          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Permissions requested</h3>
            <ul className="space-y-2">
              {integration.scopes.map((scope) => (
                <li key={scope.name} className="rounded-lg border border-border bg-background px-3 py-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="neutral" size="sm">
                      {scope.name}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{scope.description}</p>
                </li>
              ))}
            </ul>
          </section>

          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
            <div className="inline-flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5" />
              <p>
                You will be redirected to {integration.name} to authorize access. Atmet never stores
                your password.
              </p>
            </div>
          </div>

          {errorMessage ? (
            <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {errorMessage}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-border bg-background px-5 py-4 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="button" onClick={onContinue} disabled={isSubmitting}>
            Continue to {integration.name}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
