"use client"

import { ArrowRightCircle } from "lucide-react"

import { Badge } from "@/registry/spell-ui/badge"

import { Button } from "@/components/ui/button"
import type { IntegrationAction } from "@/lib/integrations-store"

type ActionCardProps = {
  action: IntegrationAction
  onUseInWorkflow: () => void
}

export function ActionCard({ action, onUseInWorkflow }: ActionCardProps) {
  return (
    <article className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{action.name}</h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{action.description}</p>
        </div>
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-sidebar-accent text-muted-foreground">
          <ArrowRightCircle className="h-4 w-4" />
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {action.inputFields.map((field) => (
          <Badge key={field} variant="neutral" size="sm">
            {field}
          </Badge>
        ))}
      </div>

      <div className="mt-3">
        <Button type="button" variant="outline" size="sm" onClick={onUseInWorkflow} className="h-7">
          Use in workflow
        </Button>
      </div>
    </article>
  )
}
