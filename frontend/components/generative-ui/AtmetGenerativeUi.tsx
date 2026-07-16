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
import { Check, Code2, FileText, X } from "lucide-react"

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
  compact?: boolean
  composerTail?: boolean
  onFieldChange?: (fieldId: string, value: string) => void
  onAction?: (action: AtmetUiAction, values?: Record<string, string>) => void
}

function parseEmailTags(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[\s,;]+/)
        .map((item) => item.trim())
        .filter(Boolean)
    )
  )
}

function EmailTagInput({
  value,
  placeholder,
  compact = false,
  onChange,
}: {
  value: string
  placeholder?: string
  compact?: boolean
  onChange: (value: string) => void
}) {
  const tags = parseEmailTags(value)
  const [draft, setDraft] = useState("")

  function commitDraft(nextDraft = draft) {
    const nextTags = parseEmailTags(nextDraft)
    if (nextTags.length === 0) return

    onChange(
      [...tags, ...nextTags]
        .filter((tag, index, all) => all.indexOf(tag) === index)
        .join(", ")
    )
    setDraft("")
  }

  function removeTag(target: string) {
    onChange(tags.filter((tag) => tag !== target).join(", "))
  }

  return (
    <div
      className={cn(
        "mt-1.5 flex w-full flex-wrap items-center gap-1.5 rounded-lg border border-black/10 bg-background px-2 py-1 shadow-none focus-within:ring-1 focus-within:ring-ring dark:border-white/10",
        compact ? "min-h-8" : "min-h-9"
      )}
    >
      {tags.map((tag) => (
        <span
          key={tag}
          className={cn(
            "inline-flex max-w-full items-center gap-1 rounded-md bg-sky-500/10 px-2 font-medium text-sky-700 dark:bg-sky-400/15 dark:text-sky-200",
            compact ? "h-5 text-[11px]" : "h-6 text-xs"
          )}
        >
          <span className="max-w-48 truncate">{tag}</span>
          <button
            type="button"
            aria-label={`Remove ${tag}`}
            onClick={() => removeTag(tag)}
            className="-mr-1 inline-flex h-5 w-5 items-center justify-center rounded-sm text-sky-700/70 transition-colors hover:bg-sky-500/15 hover:text-sky-900 dark:text-sky-100/70 dark:hover:text-white"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        value={draft}
        type="email"
        inputMode="email"
        placeholder={tags.length === 0 ? placeholder : "Add another email"}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => commitDraft()}
        onKeyDown={(event) => {
          if (
            event.key === "Enter" ||
            event.key === "," ||
            event.key === "Tab"
          ) {
            if (draft.trim()) {
              event.preventDefault()
              commitDraft()
            }
          }

          if (event.key === "Backspace" && !draft && tags.length > 0) {
            removeTag(tags[tags.length - 1])
          }
        }}
        className={cn(
          "flex-1 bg-transparent text-foreground outline-none placeholder:text-muted-foreground",
          compact ? "h-5 min-w-36 text-xs" : "h-6 min-w-44 text-sm"
        )}
      />
    </div>
  )
}

export function AtmetGenerativeUi({
  payload,
  logo,
  values,
  disabled = false,
  compact = false,
  composerTail = false,
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
        compact={compact}
        composerTail={composerTail}
        onFieldChange={onFieldChange}
        onAction={onAction}
      />
    )
  }

  if (component.kind === "table") {
    return (
      <AtmetUiTable
        payload={ui as PayloadWith<"table">}
        logo={logo}
        compact={compact}
      />
    )
  }
  if (component.kind === "chart") {
    return (
      <AtmetUiChart
        payload={ui as PayloadWith<"chart">}
        logo={logo}
        compact={compact}
      />
    )
  }
  if (component.kind === "code") {
    return (
      <AtmetUiCode
        payload={ui as PayloadWith<"code">}
        logo={logo}
        compact={compact}
      />
    )
  }
  if (component.kind === "file_list") {
    return (
      <AtmetUiFileList
        payload={ui as PayloadWith<"file_list">}
        logo={logo}
        compact={compact}
      />
    )
  }

  return null
}

function AtmetUiShell({
  title,
  description,
  logo,
  children,
  footer,
  compact = false,
  composerTail = false,
}: {
  title?: string
  description?: string
  logo?: ReactNode
  children: ReactNode
  footer?: ReactNode
  compact?: boolean
  composerTail?: boolean
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-t-2xl rounded-b-none border-x border-t border-b-0 border-black/10 bg-transparent shadow-none backdrop-blur-2xl dark:border-white/10",
        compact
          ? "supports-[backdrop-filter]:bg-transparent"
          : "supports-[backdrop-filter]:bg-transparent"
      )}
    >
      {(title || description || logo) && (
        <div
          className={cn(
            "flex items-start",
            compact ? "gap-2.5 px-3 py-3" : "gap-3 px-4 py-4"
          )}
        >
          {logo ? (
            <div
              className={cn(
                "mt-0.5 flex shrink-0 items-center justify-center rounded-lg",
                compact ? "h-6 w-6" : "h-8 w-8"
              )}
            >
              {logo}
            </div>
          ) : null}
          <div className="min-w-0 flex-1">
            {title ? (
              <h3
                className={cn(
                  "truncate font-medium text-foreground",
                  compact ? "text-sm leading-5" : "text-base leading-6"
                )}
              >
                {title}
              </h3>
            ) : null}
            {description ? (
              <p
                className={cn(
                  "text-muted-foreground",
                  compact
                    ? "mt-0.5 text-xs leading-5"
                    : "mt-1 text-sm leading-6"
                )}
              >
                {description}
              </p>
            ) : null}
          </div>
        </div>
      )}
      <div className={compact ? "px-3 pb-3" : "px-4 pb-4"}>{children}</div>
      {footer ? (
        <div
          className={cn(
            "flex justify-end pt-0",
            compact ? "px-3 pb-3" : "px-4 pb-4"
          )}
        >
          {footer}
        </div>
      ) : null}
      {composerTail ? <div className="h-[18px]" aria-hidden="true" /> : null}
    </section>
  )
}

