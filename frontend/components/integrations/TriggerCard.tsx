"use client"

import { Bolt } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { IntegrationTrigger } from "@/lib/integrations-store"

type TriggerCardProps = {
  trigger: IntegrationTrigger
  onUseInWorkflow: () => void
}

export function TriggerCard({ trigger, onUseInWorkflow }: TriggerCardProps) {
  return (
    <article className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{trigger.name}</h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{trigger.description}</p>
        </div>
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-sidebar-accent text-muted-foreground">
          <Bolt className="h-4 w-4" />
        </span>
      </div>

      <div className="mt-3">
        <Button type="button" variant="outline" size="sm" onClick={onUseInWorkflow} className="h-7">
          Use in workflow
        </Button>
      </div>
    </article>
  )
}
