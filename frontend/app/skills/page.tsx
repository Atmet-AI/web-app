"use client"

import AIPrompt from "@/components/kokonutui/ai-prompt"
import { Button } from "@/components/ui/button"
import { Badge } from "@/registry/spell-ui/badge"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { OPEN_NEW_SKILL_DIALOG_EVENT } from "@/lib/skills-events"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { useWorkspace } from "@/lib/workspace-context"
import { Bot, FileText, Folder, FolderUp, Search, Upload, X } from "lucide-react"
import { Suspense, useCallback, useEffect, useMemo, useState } from "react"

const SKILL_CATEGORIES = [
  "Writing",
  "Research",
  "Analysis",
  "Data",
  "Automation",
  "Productivity",
  "Communication",
  "Sales",
  "Marketing",
  "Support",
  "Engineering",
  "Finance",
  "Operations",
  "Legal",
  "HR",
] as const

type SkillCategory = (typeof SKILL_CATEGORIES)[number]

type SkillItem = {
  id: string
  name: string
  description: string
  category: SkillCategory
  updatedAt: string
  owner: string
  isUserCreated: boolean
  scope?: "system" | "workspace" | "user"
  sourceType?: "md_file" | "folder" | "atmet_chat"
  imageUrl?: string | null
  connectedApps?: string[]
}

type SkillApiRecord = {
  id: string
  name: string
  description: string | null
  definition?: Record<string, unknown> | null
  type: string
  scope?: "system" | "workspace" | "user"
  image_url?: string | null
  status: string
  created_by: string
  created_at: string
}

function readDefinitionText(definition: Record<string, unknown> | null | undefined, key: string) {
  const value = definition?.[key]
  return typeof value === "string" ? value : ""
}

function toSkillCategory(value: string, fallback: SkillCategory): SkillCategory {
  return SKILL_CATEGORIES.includes(value as SkillCategory)
    ? (value as SkillCategory)
    : fallback
}

function toSkillItem(skill: SkillApiRecord): SkillItem {
  const scope = skill.scope ?? "workspace"
  const category = readDefinitionText(skill.definition, "category")
  const source = readDefinitionText(skill.definition, "source")
  const packageInfo =
    skill.definition?.package &&
    typeof skill.definition.package === "object" &&
    !Array.isArray(skill.definition.package)
      ? skill.definition.package as Record<string, unknown>
      : null
  const fileCount =
    typeof packageInfo?.file_count === "number" ? packageInfo.file_count : 0
  const sourceType: SkillItem["sourceType"] =
    source === "atmet_chat"
      ? "atmet_chat"
      : fileCount > 1
        ? "folder"
        : "md_file"

  return {
    id: skill.id,
    name: skill.name,
    description: skill.description ?? "",
    category: toSkillCategory(
      category,
      skill.type === "agent" ? "Analysis" : skill.type === "trigger" ? "Automation" : "Productivity"
    ),
    updatedAt: skill.created_at.slice(0, 10),
    owner: scope === "system" ? "Atmet" : "You",
    isUserCreated: scope !== "system",
    scope,
    sourceType,
    imageUrl: skill.image_url,
  }
}

function skillSourceLabel(sourceType: SkillItem["sourceType"] = "md_file") {
  if (sourceType === "atmet_chat") return "Built by Atmet"
  if (sourceType === "folder") return "Folder"
  return "MD file"
}

function SkillAvatar({ sourceType = "md_file" }: { sourceType?: SkillItem["sourceType"] }) {
  const Icon =
    sourceType === "atmet_chat" ? Bot : sourceType === "folder" ? Folder : FileText

  return (
    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-accent text-muted-foreground">
      <Icon className="h-4 w-4" strokeWidth={1.7} />
    </span>
  )
}

function SkillCard({
  skill,
  onPreview,
}: {
  skill: SkillItem
  onPreview: () => void
}) {
  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onPreview}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          onPreview()
        }
      }}
      className="flex gap-3 rounded-xl bg-sidebar p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-colors hover:bg-sidebar-accent/70 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <SkillAvatar sourceType={skill.sourceType} />

      <div className="min-w-0 flex-1">
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <h2 className="min-w-0 truncate text-sm font-semibold tracking-tight text-foreground">
              {skill.name}
            </h2>
            <Badge variant="neutral" size="sm">
              {skill.category}
            </Badge>
            <Badge variant="blue" size="sm">
              {skillSourceLabel(skill.sourceType)}
            </Badge>
          </div>
          <p className="mt-1 line-clamp-2 text-xs leading-4 text-muted-foreground">
            {skill.description || "No description yet."}
          </p>
        </div>
      </div>
    </article>
  )
}

