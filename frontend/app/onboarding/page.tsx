"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { AnimatePresence, motion } from "motion/react"
import { Check, CornerDownLeft, Loader2, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Kbd } from "@/components/ui/kbd"
import { PlatformSelect } from "@/components/platform-select"
import { phoneCountries } from "@/lib/phone-countries"
import { cn } from "@/lib/utils"
import { useWorkspace } from "@/lib/workspace-context"

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
].map((role) => ({ value: role, label: role }))

const phoneCountryOptions = phoneCountries.map((country) => ({
  value: country.value,
  label: `${country.label} ${country.dialCode}`,
  leading: <span className="text-base leading-none">{country.flag}</span>,
}))

function getInitials(value: string, fallback = "A") {
  const parts = value.trim().split(/\s+/).filter(Boolean)
  return (
    parts
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || fallback
  )
}

function splitName(fullName: string | null | undefined) {
  const parts = (fullName ?? "").trim().split(/\s+/).filter(Boolean)
  return {
    firstName: parts[0] ?? "",
    secondName: parts.slice(1).join(" "),
  }
}

async function uploadAvatar(file: File, scope: "user" | "workspace") {
  const formData = new FormData()
  formData.append("file", file)
  formData.append("scope", scope)

  const response = await fetch("/api/avatars", {
    method: "POST",
    body: formData,
  })

  const payload = (await response.json()) as {
    data?: { url?: string }
    error?: { message?: string }
  }

  if (!response.ok || !payload.data?.url) {
    throw new Error(payload.error?.message ?? "Unable to upload image.")
  }

  return payload.data.url
}

function OptionalImagePicker({
  label,
  value,
  fallback,
  isUploading,
  onFile,
}: {
  label: string
  value: string | null
  fallback: string
  isUploading: boolean
  onFile: (file: File) => void
}) {
  const inputRef = React.useRef<HTMLInputElement>(null)

  return (
    <div className="flex items-center gap-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.currentTarget.value = ""
          if (file) onFile(file)
        }}
      />
      <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/80 bg-sidebar-accent text-sm font-semibold text-muted-foreground shadow-sm">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt={label} className="size-full object-cover" />
        ) : (
          isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : fallback
        )}
      </div>
      <div className="min-w-0 flex-1">
        <Label className="text-muted-foreground">{label}</Label>
        <p className="mt-0.5 text-xs text-muted-foreground">Optional image</p>
      </div>
      <Button
        type="button"
        size="icon-sm"
        variant="outline"
        disabled={isUploading}
        onClick={() => inputRef.current?.click()}
        aria-label={`Upload ${label.toLowerCase()}`}
        className="shrink-0"
      >
        {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
      </Button>
    </div>
  )
}

