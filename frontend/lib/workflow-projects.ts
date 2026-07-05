export type WorkflowMember = {
  name: string
  initials: string
  tone: string
}

export type WorkflowStep = {
  name: string
  status: "Done" | "In review" | "Pending"
  owner: string
  nodeType?: "Action" | "Trigger"
  prompt?: string
  provider?: string
  model?: string
  tokenCount?: number
  usedApps?: string[]
  usedSkills?: string[]
  files?: string[]
  chatId?: string
}

export type WorkflowProject = {
  id: string
  title: string
  description: string
  icon: "analysis" | "checklist" | "lock" | "scale"
  tags: string[]
  members: WorkflowMember[]
  steps: WorkflowStep[]
}

export const workflowProjects: WorkflowProject[] = []

export function getWorkflowProject(projectId: string) {
  return workflowProjects.find((project) => project.id === projectId)
}
