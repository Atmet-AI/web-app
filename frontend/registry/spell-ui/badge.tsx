"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-md border-0 font-medium transition-colors",
  {
    variants: {
      variant: {
        red: "ui-badge ui-badge-red",
        blue: "ui-badge ui-badge-blue",
        green: "ui-badge ui-badge-green",
        yellow: "ui-badge ui-badge-amber",
        purple: "ui-badge ui-badge-violet",
        pink: "bg-pink-500/14 text-pink-700 dark:text-pink-300",
        orange: "bg-orange-500/14 text-orange-700 dark:text-orange-300",
        cyan: "bg-cyan-500/14 text-cyan-700 dark:text-cyan-300",
        indigo: "bg-indigo-500/14 text-indigo-700 dark:text-indigo-300",
        violet: "ui-badge ui-badge-violet",
        rose: "bg-rose-500/14 text-rose-700 dark:text-rose-300",
        amber: "ui-badge ui-badge-amber",
        lime: "bg-lime-500/14 text-lime-700 dark:text-lime-300",
        emerald: "bg-emerald-500/14 text-emerald-700 dark:text-emerald-300",
        sky: "bg-sky-500/14 text-sky-700 dark:text-sky-300",
        fuchsia: "bg-fuchsia-500/14 text-fuchsia-700 dark:text-fuchsia-300",
        neutral: "ui-badge ui-badge-neutral",
      },
      size: {
        xs: "h-3.5 px-1.5 text-[10px] leading-none",
        sm: "h-4 px-1.5 text-[10px] leading-none",
        default: "h-4.5 px-1.5 text-[11px] leading-none",
        lg: "h-5 px-2 text-xs leading-none",
      },
    },
    defaultVariants: {
      variant: "neutral",
      size: "default",
    },
  }
)

type BadgeVariant = VariantProps<typeof badgeVariants>["variant"]
type BadgeSize = VariantProps<typeof badgeVariants>["size"]

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, size, ...props }, ref) => (
    <span
      ref={ref}
      data-slot="badge"
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    />
  )
)
Badge.displayName = "Badge"

export { Badge, badgeVariants, type BadgeVariant, type BadgeSize }
