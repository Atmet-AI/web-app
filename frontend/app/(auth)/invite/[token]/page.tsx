"use client"

import * as React from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Camera, Check, CornerDownLeft, Loader2, Upload } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Kbd } from "@/components/ui/kbd"
import { PlatformSelect } from "@/components/platform-select"
import { countries } from "@/lib/countries"
import { phoneCountries } from "@/lib/phone-countries"

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
  const params = useParams<{ token: string }>()
  const token = params.token
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [invite, setInvite] = React.useState<InvitePayload | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isUploading, setIsUploading] = React.useState(false)
  const [isJoining, setIsJoining] = React.useState(false)
  const [step, setStep] = React.useState<"profile" | "join" | "done">("profile")
  const [error, setError] = React.useState("")
  const [firstName, setFirstName] = React.useState("")
  const [lastName, setLastName] = React.useState("")
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null)
  const [phoneCountry, setPhoneCountry] = React.useState("US")
  const selectedPhoneCountry =
    phoneCountries.find((country) => country.value === phoneCountry) ??
    phoneCountries[0]
  const [phoneNumber, setPhoneNumber] = React.useState("")
  const [role, setRole] = React.useState<(typeof roleOptions)[number] | string>("")
  const [customRole, setCustomRole] = React.useState("")
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

  const goToJoinStep = () => {
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
    setError("")
    setStep("join")
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
          jobRole: displayRole.trim(),
        }),
      })
      const payload = (await response.json()) as {
        data?: { signInUrl?: string }
        error?: { message?: string }
      }
      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Unable to join workspace.")
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
    <div className="w-full max-w-xl space-y-8">
      <div className="grid grid-cols-2 gap-2">
        <div className="h-1 rounded-full bg-foreground" />
        <div className={`h-1 rounded-full ${step === "profile" ? "bg-muted" : "bg-foreground"}`} />
      </div>

      {step === "profile" ? (
        <div className="space-y-7">
          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              Complete your profile
            </h1>
            <p className="text-sm text-muted-foreground">
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
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/80 bg-sidebar-accent text-sm font-semibold text-muted-foreground shadow-sm"
                aria-label="Upload avatar"
              >
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="Profile avatar" className="size-full object-cover" />
                ) : isUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </button>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">Profile image</p>
                <p className="text-xs text-muted-foreground">Optional image</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
                aria-label="Upload profile image"
              >
                <Upload className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1.5">
                <Label>First name</Label>
                <Input value={firstName} onChange={(event) => setFirstName(event.target.value)} className="h-8" />
              </label>
              <label className="space-y-1.5">
                <Label>Second name</Label>
                <Input value={lastName} onChange={(event) => setLastName(event.target.value)} className="h-8" />
              </label>
            </div>

            <div className="space-y-1.5">
              <Label>Phone</Label>
              <div className="grid gap-2 sm:grid-cols-[minmax(0,12rem)_1fr]">
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
                  className="h-8"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Country</Label>
              <PlatformSelect
                value={phoneCountry}
                options={countries.map((country) => ({
                  value: country.value,
                  label: `${country.flag} ${country.label}`,
                }))}
                placeholder="Choose country"
                searchable
                searchPlaceholder="Search country..."
                onChange={setPhoneCountry}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Role</Label>
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
                  className="h-8"
                />
              ) : null}
            </div>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <Button type="button" className="w-full" onClick={goToJoinStep}>
            Continue
            <Kbd><CornerDownLeft /></Kbd>
          </Button>
        </div>
      ) : null}

      {step === "join" ? (
        <div className="space-y-7 text-center">
          <div className="mx-auto flex size-20 items-center justify-center overflow-hidden rounded-2xl border border-border bg-sidebar-accent text-lg font-semibold text-foreground">
            {workspace.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={workspace.avatar_url} alt={workspace.name} className="size-full object-cover" />
            ) : (
              initials(workspace.name)
            )}
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              Join {workspace.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              {inviter?.full_name || inviter?.email || "A teammate"} invited you to this workspace.
            </p>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setStep("profile")}>
              Back
            </Button>
            <Button type="button" className="flex-1" disabled={isJoining} onClick={() => void joinWorkspace()}>
              {isJoining ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Join workspace
            </Button>
          </div>
        </div>
      ) : null}

      {step === "done" ? (
        <div className="space-y-6 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500">
            <Check className="h-5 w-5" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              You joined {workspace.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              Sign in with {invite.email} to finish setting your password.
            </p>
          </div>
          <Button render={<Link href={signInUrl} />} className="w-full">
            Continue to sign in
          </Button>
        </div>
      ) : null}
    </div>
  )
}