function AtmetUiForm({
  payload,
  logo,
  values,
  disabled,
  compact,
  composerTail,
  onFieldChange,
  onAction,
}: {
  payload: PayloadWith<"form">
  logo?: ReactNode
  values?: Record<string, string>
  disabled?: boolean
  compact?: boolean
  composerTail?: boolean
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
      compact={compact}
      composerTail={composerTail}
      footer={
        <Button
          type="button"
          className={cn(
            "h-7 gap-1.5 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] transition-transform active:scale-[0.96]"
          )}
          disabled={disabled || !isComplete}
          onClick={() => onAction?.(component.submit.action, currentValues)}
        >
          <Check className="h-3.5 w-3.5" />
          {component.submit.label}
        </Button>
      }
    >
      <div className={compact ? "space-y-2" : "space-y-3"}>
        {component.fields.map((field) => {
          const fieldValue = currentValues[field.id] ?? ""
          const hasValue = fieldValue.trim().length > 0
          const controlClassName =
            "mt-1.5 border-black/10 bg-background shadow-none placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0 dark:border-white/10"
          const valueToneClassName = hasValue
            ? "text-foreground"
            : "text-muted-foreground"
          const inputType =
            field.type === "email"
              ? "email"
              : field.type === "date"
                ? "date"
                : field.type === "time"
                  ? "time"
                  : field.type === "number"
                    ? "number"
                    : "text"

          return (
            <label
              key={field.id}
              className={cn(
                "block font-medium text-muted-foreground",
                compact ? "text-[11px]" : "text-xs"
              )}
            >
              {field.label}
              {field.id === "invitees" && field.type === "email" ? (
                <EmailTagInput
                  value={fieldValue}
                  placeholder={field.placeholder}
                  compact={compact}
                  onChange={(nextValue) => updateField(field.id, nextValue)}
                />
              ) : field.type === "textarea" ? (
                <Textarea
                  value={fieldValue}
                  placeholder={field.placeholder}
                  onChange={(event) =>
                    updateField(field.id, event.target.value)
                  }
                  className={cn(
                    controlClassName,
                    valueToneClassName,
                    compact
                      ? "min-h-16 resize-none rounded-lg text-xs"
                      : "min-h-24 resize-none rounded-lg text-sm"
                  )}
                />
              ) : field.type === "select" ? (
                <select
                  value={fieldValue}
                  onChange={(event) =>
                    updateField(field.id, event.target.value)
                  }
                  className={cn(
                    controlClassName,
                    valueToneClassName,
                    compact
                      ? "h-8 w-full rounded-lg px-2.5 text-xs outline-none"
                      : "h-9 w-full rounded-lg px-3 text-sm outline-none"
                  )}
                >
                  {field.placeholder ? (
                    <option value="" disabled>
                      {field.placeholder}
                    </option>
                  ) : null}
                  {(field.options ?? []).map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  value={fieldValue}
                  type={inputType}
                  inputMode={field.type === "number" ? "numeric" : undefined}
                  placeholder={field.placeholder}
                  onChange={(event) =>
                    updateField(field.id, event.target.value)
                  }
                  className={cn(
                    controlClassName,
                    valueToneClassName,
                    compact
                      ? "h-8 rounded-lg text-xs"
                      : "h-9 rounded-lg text-sm"
                  )}
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
  compact,
}: {
  payload: PayloadWith<"table">
  logo?: ReactNode
  compact?: boolean
}) {
  const component = payload.component

  return (
    <AtmetUiShell
      title={component.title}
      description={component.description}
      logo={logo}
      compact={compact}
    >
      <div
        className={cn(
          "rounded-xl bg-muted p-1 shadow-[0_1px_0_rgba(0,0,0,0.04)] ring-1 ring-border/70",
          compact ? "max-h-[260px]" : "max-h-[360px]"
        )}
      >
        <div className="overflow-auto rounded-lg">
          <table
            className={cn(
              "w-full min-w-[560px] border-separate border-spacing-0",
              compact ? "text-xs" : "text-sm"
            )}
          >
            <thead className="sticky top-0 bg-transparent text-muted-foreground backdrop-blur-xl">
              <tr>
                {component.columns.map((column) => (
                  <th
                    key={column.key}
                    className="px-3 py-2 text-left font-medium"
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {component.rows.map((row, index) => (
                <tr
                  key={index}
                  className="border-b border-border/70 bg-background last:border-b-0 hover:bg-muted/45"
                >
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
      </div>
    </AtmetUiShell>
  )
}

function AtmetUiChart({
  payload,
  logo,
  compact,
}: {
  payload: PayloadWith<"chart">
  logo?: ReactNode
  compact?: boolean
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
      compact={compact}
    >
      <ChartContainer
        config={config}
        className={cn("w-full", compact ? "h-[180px]" : "h-[240px]")}
      >
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
              <Bar
                key={key}
                dataKey={key}
                fill={`var(--color-${key})`}
                radius={4}
              />
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
  compact,
}: {
  payload: PayloadWith<"code">
  logo?: ReactNode
  compact?: boolean
}) {
  const component = payload.component

  return (
    <AtmetUiShell
      title={component.title ?? component.filename}
      description={component.language}
      logo={logo ?? <Code2 className="h-4 w-4" />}
      compact={compact}
    >
      <pre
        className={cn(
          "overflow-auto rounded-lg bg-transparent text-xs text-foreground backdrop-blur-xl",
          compact
            ? "max-h-[280px] p-2 leading-4"
            : "max-h-[420px] p-3 leading-5"
        )}
      >
        <code>{component.code}</code>
      </pre>
    </AtmetUiShell>
  )
}

function AtmetUiFileList({
  payload,
  logo,
  compact,
}: {
  payload: PayloadWith<"file_list">
  logo?: ReactNode
  compact?: boolean
}) {
  const component = payload.component

  return (
    <AtmetUiShell
      title={component.title}
      description={component.description}
      logo={logo}
      compact={compact}
    >
      <div
        className={cn(
          "overflow-auto rounded-lg bg-transparent backdrop-blur-xl",
          compact ? "max-h-[260px]" : "max-h-[360px]"
        )}
      >
        {component.files.map((file) => (
          <a
            key={file.id ?? file.url ?? file.name}
            href={file.url}
            target={file.url ? "_blank" : undefined}
            rel="noreferrer"
            className={cn(
              "flex items-center gap-3 shadow-[inset_0_1px_rgba(255,255,255,0.08)] transition-colors hover:bg-white/30 dark:hover:bg-white/[0.07]",
              compact
                ? "min-h-9 px-2.5 py-1.5 text-xs"
                : "min-h-11 px-3 py-2 text-sm"
            )}
          >
            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate text-foreground">
              {file.name}
            </span>
            {file.updatedAt ? (
              <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                {file.updatedAt}
              </span>
            ) : null}
          </a>
        ))}
      </div>
    </AtmetUiShell>
  )
}
