"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { AnimatePresence, motion } from "motion/react"
import { ArrowLeft, Check, CornerDownLeft, Eye, EyeOff, Loader2 } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Kbd } from "@/components/ui/kbd"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"

type ResetErrors = {
  link?: string
  password?: string
  confirmPassword?: string
}

export default function ResetPasswordPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isPreparing, setIsPreparing] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [errors, setErrors] = useState<ResetErrors>({})

  useEffect(() => {
    let cancelled = false

    const prepareSession = async () => {
      const url = new URL(window.location.href)
      const code = url.searchParams.get("code")
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""))
      const linkError =
        url.searchParams.get("error_description") ??
        url.searchParams.get("error") ??
        hashParams.get("error_description") ??
        hashParams.get("error")
      const accessToken = hashParams.get("access_token")
      const refreshToken = hashParams.get("refresh_token")

      if (linkError) {
        setErrors({ link: linkError })
        setIsPreparing(false)
        return
      }

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!cancelled && error) {
          setErrors({ link: "This password setup link is invalid or has expired." })
        }
        if (!cancelled) setIsPreparing(false)
        return
      }

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })
        if (!cancelled && error) {
          setErrors({ link: "This password setup link is invalid or has expired." })
        }
        if (!cancelled && !error) {
          window.history.replaceState(null, "", "/reset-password")
        }
        if (!cancelled) setIsPreparing(false)
        return
      }

      const { data } = await supabase.auth.getSession()
      if (!cancelled && !data.session) {
        setErrors({ link: "Open the temporary link from your email to create a password." })
      }
      if (!cancelled) setIsPreparing(false)
    }

    void prepareSession()

    return () => {
      cancelled = true
    }
  }, [supabase])

  const validate = () => {
    const nextErrors: ResetErrors = {}

    if (password.length < 8) {
      nextErrors.password = "Password must be at least 8 characters"
    }

    if (confirmPassword !== password) {
      nextErrors.confirmPassword = "Passwords do not match"
    }

    return nextErrors
  }

  const handleSubmit = async () => {
    if (isSubmitting) return

    const validationErrors = validate()
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) return

    setIsSubmitting(true)
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      })
      const payload = (await response.json()) as { error?: { message: string } }

      if (!response.ok) {
        setErrors({ password: payload.error?.message ?? "Unable to save password." })
        return
      }

      setIsComplete(true)
      window.setTimeout(() => router.replace("/sign-in"), 1800)
    } catch {
      setErrors({ password: "Something went wrong. Please try again." })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-sm">
      <AnimatePresence initial={false} mode="wait">
        {isComplete ? (
          <motion.div
            key="complete"
            initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -4, filter: "blur(4px)" }}
            transition={{ type: "spring", duration: 0.3, bounce: 0 }}
            className="text-center"
          >
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Check className="h-4 w-4" />
            </div>
            <h1 className="mt-5 text-balance text-2xl font-semibold tracking-tight text-foreground">
              Password created
            </h1>
            <p className="mt-2 text-pretty text-sm text-muted-foreground">
              You can now sign in to your Atmet workspace.
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -4, filter: "blur(4px)" }}
            transition={{ type: "spring", duration: 0.3, bounce: 0 }}
          >
            <div className="text-center">
              <h1 className="text-balance text-2xl font-semibold tracking-tight text-foreground">
                Create your password
              </h1>
              <p className="mt-2 text-pretty text-sm text-muted-foreground">
                Use the temporary link from your email to finish setting up your account.
              </p>
            </div>

            {isPreparing ? (
              <div className="mt-8 flex justify-center">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : errors.link ? (
              <div className="mt-8 text-center">
                <p className="text-sm text-destructive">{errors.link}</p>
                <Link
                  href="/sign-in"
                  className="mt-5 inline-flex min-h-10 items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:underline"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to sign in
                </Link>
              </div>
            ) : (
              <form
                className="mt-8 space-y-4"
                onSubmit={(event) => {
                  event.preventDefault()
                  void handleSubmit()
                }}
              >
                <div className="space-y-1.5">
                  <Label htmlFor="reset-password" className="text-muted-foreground">
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="reset-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(event) => {
                        setPassword(event.target.value)
                        setErrors((previous) => ({ ...previous, password: undefined }))
                      }}
                      placeholder="Create a password"
                      className="pr-8"
                      aria-invalid={Boolean(errors.password)}
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((previous) => !previous)}
                      className="absolute top-1/2 right-0 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      disabled={isSubmitting}
                    >
                      {showPassword ? (
                        <EyeOff className="h-3.5 w-3.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                  {errors.password ? (
                    <p className="text-xs text-destructive">{errors.password}</p>
                  ) : null}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="reset-confirm-password" className="text-muted-foreground">
                    Confirm password
                  </Label>
                  <div className="relative">
                    <Input
                      id="reset-confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(event) => {
                        setConfirmPassword(event.target.value)
                        setErrors((previous) => ({ ...previous, confirmPassword: undefined }))
                      }}
                      placeholder="Confirm your password"
                      className="pr-8"
                      aria-invalid={Boolean(errors.confirmPassword)}
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((previous) => !previous)}
                      className="absolute top-1/2 right-0 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                      disabled={isSubmitting}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-3.5 w-3.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                  {errors.confirmPassword ? (
                    <p className="text-xs text-destructive">{errors.confirmPassword}</p>
                  ) : null}
                </div>

                <Button
                  type="submit"
                  size="sm"
                  data-auth-primary-action="true"
                  className="w-full transition-transform active:scale-[0.96]"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  <span>Create password</span>
                  <Kbd className="h-4 rounded-[calc(min(var(--radius-md),12px)*4/7)] border-transparent bg-primary-foreground/15 px-1 text-[10px] text-primary-foreground">
                    <CornerDownLeft className="h-2.5 w-2.5" />
                  </Kbd>
                </Button>
              </form>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
