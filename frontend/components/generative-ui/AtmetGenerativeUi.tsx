"use client"

import { useMemo, useState, type ReactNode } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts"
import { Check, Code2, FileText } from "lucide-react"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import {
  atmetUiPayloadSchema,
  type AtmetUiAction,
  type AtmetUiPayload,
} from "@/lib/generative-ui/schema"

type PayloadWith<K extends AtmetUiPayload["component"]["kind"]> =
  AtmetUiPayload & {
    component: Extract<AtmetUiPayload["component"], { kind: K }>
  }

type AtmetGenerativeUiProps = {
  payload: unknown
  logo?: ReactNode
  values?: Record<string, string>
  disabled?: boolean
  onFieldChange?: (fieldId: string, value: string) => void
  onAction?: (action: AtmetUiAction, values?: Record<string, string>) => void
}

export function AtmetGenerativeUi({
  payload,
  logo,
  values,
  disabled = false,
  onFieldChange,
  onAction,
}: AtmetGenerativeUiProps) {
  const parsed = atmetUiPayloadSchema.safeParse(payload)
  if (!parsed.success) return null

  const ui = parsed.data
  const component = ui.component

  if (component.kind === "form") {
    return (
      <AtmetUiForm
        payload={ui as PayloadWith<"form">}
        logo={logo}
        values={values}
        disabled={disabled}
        onFieldChange={onFieldChange}
        onAction={onAction}
      />
    )
  }

  if (component.kind === "table") {
    return <AtmetUiTable payload={ui as PayloadWith<"table">} logo={logo} />
  }
  if (component.kind === "chart") {
    return <AtmetUiChart payload={ui as PayloadWith<"chart">} logo={logo} />
  }
  if (component.kind === "code") {
    return <AtmetUiCode payload={ui as PayloadWith<"code">} logo={logo} />
  }
  if (component.kind === "file_list") {
    return <AtmetUiFileList payload={ui as PayloadWith<"file_list">} logo={logo} />
  }

  return null
}

