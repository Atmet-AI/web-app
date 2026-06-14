"use client"

import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import { Pattern as EmptyProjectsPattern } from "@/components/examples/c-empty-13"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { workflowProjects, type WorkflowProject } from "@/lib/workflow-projects"
import {
  CheckCircle2,
  Clock3,
  FolderOpen,
  Loader2,
  MoreHorizontal,
  Search,
  Trash2,
} from "lucide-react"

type ProjectStatus = "Active" | "In review" | "Completed"

const statusMeta: Record<
  ProjectStatus,
  {
    label: string
    icon: React.ComponentType<{ className?: string }>
    className: string
  }
> = {
  Active: {
    label: "Running",
    icon: Loader2,
    className: "text-muted-foreground",
  },
  "In review": {
    label: "In review",
    icon: Clock3,
    className: "text-amber-600",
  },
  Completed: {
    label: "Done",
    icon: CheckCircle2,
    className: "text-emerald-600",
  },
}

function getProjectStatus(project: WorkflowProject): ProjectStatus {
  if (project.steps.every((step) => step.status === "Done")) return "Completed"
  if (project.steps.some((step) => step.status === "In review")) return "In review"
  return "Active"
}

function getPendingStepsCount(project: WorkflowProject) {
  return project.steps.filter((step) => step.status === "Pending").length
}

export default function WorkflowPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<WorkflowProject[]>(workflowProjects)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | ProjectStatus>("all")

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const status = getProjectStatus(project)
      const matchesStatus = statusFilter === "all" || statusFilter === status
      const lowerSearch = search.trim().toLowerCase()
      const matchesSearch =
        lowerSearch.length === 0 ||
        project.title.toLowerCase().includes(lowerSearch) ||
        project.description.toLowerCase().includes(lowerSearch) ||
        project.tags.some((tag) => tag.toLowerCase().includes(lowerSearch)) ||
        project.members.some((member) =>
          member.name.toLowerCase().includes(lowerSearch)
        )

      return matchesStatus && matchesSearch
    })
  }, [projects, search, statusFilter])

  return (
    <div className="flex min-h-[calc(100vh-2.5rem)] flex-1 flex-col bg-background">
      <section className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div className="space-y-5">
          <header className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Workflows
            </h1>
            <p className="text-sm text-muted-foreground">
              Browse and manage workflows available for your workspace.
            </p>
          </header>

          {projects.length === 0 ? (
            <div className="flex h-full min-h-[50vh] items-center justify-center">
              <EmptyProjectsPattern onCreateAutomation={() => router.push("/ai-core")} />
            </div>
          ) : (
            <>
              <section data-filter-bar-scope="true" className="flex flex-col gap-3">
                <div className="relative w-full sm:max-w-xs">
                  <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search workflows"
                    className="surface-filter-field h-7 rounded-lg border-transparent pl-7 text-xs"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={statusFilter === "all" ? "secondary" : "outline"}
                    onClick={() => setStatusFilter("all")}
                    className="h-7 text-xs"
                  >
                    All
                  </Button>
                  {(["Active", "In review", "Completed"] as ProjectStatus[]).map((status) => (
                    <Button
                      key={status}
                      type="button"
                      size="sm"
                      variant={statusFilter === status ? "secondary" : "outline"}
                      onClick={() => setStatusFilter(status)}
                      className="h-7 text-xs"
                    >
                      {status}
                    </Button>
                  ))}
                </div>
              </section>

              {filteredProjects.length === 0 ? (
                <div className="flex h-44 w-full items-center justify-center rounded-xl border border-dashed border-border">
                  <p className="text-sm text-muted-foreground">No tasks match this filter yet.</p>
                </div>
              ) : (
                <section className="w-full space-y-4">
                  <div className="surface-sidebar-bg overflow-hidden rounded-xl border border-border/70">
                    {filteredProjects.map((project, index) => {
                      const status = getProjectStatus(project)
                      const statusDetails = statusMeta[status]
                      const StatusIcon = statusDetails.icon
                      const pendingStepsCount = getPendingStepsCount(project)
                      const assignee = project.members[0]

                      return (
                        <article
                          key={project.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => router.push(`/workflow/${project.id}`)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault()
                              router.push(`/workflow/${project.id}`)
                            }
                          }}
                          className={cn(
                            "group flex items-start justify-between gap-3 px-3 py-2.5 transition-colors hover:bg-muted/40",
                            index !== filteredProjects.length - 1 && "border-b border-border/70"
                          )}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start gap-2.5">
                              <div className="min-w-0">
                                <h2 className="line-clamp-1 text-sm font-medium text-foreground">
                                  {project.title}
                                </h2>
                                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                                  <span>{project.steps.length} steps</span>
                                  <span>·</span>
                                  <span>{pendingStepsCount} pending</span>
                                  <span>·</span>
                                  <span className="inline-flex items-center gap-1">
                                    <FolderOpen className="h-3 w-3" />
                                    Dashboard
                                  </span>
                                  <span>·</span>
                                  <span className="truncate">
                                    {project.members
                                      .slice(0, 2)
                                      .map((member) => member.name)
                                      .join(", ")}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex shrink-0 items-center gap-2">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 text-xs",
                                statusDetails.className
                              )}
                            >
                              <StatusIcon
                                className={cn(
                                  "h-3.5 w-3.5",
                                  status === "Active" && "animate-spin"
                                )}
                              />
                              {statusDetails.label}
                            </span>

                            {assignee ? (
                              <span
                                className={cn(
                                  "inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-medium",
                                  assignee.tone
                                )}
                                title={assignee.name}
                              >
                                {assignee.initials}
                              </span>
                            ) : null}
                            <DropdownMenu>
                              <DropdownMenuTrigger
                                render={
                                  <Button
                                    type="button"
                                    size="icon-xs"
                                    variant="ghost"
                                    className="border-0 bg-transparent text-muted-foreground shadow-none hover:bg-transparent hover:text-foreground aria-expanded:bg-transparent"
                                    aria-label={`Task actions for ${project.title}`}
                                    onClick={(event) => {
                                      event.stopPropagation()
                                    }}
                                    onPointerDown={(event) => {
                                      event.stopPropagation()
                                    }}
                                  />
                                }
                              >
                                <MoreHorizontal className="h-3.5 w-3.5" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                className="surface-sidebar-menu min-w-36 rounded-xl border p-1"
                              >
                                <DropdownMenuItem
                                  onClick={(event) => {
                                    event.stopPropagation()
                                    router.push(`/workflow/${project.id}`)
                                  }}
                                >
                                  <FolderOpen className="h-3.5 w-3.5" />
                                  Open task
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={(event) => {
                                    event.stopPropagation()
                                    setProjects((previous) =>
                                      previous.filter((item) => item.id !== project.id)
                                    )
                                  }}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  Delete task
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </article>
                      )
                    })}
                  </div>

                  <p className="text-center text-xs text-muted-foreground">
                    You&apos;ve reached the end • {filteredProjects.length} tasks total
                  </p>
                </section>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  )
}