export default function OnboardingPage() {
  const router = useRouter()
  const { refreshWorkspaces } = useWorkspace()
  const [step, setStep] = React.useState<Step>("workspace")
  const [workspaceName, setWorkspaceName] = React.useState("")
  const [workspaceAvatarUrl, setWorkspaceAvatarUrl] = React.useState<string | null>(null)
  const [workspaceId, setWorkspaceId] = React.useState<string | null>(null)
  const [firstName, setFirstName] = React.useState("")
  const [secondName, setSecondName] = React.useState("")
  const [profileAvatarUrl, setProfileAvatarUrl] = React.useState<string | null>(null)
  const [role, setRole] = React.useState("")
  const [phoneCountry, setPhoneCountry] = React.useState("JO")
  const [phoneNumber, setPhoneNumber] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)
  const [isUploadingWorkspaceImage, setIsUploadingWorkspaceImage] = React.useState(false)
  const [isUploadingProfileImage, setIsUploadingProfileImage] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    fetch("/api/users/me")
      .then((r) => r.json())
      .then((res: { data?: { user: { full_name: string | null; avatar_url: string | null; phone_country: string | null; phone_number: string | null } } }) => {
        const user = res.data?.user
        if (!user) return
        const parsedName = splitName(user.full_name)
        setFirstName(parsedName.firstName)
        setSecondName(parsedName.secondName)
        setProfileAvatarUrl(user.avatar_url)
        if (user.phone_country) setPhoneCountry(user.phone_country)
        if (user.phone_number) setPhoneNumber(user.phone_number)
      })
      .catch(() => {})
  }, [])

  const handleImageUpload = React.useCallback(
    async (file: File, scope: "user" | "workspace") => {
      const setUploading = scope === "workspace" ? setIsUploadingWorkspaceImage : setIsUploadingProfileImage
      setUploading(true)
      setError(null)
      try {
        const url = await uploadAvatar(file, scope)
        if (scope === "workspace") setWorkspaceAvatarUrl(url)
        else setProfileAvatarUrl(url)
      } catch (uploadError) {
        setError(uploadError instanceof Error ? uploadError.message : "Unable to upload image.")
      } finally {
        setUploading(false)
      }
    },
    []
  )

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
          body: JSON.stringify({ name, avatar_url: workspaceAvatarUrl }),
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
    [workspaceAvatarUrl, workspaceName]
  )

  const handleProfileSubmit = React.useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      const fullName = `${firstName.trim()} ${secondName.trim()}`.trim()
      const selectedPhoneCountry = phoneCountries.find((country) => country.value === phoneCountry)
      const normalizedPhoneNumber = phoneNumber.trim()
      if (!firstName.trim()) return

      setIsLoading(true)
      setError(null)

      try {
        const res = await fetch("/api/users/me", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            full_name: fullName,
            avatar_url: profileAvatarUrl,
            phone_country: normalizedPhoneNumber ? phoneCountry : null,
            phone_country_code: normalizedPhoneNumber ? selectedPhoneCountry?.dialCode ?? null : null,
            phone_number: normalizedPhoneNumber || null,
            onboarding_completed: true,
          }),
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
    [firstName, phoneCountry, phoneNumber, profileAvatarUrl, secondName]
  )

  const handleEnterApp = React.useCallback(async () => {
    await refreshWorkspaces().catch(() => {})
    router.push("/ai-core")
  }, [refreshWorkspaces, router])

  const stepIndex = step === "workspace" ? 0 : step === "profile" ? 1 : 2
  const totalSteps = 2

  return (
    <div className="mx-auto w-full max-w-sm">
      {step !== "done" && (
        <div className="mb-8 flex items-center gap-2">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors duration-300",
                i <= stepIndex ? "bg-foreground" : "bg-border"
              )}
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

            <form onSubmit={(e) => void handleWorkspaceSubmit(e)} className="space-y-4">
              <OptionalImagePicker
                label="Workspace image"
                value={workspaceAvatarUrl}
                fallback={getInitials(workspaceName, "W")}
                isUploading={isUploadingWorkspaceImage}
                onFile={(file) => void handleImageUpload(file, "workspace")}
              />

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

              {error && <p className="text-xs text-destructive">{error}</p>}

              <Button
                type="submit"
                size="sm"
                data-auth-primary-action="true"
                disabled={isLoading || isUploadingWorkspaceImage || !workspaceName.trim()}
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

            <form onSubmit={(e) => void handleProfileSubmit(e)} className="space-y-4">
              <OptionalImagePicker
                label="Profile image"
                value={profileAvatarUrl}
                fallback={getInitials(`${firstName} ${secondName}`, "U")}
                isUploading={isUploadingProfileImage}
                onFile={(file) => void handleImageUpload(file, "user")}
              />

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="first-name" className="text-muted-foreground">
                    First name
                  </Label>
                  <Input
                    id="first-name"
                    value={firstName}
                    onChange={(e) => {
                      setFirstName(e.target.value)
                      setError(null)
                    }}
                    placeholder="First name"
                    autoFocus
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="second-name" className="text-muted-foreground">
                    Second name
                  </Label>
                  <Input
                    id="second-name"
                    value={secondName}
                    onChange={(e) => {
                      setSecondName(e.target.value)
                      setError(null)
                    }}
                    placeholder="Second name"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="role" className="text-muted-foreground">
                  Your role <span>(optional)</span>
                </Label>
                <PlatformSelect
                  id="role"
                  value={role}
                  options={roleOptions}
                  placeholder="Select your role..."
                  onChange={setRole}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone-number" className="text-muted-foreground">
                  Phone number <span>(optional)</span>
                </Label>
                <div className="grid grid-cols-[minmax(9rem,0.9fr)_minmax(0,1.1fr)] gap-2">
                  <PlatformSelect
                    id="phone-country"
                    value={phoneCountry}
                    options={phoneCountryOptions}
                    placeholder="Country code"
                    searchPlaceholder="Search country..."
                    searchable
                    onChange={setPhoneCountry}
                  />
                  <Input
                    id="phone-number"
                    type="tel"
                    inputMode="tel"
                    value={phoneNumber}
                    onChange={(e) => {
                      setPhoneNumber(e.target.value)
                      setError(null)
                    }}
                    placeholder="79 000 0000"
                  />
                </div>
              </div>

              {error && <p className="text-xs text-destructive">{error}</p>}

              <Button
                type="submit"
                size="sm"
                data-auth-primary-action="true"
                disabled={isLoading || isUploadingProfileImage || !firstName.trim()}
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
