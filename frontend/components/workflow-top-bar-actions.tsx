"use client"

import * as React from "react"
import { usePathname } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  WORKFLOW_OPEN_LOG_EVENT,
  WORKFLOW_PUBLISH_EVENT,
  WORKFLOW_RUN_EVENT,
  WORKFLOW_SET_AUTORUN_EVENT,
  WORKFLOW_STATE_EVENT,
  type WorkflowControlEventDetail,
  type WorkflowRunSchedule,
  type WorkflowSetAutoRunEventDetail,
  type WorkflowStateEventDetail,
} from "@/lib/workflow-events"
import { getWorkflowProject } from "@/lib/workflow-projects"
import {
  Check,
  ChevronDown,
  ChevronRight,
  Clock3,
  FileClock,
  Loader2,
  Play,
  Rocket,
} from "lucide-react"

type WorkflowControlState = Omit<WorkflowStateEventDetail, "projectId">

const defaultWorkflowControlState: WorkflowControlState = {
  isRunning: false,
  isPublishing: false,
  publishState: "Draft",
  hasUnpublishedChanges: false,
  runSchedule: { mode: "off" },
}

function getAutoRunLabel(runSchedule: WorkflowRunSchedule) {
  if (runSchedule.mode === "off") return "Off"
  if (runSchedule.mode === "every") {
    const unitLabel =
      runSchedule.unit === "minutes"
        ? "minutes"
        : runSchedule.unit === "hours"
          ? "hours"
          : runSchedule.unit === "days"
            ? "days"
            : runSchedule.unit === "weeks"
              ? "weeks"
              : "months"
    return `Every ${runSchedule.value} ${unitLabel}`
  }
  const runAtDate = new Date(runSchedule.atISO)
  if (!Number.isFinite(runAtDate.getTime())) return "At (invalid date)"
  return `At ${runAtDate.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })}`
}

