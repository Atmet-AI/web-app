export type WorkflowMember = {
  name: string
  initials: string
  tone: string
}

export type WorkflowStep = {
  name: string
  status: "Done" | "In review" | "Pending"
  owner: string
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

export const workflowProjects: WorkflowProject[] = [
  {
    id: "contract-risk-review",
    title: "Contract Risk Review",
    description: "Run multi-step checks for clause risks, obligations, and renewal traps.",
    icon: "analysis",
    tags: ["Legal", "Risk", "Contracts"],
    members: [
      { name: "Amir Haddad", initials: "AH", tone: "bg-sky-100 text-sky-700" },
      { name: "Nina Brooks", initials: "NB", tone: "bg-emerald-100 text-emerald-700" },
      { name: "Sarah Chen", initials: "SC", tone: "bg-violet-100 text-violet-700" },
    ],
    steps: [
      { name: "Ingest Agreements", status: "Done", owner: "Amir Haddad" },
      { name: "Extract Clauses", status: "Done", owner: "Nina Brooks" },
      { name: "Score Risk Signals", status: "In review", owner: "Sarah Chen" },
      { name: "Publish Summary", status: "Pending", owner: "Amir Haddad" },
    ],
  },
  {
    id: "vendor-onboarding-qa",
    title: "Vendor Onboarding QA",
    description: "Validate policy alignment and required paperwork before activation.",
    icon: "checklist",
    tags: ["Ops", "Compliance", "Vendors"],
    members: [
      { name: "Jay Park", initials: "JP", tone: "bg-rose-100 text-rose-700" },
      { name: "Omar Salem", initials: "OS", tone: "bg-amber-100 text-amber-700" },
      { name: "Xi Sun", initials: "XS", tone: "bg-emerald-100 text-emerald-700" },
    ],
    steps: [
      { name: "Collect Intake Form", status: "Done", owner: "Jay Park" },
      { name: "Verify Security Evidence", status: "In review", owner: "Xi Sun" },
      { name: "Legal Approval", status: "Pending", owner: "Omar Salem" },
      { name: "Activate Vendor", status: "Pending", owner: "Jay Park" },
    ],
  },
  {
    id: "ip-clause-watch",
    title: "IP Clause Watch",
    description: "Track ownership and licensing language across incoming agreements.",
    icon: "lock",
    tags: ["IP", "Monitoring", "Priority"],
    members: [
      { name: "Lena Noor", initials: "LN", tone: "bg-blue-100 text-blue-700" },
      { name: "Mina Faris", initials: "MF", tone: "bg-fuchsia-100 text-fuchsia-700" },
      { name: "Rami Adel", initials: "RA", tone: "bg-slate-200 text-slate-700" },
    ],
    steps: [
      { name: "Detect IP Terms", status: "Done", owner: "Lena Noor" },
      { name: "Ownership Review", status: "In review", owner: "Mina Faris" },
      { name: "Escalate Exceptions", status: "Pending", owner: "Rami Adel" },
      { name: "Send Weekly Digest", status: "Pending", owner: "Lena Noor" },
    ],
  },
  {
    id: "ma-diligence-runbook",
    title: "M&A Diligence Runbook",
    description: "Coordinate high-volume review tasks and score critical deal items.",
    icon: "scale",
    tags: ["M&A", "Diligence", "Finance"],
    members: [
      { name: "Bryan Lee", initials: "BL", tone: "bg-cyan-100 text-cyan-700" },
      { name: "Ava Nasser", initials: "AN", tone: "bg-lime-100 text-lime-700" },
      { name: "You", initials: "YO", tone: "bg-orange-100 text-orange-700" },
    ],
    steps: [
      { name: "Document Collection", status: "Done", owner: "Bryan Lee" },
      { name: "Financial Flags", status: "In review", owner: "Ava Nasser" },
      { name: "Counsel Review", status: "Pending", owner: "You" },
      { name: "Deal Readout", status: "Pending", owner: "Bryan Lee" },
    ],
  },
]

export function getWorkflowProject(projectId: string) {
  return workflowProjects.find((project) => project.id === projectId)
}
