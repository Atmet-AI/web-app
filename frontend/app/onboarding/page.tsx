"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { AnimatePresence, motion } from "motion/react"
import { Check, CornerDownLeft, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Kbd } from "@/components/ui/kbd"

type Step = "workspace" | "profile" | "done"

const STEP_LABELS: Record<Step, string> = {
  workspace: "Create your workspace",
  profile: "Complete your profile",
  done: "You're all set",
}

const STEP_DESCRIPTIONS: Record<Step, string> = {
  workspace: "Give your workspace a name to get started.",
  profile: "Tell us a bit about yourself.",
  done: "Your workspace is ready. Let's get started.",
}

const roleOptions = [
  "Founder / Owner",
  "Operations",
  "Engineering",
  "Product",
  "Design",
  "Marketing",
  "Other",
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = React.useState<Step>("workspace")
  const [workspaceName, setWorkspaceName] = React.useState("")
  const [workspaceId, setWorkspaceId] = React.useState<string | null>(null)
  const [fullName, setFullName] = React.useState("")
  const [role, setRole] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Prefill name from existing session if available
  React.useEffect(() => {
    fetch("/api/users/me")
      .then((r) => r.json())
      .then((res: { data?: { user: { full_name: string | null } } }) => {
        const name = res.data?.user?.full_name
        if (name) setFullName(name)
      })
      .catch(() => {})
  }, [])

  const handleWorkspaceSubmit = React.useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      const name = workspaceName.trim()
      if (!name) return

      setIsLoading(true)
      setError(null)

      try {
        const res = await fetch("/api/workspaces", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        })
        const payload = (await res.json()) as {
          data?: { workspace: { id: string } }
          error?: { message: string }
        }

        if (!res.ok || !payload.data?.workspace) {
          setError(payload.error?.message ?? "Failed to create workspace.")
          return
        }

        const id = payload.data.workspace.id
        localStorage.setItem("atmet_active_workspace", id)
        setWorkspaceId(id)
        setStep("profile")
      } catch {
        setError("Something went wrong. Please try again.")
      } finally {
        setIsLoading(false)
      }
    },
    [workspaceName]
  )

  const handleProfileSubmit = React.useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      const name = fullName.trim()
      if (!name) return

      setIsLoading(true)
      setError(null)

      try {
        const res = await fetch("/api/users/me", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ full_name: name, onboarding_completed: true }),
        })

        if (!res.ok) {
          const payload = (await res.json()) as { error?: { message: string } }
          setError(payload.error?.message ?? "Failed to save profile.")
          return
        }

        setStep("done")
      } catch {
        setError("Something went wrong. Please try again.")
      } finally {
        setIsLoading(false)
      }
    },
    [fullName]
  )

  const handleEnterApp = React.useCallback(() => {
    router.push("/ai-core")
  }, [router])

  const stepIndex = step === "workspace" ? 0 : step === "profile" ? 1 : 2
  const totalSteps = 2

  return (
    <div className="mx-auto w-full max-w-sm">
      {step !== "done" && (
        <div className="mb-8 flex items-center gap-2">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                i <= stepIndex ? "bg-foreground" : "bg-border"
              }`}
            />
          ))}
        </div>
      )}

      <AnimatePresence mode="wait">
        {step === "workspace" && (
          <motion.div
            key="workspace"
            initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="space-y-8"
          >
            <div className="space-y-1.5 text-center">
              <h1 className="text-balance text-2xl font-semibold tracking-tight text-foreground">
                {STEP_LABELS.workspace}
              </h1>
              <p className="text-pretty text-sm text-muted-foreground">
                {STEP_DESCRIPTIONS.workspace}
              </p>
            </div>

            <form
              onSubmit={(e) => void handleWorkspaceSubmit(e)}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <Label htmlFor="ws-name" className="text-muted-foreground">
                  Workspace name
                </Label>
                <Input
                  id="ws-name"
                  value={workspaceName}
                  onChange={(e) => {
                    setWorkspaceName(e.target.value)
                    setError(null)
                  }}
                  placeholder="e.g. Acme Corp"
                  autoFocus
                  required
                />
              </div>

              {error && (
                <p className="text-xs text-destructive">{error}</p>
              )}

              <Button
                type="submit"
                size="sm"
                data-auth-primary-action="true"
                disabled={isLoading || !workspaceName.trim()}
                className="mt-2 w-full transition-transform active:scale-[0.96]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <span>Continue</span>
                    <Kbd className="h-4 rounded-[calc(min(var(--radius-md),12px)*4/7)] border-transparent bg-primary-foreground/15 px-1 text-[10px] text-primary-foreground">
                      <CornerDownLeft className="h-2.5 w-2.5" />
                    </Kbd>
                  </>
                )}
              </Button>
            </form>
          </motion.div>
        )}

        {step === "profile" && (
          <motion.div
            key="profile"
            initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="space-y-8"
          >
            <div className="space-y-1.5 text-center">
              <h1 className="text-balance text-2xl font-semibold tracking-tight text-foreground">
                {STEP_LABELS.profile}
              </h1>
              <p className="text-pretty text-sm text-muted-foreground">
                {STEP_DESCRIPTIONS.profile}
              </p>
            </div>

            <form
              onSubmit={(e) => void handleProfileSubmit(e)}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <Label htmlFor="full-name" className="text-muted-foreground">
                  Full name
                </Label>
                <Input
                  id="full-name"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value)
                    setError(null)
                  }}
                  placeholder="Your full name"
                  autoFocus
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="role" className="text-muted-foreground">
                  Your role <span>(optional)</span>
                </Label>
                <select
                  id="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-base text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-primary disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80"
                >
                  <option value="">Select your role...</option>
                  {roleOptions.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              {error && (
                <p className="text-xs text-destructive">{error}</p>
              )}

              <Button
                type="submit"
                size="sm"
                data-auth-primary-action="true"
                disabled={isLoading || !fullName.trim()}
                className="mt-2 w-full transition-transform active:scale-[0.96]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <span>Complete setup</span>
                    <Kbd className="h-4 rounded-[calc(min(var(--radius-md),12px)*4/7)] border-transparent bg-primary-foreground/15 px-1 text-[10px] text-primary-foreground">
                      <CornerDownLeft className="h-2.5 w-2.5" />
                    </Kbd>
                  </>
                )}
              </Button>
            </form>
          </motion.div>
        )}

        {step === "done" && (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.95, filter: "blur(4px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="space-y-8 text-center"
          >
            <div className="flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Check className="h-8 w-8 text-primary" strokeWidth={2.5} />
              </div>
            </div>

            <div className="space-y-1.5">
              <h1 className="text-balance text-2xl font-semibold tracking-tight text-foreground">
                {STEP_LABELS.done}
              </h1>
              <p className="text-pretty text-sm text-muted-foreground">
                {STEP_DESCRIPTIONS.done}
                {workspaceId && (
                  <span className="mt-1 block">
                    Workspace <strong>{workspaceName}</strong> is ready.
                  </span>
                )}
              </p>
            </div>

            <Button
              size="sm"
              data-auth-primary-action="true"
              className="w-full transition-transform active:scale-[0.96]"
              onClick={handleEnterApp}
            >
              Open Atmet
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
