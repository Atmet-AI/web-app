export const WORKFLOW_RUN_EVENT = "workflow-run-request"
export const WORKFLOW_PUBLISH_EVENT = "workflow-publish-request"
export const WORKFLOW_OPEN_LOG_EVENT = "workflow-open-log-request"
export const WORKFLOW_OPEN_ENDPOINT_EVENT = "workflow-open-endpoint-request"
export const WORKFLOW_SET_AUTORUN_EVENT = "workflow-set-autorun-request"
export const WORKFLOW_STATE_EVENT = "workflow-state-updated"

export type WorkflowRunSchedule =
  | { mode: "off" }
  | {
      mode: "every"
      value: number
      unit: "minutes" | "hours" | "days" | "weeks" | "months"
    }
  | { mode: "at"; atISO: string }

export type WorkflowControlEventDetail = {
  projectId: string
}

export type WorkflowSetAutoRunEventDetail = {
  projectId: string
  schedule: WorkflowRunSchedule
}

export type WorkflowStateEventDetail = {
  projectId: string
  isRunning: boolean
  isPublishing: boolean
  publishState: "Draft" | "Published"
  hasUnpublishedChanges: boolean
  runSchedule: WorkflowRunSchedule
}
