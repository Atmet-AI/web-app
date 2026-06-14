"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import { cn } from "@/lib/utils"

type UsagePoint = {
  label: string
  value: number
}

export function BarInteractive({
  data,
  className,
}: {
  data: UsagePoint[]
  className?: string
}) {
  const maxValue = React.useMemo(
    () => Math.max(...data.map((point) => point.value), 1),
    [data]
  )

  return (
    <div className={cn("h-40 w-full rounded-lg border border-border/70 bg-muted/20 p-2.5", className)}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
          <defs>
            <linearGradient id="usageBarGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.45} />
              <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.15} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.7} />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tickMargin={8}
            className="text-[10px] text-muted-foreground"
          />
          <YAxis hide domain={[0, maxValue * 1.15]} />
          <Tooltip
            cursor={{ fill: "var(--muted)", fillOpacity: 0.35 }}
            contentStyle={{
              borderRadius: "10px",
              border: "1px solid var(--border)",
              background: "var(--background)",
              boxShadow: "0 6px 20px rgba(0,0,0,0.08)",
              fontSize: "12px",
            }}
            formatter={(value) => [
              `${(typeof value === "number" ? value : Number(value ?? 0)).toLocaleString()} credits`,
              "Usage",
            ]}
          />
          <Bar
            dataKey="value"
            radius={[6, 6, 3, 3]}
            fill="url(#usageBarGradient)"
            stroke="var(--primary)"
            strokeWidth={1}
            maxBarSize={26}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