function SkillsPageContent() {
  const { apiFetch } = useWorkspace()
  const [skills, setSkills] = useState<SkillItem[]>([])
  const [isLoadingSkills, setIsLoadingSkills] = useState(true)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [nameFilter, setNameFilter] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [createSkillOpen, setCreateSkillOpen] = useState(false)
  const [uploadSkillOpen, setUploadSkillOpen] = useState(false)
  const [selectedSkill, setSelectedSkill] = useState<SkillItem | null>(null)
  const [uploadName, setUploadName] = useState("")
  const [uploadDescription, setUploadDescription] = useState("")
  const [uploadType, setUploadType] = useState("tool")
  const [uploadCategory, setUploadCategory] = useState<SkillCategory>("Automation")
  const [uploadImage, setUploadImage] = useState<File | null>(null)
  const [uploadFiles, setUploadFiles] = useState<File[]>([])
  const [uploadError, setUploadError] = useState("")
  const [isUploadingSkill, setIsUploadingSkill] = useState(false)
  useEffect(() => {
    const openCreateSkillDialog = () => {
      setCreateSkillOpen(true)
    }

    window.addEventListener(OPEN_NEW_SKILL_DIALOG_EVENT, openCreateSkillDialog)
    return () => {
      window.removeEventListener(OPEN_NEW_SKILL_DIALOG_EVENT, openCreateSkillDialog)
    }
  }, [])

  const loadSkills = useCallback(() => {
    setIsLoadingSkills(true)
    apiFetch("/api/skills")
      .then((r) => r.json())
      .then((res: { data?: { skills: SkillApiRecord[] } }) => {
        const raw = res.data?.skills ?? []
        setSkills(raw.map(toSkillItem))
      })
      .catch(() => {})
      .finally(() => setIsLoadingSkills(false))
  }, [apiFetch])

  useEffect(() => {
    loadSkills()
  }, [loadSkills])

  useEffect(() => {
    fetch("/api/users/me")
      .then((r) => r.json())
      .then((res: { data?: { user?: { platform_role?: string } } }) => {
        setIsSuperAdmin(res.data?.user?.platform_role === "super_admin")
      })
      .catch(() => {})
  }, [])

  const closeCreateSkillDialog = useCallback(() => {
    setCreateSkillOpen(false)
  }, [])

  const resetUploadDialog = useCallback(() => {
    setUploadName("")
    setUploadDescription("")
    setUploadType("tool")
    setUploadCategory("Automation")
    setUploadImage(null)
    setUploadFiles([])
    setUploadError("")
  }, [])

  const submitDefaultSkill = useCallback(async () => {
    setUploadError("")

    if (!uploadName.trim()) {
      setUploadError("Skill name is required.")
      return
    }

    if (uploadFiles.length === 0) {
      setUploadError("Upload a skill folder.")
      return
    }

    const formData = new FormData()
    formData.set("name", uploadName.trim())
    formData.set("description", uploadDescription.trim())
    formData.set("type", uploadType)
    formData.set("category", uploadCategory)
    if (uploadImage) formData.set("image", uploadImage)

    const paths = uploadFiles.map((file) => {
      const withPath = file as File & { webkitRelativePath?: string }
      return withPath.webkitRelativePath || file.name
    })
    formData.set("paths", JSON.stringify(paths))
    uploadFiles.forEach((file) => formData.append("files", file))

    setIsUploadingSkill(true)
    try {
      const response = await fetch("/api/admin/skills/upload", {
        method: "POST",
        body: formData,
      })
      const payload = await response.json()
      if (!response.ok) {
        setUploadError(payload?.error?.message ?? "Default skill could not be uploaded.")
        return
      }

      resetUploadDialog()
      setUploadSkillOpen(false)
      loadSkills()
    } catch {
      setUploadError("Default skill could not be uploaded.")
    } finally {
      setIsUploadingSkill(false)
    }
  }, [
    loadSkills,
    resetUploadDialog,
    uploadCategory,
    uploadDescription,
    uploadFiles,
    uploadImage,
    uploadName,
    uploadType,
  ])

  const categoryOptions = SKILL_CATEGORIES

  const filteredSkills = useMemo(() => {
    return skills.filter((skill) => {
      const byName =
        nameFilter.trim().length === 0 ||
        skill.name.toLowerCase().includes(nameFilter.toLowerCase()) ||
        skill.description.toLowerCase().includes(nameFilter.toLowerCase())

      const byCategory =
        categoryFilter === "all" || skill.category === categoryFilter

      return byName && byCategory
    })
  }, [skills, nameFilter, categoryFilter])

  const categoryGroups = useMemo(
    () =>
      categoryOptions.map((category) => ({
        category,
        items: filteredSkills.filter((skill) => skill.category === category),
      })).filter((group) => group.items.length > 0),
    [categoryOptions, filteredSkills]
  )

  return (
    <div className="flex min-h-[calc(100vh-2.5rem)] flex-1 flex-col bg-background">
      <div className="flex min-h-0 flex-1">
        <section className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="space-y-5">
          <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                Skills
              </h1>
              <p className="text-sm text-muted-foreground">
                Browse and manage reusable skills available for your workspace.
              </p>
            </div>
            {isSuperAdmin && (
              <Button
                type="button"
                size="sm"
                onClick={() => setUploadSkillOpen(true)}
                className="h-8 self-start"
              >
                <FolderUp className="h-4 w-4" />
                Upload default skill
              </Button>
            )}
          </header>

          <section data-filter-bar-scope="true" className="flex flex-col gap-3">
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={nameFilter}
                onChange={(event) => setNameFilter(event.target.value)}
                placeholder="Search skills"
                className="surface-filter-field h-7 rounded-lg border-transparent pl-7 text-xs"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant={categoryFilter === "all" ? "secondary" : "outline"}
                onClick={() => setCategoryFilter("all")}
                className="h-7 text-xs"
              >
                All
              </Button>
              {categoryOptions.map((category) => (
                <Button
                  key={category}
                  type="button"
                  size="sm"
                  variant={categoryFilter === category ? "secondary" : "outline"}
                  onClick={() => setCategoryFilter(category)}
                  className="h-7 text-xs"
                >
                  {category}
                </Button>
              ))}
            </div>
          </section>

          {isLoadingSkills ? (
            <div className="grid gap-3 lg:grid-cols-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="flex gap-3 rounded-xl bg-sidebar p-3.5">
                  <div className="h-9 w-9 shrink-0 rounded-lg bg-sidebar-accent" />
                  <div className="min-w-0 flex-1">
                    <div className="h-4 w-40 rounded bg-sidebar-accent" />
                    <div className="mt-2 h-3 w-full rounded bg-sidebar-accent" />
                    <div className="mt-1.5 h-3 w-2/3 rounded bg-sidebar-accent" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredSkills.length > 0 ? (
            <section className="space-y-6">
              {categoryGroups.map((group) => (
                <div key={group.category} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-foreground">
                      {group.category}
                    </h2>
                    <span className="text-xs text-muted-foreground">
                      {group.items.length} skills
                    </span>
                  </div>
                  <div className="grid gap-3 lg:grid-cols-2">
                    {group.items.map((skill) => (
                      <SkillCard
                        key={skill.id}
                        skill={skill}
                        onPreview={() => setSelectedSkill(skill)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </section>
          ) : (
            <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
              No skills match your current filters.
            </div>
          )}
          </div>
        </section>
      <aside
        className={cn(
          "sticky top-20 z-20 flex h-[calc(100vh-5rem)] min-w-0 shrink-0 self-start flex-col overflow-hidden bg-transparent transition-[width,padding] duration-300 ease-out",
          createSkillOpen ? "w-[min(42vw,620px)] p-3 pl-2" : "w-0 p-0"
        )}
        aria-hidden={!createSkillOpen}
      >
        <div
          className={cn(
            "flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-border/70 bg-background/95 backdrop-blur-sm transition-all duration-300 ease-out",
            createSkillOpen
              ? "translate-x-0 opacity-100"
              : "pointer-events-none translate-x-8 opacity-0"
          )}
          role="dialog"
          aria-label="Create Skill"
        >
          <div className="flex items-start justify-between border-b border-border px-5 py-4">
            <div>
              <h2 className="text-base font-medium text-foreground">Create Skill</h2>
              <p className="text-sm text-muted-foreground">
                Chat to define and create a new skill.
              </p>
            </div>
            <button
              type="button"
              aria-label="Close create skill panel"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              onClick={closeCreateSkillDialog}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-hidden px-4 py-4">
            <AIPrompt
              chatId={null}
              persistChatListEntry={false}
              hideGreeting
              dockComposerToBottom
              fixedCommandBadge="/create skill"
              userFullName="You"
            />
          </div>
        </div>
      </aside>
      </div>

      <Dialog
        open={uploadSkillOpen}
        onOpenChange={(open) => {
          setUploadSkillOpen(open)
          if (!open) resetUploadDialog()
        }}
      >
        <DialogContent className="max-h-[88vh] overflow-y-auto p-0 sm:max-w-2xl">
          <DialogHeader className="border-b border-border px-5 py-4">
            <DialogTitle>Upload default skill</DialogTitle>
            <DialogDescription>
              Create a system skill from a folder. It will be available to every workspace.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 px-5 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="default-skill-name">Skill name</Label>
                <Input
                  id="default-skill-name"
                  value={uploadName}
                  onChange={(event) => setUploadName(event.target.value)}
                  placeholder="e.g. Contract Review"
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="default-skill-description">Description</Label>
                <Textarea
                  id="default-skill-description"
                  value={uploadDescription}
                  onChange={(event) => setUploadDescription(event.target.value)}
                  placeholder="What this skill helps users do..."
                  className="min-h-20 resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="default-skill-category">Category</Label>
                <select
                  id="default-skill-category"
                  value={uploadCategory}
                  onChange={(event) => setUploadCategory(event.target.value as SkillCategory)}
                  className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-ring"
                >
                  {SKILL_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="default-skill-type">Type</Label>
                <select
                  id="default-skill-type"
                  value={uploadType}
                  onChange={(event) => setUploadType(event.target.value)}
                  className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-ring"
                >
                  <option value="tool">Tool</option>
                  <option value="agent">Agent</option>
                  <option value="action">Action</option>
                  <option value="trigger">Trigger</option>
                </select>
              </div>

            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex min-h-28 cursor-pointer flex-col justify-between rounded-xl border border-dashed border-border bg-muted/20 p-4 transition-colors hover:bg-muted/40">
                <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Upload className="h-4 w-4" />
                  Cover image
                </span>
                <span className="text-xs text-muted-foreground">
                  {uploadImage ? uploadImage.name : "Optional PNG, JPG, WebP, GIF, or AVIF"}
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                  className="sr-only"
                  onChange={(event) => setUploadImage(event.target.files?.[0] ?? null)}
                />
              </label>

              <label className="flex min-h-28 cursor-pointer flex-col justify-between rounded-xl border border-dashed border-border bg-muted/20 p-4 transition-colors hover:bg-muted/40">
                <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <FolderUp className="h-4 w-4" />
                  Skill folder
                </span>
                <span className="text-xs text-muted-foreground">
                  {uploadFiles.length > 0
                    ? `${uploadFiles.length} files selected`
                    : "Upload the folder that contains the skill files"}
                </span>
                <input
                  type="file"
                  multiple
                  className="sr-only"
                  ref={(node) => {
                    node?.setAttribute("webkitdirectory", "")
                    node?.setAttribute("directory", "")
                  }}
                  onChange={(event) => setUploadFiles(Array.from(event.target.files ?? []))}
                />
              </label>
            </div>

            {uploadError && (
              <p className="text-sm text-destructive">{uploadError}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setUploadSkillOpen(false)}
              disabled={isUploadingSkill}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void submitDefaultSkill()}
              disabled={isUploadingSkill}
            >
              <FolderUp className="h-4 w-4" />
              {isUploadingSkill ? "Uploading..." : "Create default skill"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={selectedSkill !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedSkill(null)
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto p-0 sm:max-w-2xl">
          {selectedSkill && (
            <>
              <div className="space-y-6 p-6">
                <DialogHeader>
                  <div className="flex items-start gap-4 pr-8">
                    <SkillAvatar sourceType={selectedSkill.sourceType} />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <DialogTitle className="text-xl">
                          {selectedSkill.name}
                        </DialogTitle>
                        <Badge variant="neutral" size="sm">
                          {selectedSkill.category}
                        </Badge>
                        <Badge variant="blue" size="sm">
                          {skillSourceLabel(selectedSkill.sourceType)}
                        </Badge>
                      </div>
                      <DialogDescription className="mt-2 leading-6 text-pretty">
                        {selectedSkill.description || "No description yet."}
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>

                <section>
                  <h3 className="text-sm font-semibold text-foreground">
                    Description
                  </h3>
                  <p className="mt-3 text-pretty text-sm leading-7 text-muted-foreground">
                    {selectedSkill.description || "This skill is ready to use in Atmet chats."} This {selectedSkill.category.toLowerCase()} skill
                    is designed to make recurring work faster, more consistent,
                    and easier to pass into connected workflows.
                  </p>
                </section>

                <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
                  <div className="rounded-lg bg-muted/50 p-4">
                    <dt className="text-xs text-muted-foreground">Category</dt>
                    <dd className="mt-1 font-medium">{selectedSkill.category}</dd>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-4">
                    <dt className="text-xs text-muted-foreground">Owner</dt>
                    <dd className="mt-1 truncate font-medium">{selectedSkill.owner}</dd>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-4">
                    <dt className="text-xs text-muted-foreground">Updated</dt>
                    <dd className="mt-1 font-medium">{selectedSkill.updatedAt}</dd>
                  </div>
                </dl>

                {selectedSkill.connectedApps &&
                  selectedSkill.connectedApps.length > 0 && (
                    <div>
                      <p className="mb-2 text-xs text-muted-foreground">
                        Connected apps
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {selectedSkill.connectedApps.map((app) => (
                          <Badge key={app} variant="violet">
                            {app}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function SkillsPage() {
  return (
    <Suspense
      fallback={<div className="flex min-h-[calc(100vh-2.5rem)] flex-1 bg-background" />}
    >
      <SkillsPageContent />
    </Suspense>
  )
}
