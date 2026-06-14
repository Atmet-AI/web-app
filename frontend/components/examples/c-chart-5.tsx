"use client"

import { CSSProperties } from "react"
import { Badge } from "@/registry/spell-ui/badge"
import { Bar, BarChart, XAxis } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

type UsageChartPoint = {
  label: string
  baseline: number
  usage: number
}

const defaultChartData: UsageChartPoint[] = [
  { label: "Jan", baseline: 340, usage: 180 },
  { label: "Feb", baseline: 870, usage: 420 },
  { label: "Mar", baseline: 510, usage: 280 },
  { label: "Apr", baseline: 620, usage: 350 },
  { label: "May", baseline: 450, usage: 240 },
  { label: "Jun", baseline: 780, usage: 390 },
]

const chartConfig = {
  baseline: {
    label: "Baseline",
    color: "var(--chart-1)",
  },
  usage: {
    label: "Usage",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig

type ChartBarPatternProps = {
  title?: string
  description?: string
  badgeLabel?: string
  data?: UsageChartPoint[]
}

export function ChartBarPattern({
  title = "Usage trend",
  description = "Workspace consumption over time",
  badgeLabel = "Usage",
  data = defaultChartData,
}: ChartBarPatternProps) {
  return (
    <Card className="w-full max-w-none">
      <CardHeader>
        <CardTitle>
          {title}
          <Badge variant="blue" className="ms-2">
            {badgeLabel}
          </Badge>
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <BarChart
            accessibilityLayer
            data={data}
            margin={{
              top: 20,
              right: 12,
              bottom: 12,
              left: 12,
            }}
          >
            <defs>
              <pattern
                id="chart3-diagonal-stripe-pattern"
                patternUnits="userSpaceOnUse"
                width="8"
                height="8"
              >
                <rect
                  width="8"
                  height="8"
                  fill="var(--color-baseline)"
                  opacity="0.1"
                />
                <path
                  d="M0,8 L8,0 M4,12 L12,4 M-4,4 L4,-4"
                  stroke="var(--color-baseline)"
                  strokeWidth="1.5"
                  opacity="0.6"
                />
                <path
                  d="M2,10 L10,2 M6,14 L14,6 M-2,6 L6,-2"
                  stroke="var(--color-baseline)"
                  strokeWidth="1"
                  opacity="0.3"
                />
              </pattern>
              <linearGradient id="bar-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="var(--chart-1)"
                  stopOpacity="0.9"
                />
                <stop
                  offset="100%"
                  stopColor="var(--chart-1)"
                  stopOpacity="0.6"
                />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  indicator="dot"
                  className="min-w-40 gap-2.5"
                  labelFormatter={(value) => {
                    return (
                      <div className="border-border/50 mb-0.5 flex flex-col gap-0.5 border-b pb-2">
                        <span className="text-xs font-medium">{value}</span>
                      </div>
                    )
                  }}
                  formatter={(value, name) => (
                    <div className="flex w-full items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <div
                          className="h-2.5 w-2.5 shrink-0 rounded-xs bg-(--color-bg)"
                          style={
                            {
                              "--color-bg": `var(--color-${name})`,
                            } as CSSProperties
                          }
                        />
                        <span className="text-muted-foreground">
                          {chartConfig[name as keyof typeof chartConfig]
                            ?.label || name}
                        </span>
                      </div>
                      <span className="text-foreground font-semibold">
                        {typeof value === "number"
                          ? value.toLocaleString()
                          : String(value ?? "")}
                      </span>
                    </div>
                  )}
                />
              }
            />
            <Bar
              dataKey="baseline"
              fill="url(#chart3-diagonal-stripe-pattern)"
              stroke="var(--color-baseline)"
              strokeWidth={1}
              radius={[4, 4, 4, 4]}
            />
            <Bar
              dataKey="usage"
              fill="var(--color-usage)"
              stroke="var(--color-usage)"
              strokeWidth={1}
              radius={[4, 4, 4, 4]}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