function AtmetUiShell({
  title,
  description,
  logo,
  children,
  footer,
}: {
  title?: string
  description?: string
  logo?: ReactNode
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <section className="overflow-hidden rounded-xl bg-background/95 shadow-[0_0_0_1px_hsl(var(--border)/0.7),0_18px_60px_hsl(var(--foreground)/0.08)]">
      {(title || description || logo) && (
        <div className="flex items-start gap-3 px-4 py-4">
          {logo ? (
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
              {logo}
            </div>
          ) : null}
          <div className="min-w-0 flex-1">
            {title ? (
              <h3 className="truncate text-base font-medium leading-6 text-foreground">
                {title}
              </h3>
            ) : null}
            {description ? (
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
        </div>
      )}
      <div className="px-4 pb-4">{children}</div>
      {footer ? (
        <div className="flex justify-end px-4 pb-4 pt-0">{footer}</div>
      ) : null}
    </section>
  )
}

function AtmetUiForm({
  payload,
  logo,
  values,
  disabled,
  onFieldChange,
  onAction,
}: {
  payload: PayloadWith<"form">
  logo?: ReactNode
  values?: Record<string, string>
  disabled?: boolean
  onFieldChange?: (fieldId: string, value: string) => void
  onAction?: (action: AtmetUiAction, values?: Record<string, string>) => void
}) {
  const component = payload.component
  const [localValues, setLocalValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      component.fields.map((field) => [field.id, field.value ?? ""])
    )
  )
  const currentValues = values ?? localValues
  const isComplete = component.fields.every(
    (field) => !field.required || currentValues[field.id]?.trim()
  )

  function updateField(fieldId: string, value: string) {
    if (onFieldChange) {
      onFieldChange(fieldId, value)
      return
    }

    setLocalValues((previous) => ({ ...previous, [fieldId]: value }))
  }

  return (
    <AtmetUiShell
      title={component.title}
      description={component.description}
      logo={logo}
      footer={
        <Button
          type="button"
          className="h-9 gap-1.5 px-3 text-sm active:scale-[0.96] transition-transform"
          disabled={disabled || !isComplete}
          onClick={() => onAction?.(component.submit.action, currentValues)}
        >
          <Check className="h-3.5 w-3.5" />
          {component.submit.label}
        </Button>
      }
    >
      <div className="space-y-3">
        {component.fields.map((field) => {
          const fieldValue = currentValues[field.id] ?? ""
          const controlClassName =
            "mt-1.5 border-border/70 bg-background text-sm shadow-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0"

          return (
            <label
              key={field.id}
              className="block text-xs font-medium text-muted-foreground"
            >
              {field.label}
              {field.type === "textarea" ? (
                <Textarea
                  value={fieldValue}
                  placeholder={field.placeholder}
                  onChange={(event) => updateField(field.id, event.target.value)}
                  className={cn(controlClassName, "min-h-24 resize-none rounded-lg")}
                />
              ) : field.type === "select" ? (
                <select
                  value={fieldValue}
                  onChange={(event) => updateField(field.id, event.target.value)}
                  className={cn(
                    controlClassName,
                    "h-9 w-full rounded-lg px-3 outline-none"
                  )}
                >
                  {(field.options ?? []).map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  value={fieldValue}
                  type={field.type === "email" ? "email" : "text"}
                  placeholder={field.placeholder}
                  onChange={(event) => updateField(field.id, event.target.value)}
                  className={cn(controlClassName, "h-9 rounded-lg")}
                />
              )}
            </label>
          )
        })}
      </div>
    </AtmetUiShell>
  )
}

function AtmetUiTable({
  payload,
  logo,
}: {
  payload: PayloadWith<"table">
  logo?: ReactNode
}) {
  const component = payload.component

  return (
    <AtmetUiShell
      title={component.title}
      description={component.description}
      logo={logo}
    >
      <div className="max-h-[360px] overflow-auto rounded-lg bg-muted/25">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="sticky top-0 bg-background/95 text-muted-foreground">
            <tr>
              {component.columns.map((column) => (
                <th key={column.key} className="px-3 py-2 text-left font-medium">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {component.rows.map((row, index) => (
              <tr key={index} className="shadow-[inset_0_1px_hsl(var(--border)/0.5)]">
                {component.columns.map((column) => (
                  <td
                    key={column.key}
                    className="max-w-[240px] truncate px-3 py-2 text-foreground"
                  >
                    {String(row[column.key] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AtmetUiShell>
  )
}

function AtmetUiChart({
  payload,
  logo,
}: {
  payload: PayloadWith<"chart">
  logo?: ReactNode
}) {
  const component = payload.component
  const config = useMemo<ChartConfig>(
    () =>
      Object.fromEntries(
        component.yKeys.map((key, index) => [
          key,
          {
            label: key,
            color: `hsl(var(--chart-${(index % 5) + 1}))`,
          },
        ])
      ),
    [component.yKeys]
  )

  return (
    <AtmetUiShell
      title={component.title}
      description={component.description}
      logo={logo}
    >
      <ChartContainer config={config} className="h-[240px] w-full">
        {component.chartType === "line" ? (
          <LineChart data={component.data}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey={component.xKey} tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} width={36} />
            <ChartTooltip content={<ChartTooltipContent />} />
            {component.yKeys.map((key) => (
              <Line
                key={key}
                dataKey={key}
                type="monotone"
                stroke={`var(--color-${key})`}
                strokeWidth={2}
                dot={false}
              />
            ))}
          </LineChart>
        ) : (
          <BarChart data={component.data}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey={component.xKey} tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} width={36} />
            <ChartTooltip content={<ChartTooltipContent />} />
            {component.yKeys.map((key) => (
              <Bar key={key} dataKey={key} fill={`var(--color-${key})`} radius={4} />
            ))}
          </BarChart>
        )}
      </ChartContainer>
    </AtmetUiShell>
  )
}

function AtmetUiCode({
  payload,
  logo,
}: {
  payload: PayloadWith<"code">
  logo?: ReactNode
}) {
  const component = payload.component

  return (
    <AtmetUiShell
      title={component.title ?? component.filename}
      description={component.language}
      logo={logo ?? <Code2 className="h-4 w-4" />}
    >
      <pre className="max-h-[420px] overflow-auto rounded-lg bg-muted p-3 text-xs leading-5 text-foreground">
        <code>{component.code}</code>
      </pre>
    </AtmetUiShell>
  )
}

function AtmetUiFileList({
  payload,
  logo,
}: {
  payload: PayloadWith<"file_list">
  logo?: ReactNode
}) {
  const component = payload.component

  return (
    <AtmetUiShell
      title={component.title}
      description={component.description}
      logo={logo}
    >
      <div className="max-h-[360px] overflow-auto rounded-lg bg-muted/25">
        {component.files.map((file) => (
          <a
            key={file.id ?? file.url ?? file.name}
            href={file.url}
            target={file.url ? "_blank" : undefined}
            rel="noreferrer"
            className="flex min-h-11 items-center gap-3 px-3 py-2 text-sm shadow-[inset_0_1px_hsl(var(--border)/0.5)] transition-colors hover:bg-muted/50"
          >
            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate text-foreground">
              {file.name}
            </span>
            {file.updatedAt ? (
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                {file.updatedAt}
              </span>
            ) : null}
          </a>
        ))}
      </div>
    </AtmetUiShell>
  )
}