export function WorkflowTopBarActions() {
  const pathname = usePathname()
  const workflowProjectId = React.useMemo(() => {
    if (!pathname.startsWith("/workflow/")) return null
    const segments = pathname.split("/").filter(Boolean)
    return segments[1] ?? null
  }, [pathname])
  const activeWorkflowProject = React.useMemo(
    () =>
      workflowProjectId
        ? (getWorkflowProject(workflowProjectId) ?? null)
        : null,
    [workflowProjectId]
  )
  const [workflowControlStateByProject, setWorkflowControlStateByProject] =
    React.useState<Record<string, WorkflowControlState>>({})
  const activeWorkflowControlState = workflowProjectId
    ? (workflowControlStateByProject[workflowProjectId] ??
      defaultWorkflowControlState)
    : defaultWorkflowControlState
  const workflowPublishButtonLabel = activeWorkflowControlState.isPublishing
    ? "Publishing..."
    : activeWorkflowControlState.hasUnpublishedChanges ||
        activeWorkflowControlState.publishState === "Draft"
      ? "Publish"
      : "Published"
  const [everyIntervalValue, setEveryIntervalValue] = React.useState("1")
  const [atDateValue, setAtDateValue] = React.useState<Date>(new Date())
  const [atTimeValue, setAtTimeValue] = React.useState("09:00")

  React.useEffect(() => {
    const onWorkflowStateUpdated = (event: Event) => {
      const detail = (event as CustomEvent<WorkflowStateEventDetail>).detail
      if (!detail?.projectId) return
      setWorkflowControlStateByProject((previous) => ({
        ...previous,
        [detail.projectId]: {
          isRunning: detail.isRunning,
          isPublishing: detail.isPublishing,
          publishState: detail.publishState,
          hasUnpublishedChanges: detail.hasUnpublishedChanges,
          runSchedule: detail.runSchedule,
        },
      }))
    }

    window.addEventListener(
      WORKFLOW_STATE_EVENT,
      onWorkflowStateUpdated as EventListener
    )
    return () =>
      window.removeEventListener(
        WORKFLOW_STATE_EVENT,
        onWorkflowStateUpdated as EventListener
      )
  }, [])

  React.useEffect(() => {
    if (activeWorkflowControlState.runSchedule.mode !== "every") return
    setEveryIntervalValue(String(activeWorkflowControlState.runSchedule.value))
  }, [activeWorkflowControlState.runSchedule])

  React.useEffect(() => {
    if (activeWorkflowControlState.runSchedule.mode !== "at") return
    const parsedDate = new Date(activeWorkflowControlState.runSchedule.atISO)
    if (!Number.isFinite(parsedDate.getTime())) return
    setAtDateValue(parsedDate)
    setAtTimeValue(
      `${String(parsedDate.getHours()).padStart(2, "0")}:${String(
        parsedDate.getMinutes()
      ).padStart(2, "0")}`
    )
  }, [
    activeWorkflowControlState.runSchedule.mode === "at"
      ? activeWorkflowControlState.runSchedule.atISO
      : null,
  ])

  const parsedEveryIntervalValue = React.useMemo(() => {
    const parsed = Number.parseInt(everyIntervalValue, 10)
    if (!Number.isFinite(parsed)) return 1
    return Math.max(1, Math.min(9999, parsed))
  }, [everyIntervalValue])

  const atScheduleISO = React.useMemo(() => {
    const [hoursRaw, minutesRaw] = atTimeValue.split(":")
    const parsedHours = Number.parseInt(hoursRaw ?? "", 10)
    const parsedMinutes = Number.parseInt(minutesRaw ?? "", 10)
    const hours = Number.isFinite(parsedHours)
      ? Math.max(0, Math.min(23, parsedHours))
      : 0
    const minutes = Number.isFinite(parsedMinutes)
      ? Math.max(0, Math.min(59, parsedMinutes))
      : 0

    const nextRun = new Date(atDateValue)
    nextRun.setHours(hours, minutes, 0, 0)
    return nextRun.toISOString()
  }, [atDateValue, atTimeValue])

  const dispatchWorkflowControlEvent = React.useCallback(
    (eventName: string) => {
      if (!workflowProjectId) return
      const detail: WorkflowControlEventDetail = {
        projectId: workflowProjectId,
      }
      window.dispatchEvent(new CustomEvent(eventName, { detail }))
    },
    [workflowProjectId]
  )

  const requestWorkflowSetAutoRun = React.useCallback(
    (schedule: WorkflowRunSchedule) => {
      if (!workflowProjectId) return
      const detail: WorkflowSetAutoRunEventDetail = {
        projectId: workflowProjectId,
        schedule,
      }
      window.dispatchEvent(
        new CustomEvent(WORKFLOW_SET_AUTORUN_EVENT, { detail })
      )
    },
    [workflowProjectId]
  )

  if (!workflowProjectId) return null

  return (
    <div className="hidden items-center gap-1.5 md:flex">
      <Button
        type="button"
        variant="default"
        size="sm"
        onClick={() => dispatchWorkflowControlEvent(WORKFLOW_RUN_EVENT)}
        disabled={activeWorkflowControlState.isRunning}
        className="h-7 gap-1 px-2.5 text-xs disabled:cursor-not-allowed disabled:opacity-70"
      >
        {activeWorkflowControlState.isRunning ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Play className="h-3.5 w-3.5" />
        )}
        {activeWorkflowControlState.isRunning ? "Running..." : "Run"}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="default"
              size="sm"
              disabled={activeWorkflowControlState.isPublishing}
              className="h-7 gap-1 px-2.5 text-xs disabled:cursor-not-allowed disabled:opacity-70"
            />
          }
        >
          {activeWorkflowControlState.isPublishing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Rocket className="h-3.5 w-3.5" />
          )}
          {workflowPublishButtonLabel}
          <ChevronDown className="h-3.5 w-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-56">
          <DropdownMenuGroup>
            <div className="flex items-center justify-between px-2 py-1.5">
              <p className="truncate text-sm font-medium text-foreground">
                {activeWorkflowProject?.title ?? "Workflow Project"}
              </p>
              <span className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                v1.2
              </span>
            </div>
          </DropdownMenuGroup>
          <DropdownMenuItem
            onClick={() => dispatchWorkflowControlEvent(WORKFLOW_PUBLISH_EVENT)}
            disabled={activeWorkflowControlState.isPublishing}
            className="bg-primary text-primary-foreground hover:bg-primary/90 focus:bg-primary/90 focus:text-primary-foreground"
          >
            <Rocket className="h-3.5 w-3.5" />
            Update Workflow
          </DropdownMenuItem>
          <div className="px-2 py-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Clock3 className="h-3.5 w-3.5" />
              12m ago by Ethan Walker
            </span>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="justify-between">
              <span className="inline-flex items-center gap-1.5">
                <Play className="h-3.5 w-3.5" />
                Run Workflow
              </span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent align="end" className="min-w-52">
              <DropdownMenuItem
                onClick={() => dispatchWorkflowControlEvent(WORKFLOW_RUN_EVENT)}
                disabled={activeWorkflowControlState.isRunning}
              >
                <Play className="h-3.5 w-3.5" />
                Run now
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => requestWorkflowSetAutoRun({ mode: "off" })}
              >
                Off
                <span className="ms-auto text-xs text-muted-foreground">
                  {activeWorkflowControlState.runSchedule.mode === "off"
                    ? "Active"
                    : ""}
                </span>
              </DropdownMenuItem>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Every</DropdownMenuSubTrigger>
                <DropdownMenuSubContent align="end" className="min-w-56">
                  {(
                    ["minutes", "hours", "days", "weeks", "months"] as const
                  ).map((unit) => {
                    const isActive =
                      activeWorkflowControlState.runSchedule.mode === "every" &&
                      activeWorkflowControlState.runSchedule.unit === unit

                    return (
                      <DropdownMenuSub key={unit}>
                        <DropdownMenuSubTrigger className="justify-between">
                          <span>
                            {unit.charAt(0).toUpperCase() + unit.slice(1)}
                          </span>
                          <span className="ms-auto text-xs text-muted-foreground">
                            {isActive ? "Active" : ""}
                          </span>
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent
                          align="end"
                          className="min-w-52"
                        >
                          <div
                            className="px-2 py-2"
                            onClick={(event) => event.stopPropagation()}
                            onPointerDown={(event) => event.stopPropagation()}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">
                                Every
                              </span>
                              <Input
                                type="number"
                                min={1}
                                step={1}
                                value={everyIntervalValue}
                                onChange={(event) => {
                                  const rawValue = event.target.value
                                  if (rawValue === "") {
                                    setEveryIntervalValue("")
                                    return
                                  }
                                  const nextValue = Number.parseInt(
                                    rawValue,
                                    10
                                  )
                                  if (!Number.isFinite(nextValue)) return
                                  setEveryIntervalValue(
                                    String(
                                      Math.max(1, Math.min(9999, nextValue))
                                    )
                                  )
                                }}
                                onKeyDown={(event) => {
                                  event.stopPropagation()
                                  if (event.key !== "Enter") return
                                  event.preventDefault()
                                  const nextValue =
                                    everyIntervalValue.trim() === ""
                                      ? 1
                                      : parsedEveryIntervalValue
                                  setEveryIntervalValue(String(nextValue))
                                  requestWorkflowSetAutoRun({
                                    mode: "every",
                                    value: nextValue,
                                    unit,
                                  })
                                }}
                                className="h-8 w-20 text-xs"
                              />
                              <span className="text-xs text-muted-foreground">
                                {unit}
                              </span>
                              <button
                                type="button"
                                aria-label={`Save ${unit} auto-run interval`}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                                onClick={() => {
                                  const nextValue =
                                    everyIntervalValue.trim() === ""
                                      ? 1
                                      : parsedEveryIntervalValue
                                  setEveryIntervalValue(String(nextValue))
                                  requestWorkflowSetAutoRun({
                                    mode: "every",
                                    value: nextValue,
                                    unit,
                                  })
                                }}
                              >
                                <Check className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                    )
                  })}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>At</DropdownMenuSubTrigger>
                <DropdownMenuSubContent
                  align="end"
                  className="w-fit min-w-0 p-0"
                >
                  <div
                    className="space-y-3 p-3"
                    onClick={(event) => event.stopPropagation()}
                    onPointerDown={(event) => event.stopPropagation()}
                  >
                    <div className="rounded-lg border border-border">
                      <Calendar
                        mode="single"
                        selected={atDateValue}
                        onSelect={(nextDate) => {
                          if (!nextDate) return
                          setAtDateValue(nextDate)
                        }}
                        disabled={(date) => {
                          const today = new Date()
                          today.setHours(0, 0, 0, 0)
                          return date < today
                        }}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="time"
                        step={60}
                        value={atTimeValue}
                        onChange={(event) => setAtTimeValue(event.target.value)}
                        onPointerDown={(event) => event.stopPropagation()}
                        onKeyDown={(event) => event.stopPropagation()}
                        className="h-8 text-xs"
                      />
                      <Button
                        type="button"
                        size="sm"
                        className="h-8 px-2"
                        onClick={() =>
                          requestWorkflowSetAutoRun({
                            mode: "at",
                            atISO: atScheduleISO,
                          })
                        }
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {activeWorkflowControlState.runSchedule.mode === "at"
                        ? "Active"
                        : "Select date and time, then save"}
                    </p>
                  </div>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuItem
            onClick={() =>
              dispatchWorkflowControlEvent(WORKFLOW_OPEN_LOG_EVENT)
            }
            className="justify-between"
          >
            <span className="inline-flex items-center gap-1.5">
              <FileClock className="h-3.5 w-3.5" />
              View Execution Log
            </span>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          </DropdownMenuItem>
          <div className="px-2 py-1 text-[11px] text-muted-foreground">
            Auto-run: {getAutoRunLabel(activeWorkflowControlState.runSchedule)}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
