"use client"

import * as React from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { Check, CornerDownLeft, Eye, EyeOff, Loader2, Upload } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Kbd } from "@/components/ui/kbd"
import { PlatformSelect } from "@/components/platform-select"
import { countries } from "@/lib/countries"
import { phoneCountries } from "@/lib/phone-countries"
import { cn } from "@/lib/utils"

type InvitePayload = {
  id: string
  email: string
  role: string
  workspace:
    | {
        id: string
        name: string
        avatar_url: string | null
      }
    | Array<{
        id: string
        name: string
        avatar_url: string | null
      }>
  inviter?:
    | {
        full_name: string | null
        email: string | null
      }
    | Array<{
        full_name: string | null
        email: string | null
      }>
}

const roleOptions = [
  "Engineering",
  "Design",
  "Product",
  "Operations",
  "Marketing",
  "Sales",
  "Finance",
  "Founder",
  "Other",
] as const

function initials(name: string) {
  const tokens = name.trim().split(/\s+/).filter(Boolean).slice(0, 2)
  return tokens.length ? tokens.map((token) => token[0]?.toUpperCase()).join("") : "W"
}

function unwrap<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export default function InvitePage() {
  const router = useRouter()
  const params = useParams<{ token: string }>()
  const token = params.token
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [invite, setInvite] = React.useState<InvitePayload | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isUploading, setIsUploading] = React.useState(false)
  const [isJoining, setIsJoining] = React.useState(false)
  const [step, setStep] = React.useState<"join" | "profile" | "done">("join")
  const [error, setError] = React.useState("")
  const [firstName, setFirstName] = React.useState("")
  const [lastName, setLastName] = React.useState("")
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null)
  const [phoneCountry, setPhoneCountry] = React.useState("US")
  const [country, setCountry] = React.useState("US")
  const selectedPhoneCountry =
    phoneCountries.find((country) => country.value === phoneCountry) ??
    phoneCountries[0]
  const [phoneNumber, setPhoneNumber] = React.useState("")
  const [role, setRole] = React.useState<(typeof roleOptions)[number] | string>("")
  const [customRole, setCustomRole] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [showPassword, setShowPassword] = React.useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false)
  const [signInUrl, setSignInUrl] = React.useState("/sign-in")

  React.useEffect(() => {
    setIsLoading(true)
    fetch(`/api/invitations/${token}`)
      .then(async (response) => {
        const payload = (await response.json()) as {
          data?: { invitation?: InvitePayload }
          error?: { message?: string }
        }
        if (!response.ok || !payload.data?.invitation) {
          throw new Error(payload.error?.message ?? "This invitation is invalid or expired.")
        }
        setInvite(payload.data.invitation)
      })
      .catch((nextError: Error) => setError(nextError.message))
      .finally(() => setIsLoading(false))
  }, [token])

  const workspace = unwrap(invite?.workspace)
  const inviter = unwrap(invite?.inviter)
  const workspaceName = workspace?.name ?? "this workspace"
  const displayRole = role === "Other" ? customRole : role

  const uploadAvatar = async (file: File) => {
    setIsUploading(true)
    setError("")
    const formData = new FormData()
    formData.append("file", file)
    try {
      const response = await fetch(`/api/invitations/${token}/avatar`, {
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
      setAvatarUrl(payload.data.url)
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to upload image.")
    } finally {
      setIsUploading(false)
    }
  }

  const completeProfileAndJoin = () => {
    if (!firstName.trim() || !lastName.trim()) {
      setError("Enter your first and second name.")
      return
    }
    if (!phoneNumber.trim()) {
      setError("Enter your phone number.")
      return
    }
    if (!displayRole.trim()) {
      setError("Choose or type your role.")
      return
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.")
      return
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }
    void joinWorkspace()
  }

  const joinWorkspace = async () => {
    setIsJoining(true)
    setError("")
    try {
      const response = await fetch(`/api/invitations/${token}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          avatarUrl,
          phoneCountry,
          phoneCountryCode: selectedPhoneCountry?.dialCode ?? "",
          phoneNumber: phoneNumber.trim(),
          country,
          jobRole: displayRole.trim(),
          password,
        }),
      })
      const payload = (await response.json()) as {
        data?: { signInUrl?: string }
        error?: { message?: string }
      }
      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Unable to join workspace.")
      }

      const inviteEmail = invite?.email ?? ""
      const signInResponse = await fetch("/api/auth/sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, password }),
      })
      const signInPayload = (await signInResponse.json().catch(() => null)) as
        | {
            data?: {
              success?: boolean
              user?: { id: string; email: string; full_name: string | null }
            }
          }
        | null

      if (signInResponse.ok && signInPayload?.data?.user) {
        localStorage.setItem("atmet_user", JSON.stringify(signInPayload.data.user))
      }

      setSignInUrl(payload.data?.signInUrl ?? `/sign-in?email=${encodeURIComponent(invite?.email ?? "")}`)
      setStep("done")
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to join workspace.")
    } finally {
      setIsJoining(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-80 items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading invitation
      </div>
    )
  }

  if (!invite || !workspace) {
    return (
      <div className="w-full max-w-md space-y-4 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Invitation unavailable
        </h1>
        <p className="text-sm text-muted-foreground">
          {error || "This invitation is invalid or expired."}
        </p>
        <Button render={<Link href="/sign-in" />}>
          Back to sign in
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-xl space-y-8">
      <div className="flex items-center gap-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <div
            key={index}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors duration-300",
              index === 0 || step !== "join" ? "bg-foreground" : "bg-border"
            )}
          />
        ))}
      </div>

      {step === "join" ? (
        <div className="mx-auto max-w-sm space-y-8 text-center">
          <div className="mx-auto flex size-16 items-center justify-center overflow-hidden rounded-xl border border-border/80 bg-sidebar-accent text-base font-semibold text-foreground shadow-sm">
            {workspace.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={workspace.avatar_url} alt={workspace.name} className="size-full object-cover" />
            ) : (
              initials(workspace.name)
            )}
          </div>
          <div className="space-y-1.5">
            <h1 className="text-balance text-2xl font-semibold tracking-tight text-foreground">
              Join {workspace.name}
            </h1>
            <p className="text-pretty text-sm text-muted-foreground">
              {inviter?.full_name || inviter?.email || "A teammate"} invited you to this workspace.
            </p>
          </div>
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
          <Button
            type="button"
            size="sm"
            data-auth-primary-action="true"
            className="w-full transition-transform active:scale-[0.96]"
            onClick={() => {
              setError("")
              setStep("profile")
            }}
          >
            Join workspace
            <Kbd className="h-4 rounded-[calc(min(var(--radius-md),12px)*4/7)] border-transparent bg-primary-foreground/15 px-1 text-[10px] text-primary-foreground">
              <CornerDownLeft className="h-2.5 w-2.5" />
            </Kbd>
          </Button>
        </div>
      ) : null}

      {step === "profile" ? (
        <div className="space-y-8">
          <div className="space-y-1.5 text-center">
            <h1 className="text-balance text-2xl font-semibold tracking-tight text-foreground">
              Complete your profile
            </h1>
            <p className="text-pretty text-sm text-muted-foreground">
              You were invited as {invite.email}.
            </p>
          </div>

          <div className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0]
                event.currentTarget.value = ""
                if (file) void uploadAvatar(file)
              }}
            />
            <div className="flex items-center gap-3">
              <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/80 bg-sidebar-accent text-sm font-semibold text-muted-foreground shadow-sm">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="Profile avatar" className="size-full object-cover" />
                ) : isUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  firstName || lastName ? initials(`${firstName} ${lastName}`) : "U"
                )}
              </div>
              <div className="min-w-0 flex-1">
                <Label className="text-muted-foreground">Profile image</Label>
                <p className="mt-0.5 text-xs text-muted-foreground">Optional image</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
                aria-label="Upload profile image"
                className="shrink-0"
              >
                {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1.5">
                <Label className="text-muted-foreground">First name</Label>
                <Input value={firstName} onChange={(event) => setFirstName(event.target.value)} />
              </label>
              <label className="space-y-1.5">
                <Label className="text-muted-foreground">Second name</Label>
                <Input value={lastName} onChange={(event) => setLastName(event.target.value)} />
              </label>
            </div>

            <div className="space-y-1.5">
              <Label className="text-muted-foreground">Phone</Label>
              <div className="grid grid-cols-[minmax(9rem,0.9fr)_minmax(0,1.1fr)] gap-2">
                <PlatformSelect
                  value={phoneCountry}
                  options={phoneCountries.map((country) => ({
                    value: country.value,
                    label: `${country.flag} ${country.dialCode}`,
                  }))}
                  placeholder="Code"
                  searchable
                  searchPlaceholder="Search country..."
                  onChange={setPhoneCountry}
                />
                <Input
                  type="tel"
                  value={phoneNumber}
                  onChange={(event) => setPhoneNumber(event.target.value)}
                  placeholder="Phone number"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-muted-foreground">Country</Label>
              <PlatformSelect
                value={country}
                options={countries.map((country) => ({
                  value: country.value,
                  label: `${country.flag} ${country.label}`,
                }))}
                placeholder="Choose country"
                searchable
                searchPlaceholder="Search country..."
                onChange={setCountry}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-muted-foreground">Role</Label>
              <PlatformSelect
                value={role}
                options={roleOptions.map((option) => ({
                  value: option,
                  label: option,
                }))}
                placeholder="Choose role"
                onChange={setRole}
              />
              {role === "Other" ? (
                <Input
                  value={customRole}
                  onChange={(event) => setCustomRole(event.target.value)}
                  placeholder="Type your role"
                />
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label className="text-muted-foreground">Password</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Create a password"
                  className="pr-8"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((previous) => !previous)}
                  className="absolute top-1/2 right-0 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-muted-foreground">Confirm password</Label>
              <div className="relative">
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Confirm password"
                  className="pr-8"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((previous) => !previous)}
                  className="absolute top-1/2 right-0 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {error ? <p className="text-xs text-destructive">{error}</p> : null}

          <Button
            type="button"
            size="sm"
            data-auth-primary-action="true"
            className="w-full transition-transform active:scale-[0.96]"
            onClick={completeProfileAndJoin}
            disabled={isJoining || isUploading}
          >
            {isJoining ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Complete profile
            <Kbd className="h-4 rounded-[calc(min(var(--radius-md),12px)*4/7)] border-transparent bg-primary-foreground/15 px-1 text-[10px] text-primary-foreground">
              <CornerDownLeft className="h-2.5 w-2.5" />
            </Kbd>
          </Button>
        </div>
      ) : null}

      {step === "done" ? (
        <div className="space-y-8 text-center">
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Check className="h-8 w-8 text-primary" strokeWidth={2.5} />
            </div>
          </div>
          <div className="space-y-1.5">
            <h1 className="text-balance text-2xl font-semibold tracking-tight text-foreground">
              You joined {workspace.name}
            </h1>
            <p className="text-pretty text-sm text-muted-foreground">
              Your account is ready.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            data-auth-primary-action="true"
            className="w-full transition-transform active:scale-[0.96]"
            onClick={() => router.replace("/ai-core")}
          >
            Open Atmet
          </Button>
          <Link href={signInUrl} className="block text-xs text-muted-foreground hover:text-foreground hover:underline">
            Use sign in instead
          </Link>
        </div>
      ) : null}
    </div>
  )
}
