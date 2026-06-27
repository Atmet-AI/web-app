"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import { AnimatePresence, motion } from "motion/react"
import { ArrowLeft, CornerDownLeft, Eye, EyeOff, Loader2 } from "lucide-react"
import { useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Kbd } from "@/components/ui/kbd"
import { Label } from "@/components/ui/label"

type AuthStep = "email" | "password" | "otp" | "create-password"

type SignInErrors = {
  email?: string
  password?: string
  otp?: string
  confirmPassword?: string
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export default function SignInPage() {
  const router = useRouter()

  const [step, setStep] = useState<AuthStep>("email")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [otp, setOtp] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isResendingVerification, setIsResendingVerification] = useState(false)
  const [errors, setErrors] = useState<SignInErrors>({})
  const [toast, setToast] = useState<string | null>(null)
  const passwordInputRef = useRef<HTMLInputElement>(null)
  const otpInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (step === "password") passwordInputRef.current?.focus()
    if (step === "otp") otpInputRef.current?.focus()
  }, [step])

  const showToast = (message: string) => {
    setToast(message)
    window.setTimeout(() => {
      setToast((previous) => (previous === message ? null : previous))
    }, 2800)
  }

  const validateEmail = (): SignInErrors => {
    const nextErrors: SignInErrors = {}

    if (!email.trim()) {
      nextErrors.email = "Email is required"
    } else if (!isValidEmail(email)) {
      nextErrors.email = "Please enter a valid email address"
    }

    return nextErrors
  }

  const handleContinue = async () => {
    if (isSubmitting) return

    const validationErrors = validateEmail()
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) return

    setIsSubmitting(true)
    try {
      const response = await fetch("/api/auth/sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      })

      const payload = (await response.json()) as {
        data?: { status?: "password_required" | "otp_sent" }
        error?: { message: string }
      }

      if (!response.ok) {
        setErrors({ email: payload.error?.message ?? "Something went wrong. Please try again." })
        return
      }

      if (payload.data?.status === "otp_sent") {
        setStep("otp")
        return
      }

      setStep("password")
    } catch {
      showToast("Something went wrong. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePasswordSignIn = async () => {
    if (isSubmitting) return

    const validationErrors = validateEmail()
    if (!password) validationErrors.password = "Password is required"
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) return

    setIsSubmitting(true)
    try {
      const response = await fetch("/api/auth/sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      })

      const payload = (await response.json()) as {
        data?: {
          success?: boolean
          user?: { id: string; email: string; full_name: string | null }
        }
        error?: { code: string; message: string }
      }

      if (!response.ok) {
        const code = payload.error?.code ?? ""
        if (code === "unauthorized") {
          setErrors({ password: "Incorrect email or password" })
          return
        }
        if (code === "forbidden") {
          setErrors({ email: "Please verify your email first." })
          return
        }
        showToast("Something went wrong. Please try again.")
        return
      }

      if (!payload.data?.success || !payload.data.user) {
        showToast("Something went wrong. Please try again.")
        return
      }

      localStorage.setItem("atmet_user", JSON.stringify(payload.data.user))
      router.replace("/ai-core")
    } catch {
      showToast("Something went wrong. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleVerifyOtp = async () => {
    if (isSubmitting) return

    const validationErrors = validateEmail()
    if (!otp.trim()) validationErrors.otp = "OTP is required"
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) return

    setIsSubmitting(true)
    try {
      const response = await fetch("/api/auth/sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          otp: otp.trim(),
        }),
      })

      const payload = (await response.json()) as {
        data?: {
          success?: boolean
          user?: { id: string; email: string; full_name: string | null }
        }
        error?: { message: string }
      }

      if (!response.ok) {
        setErrors({ otp: payload.error?.message ?? "Invalid or expired OTP." })
        return
      }

      if (!payload.data?.success || !payload.data.user) {
        showToast("Something went wrong. Please try again.")
        return
      }

      localStorage.setItem("atmet_user", JSON.stringify(payload.data.user))
      setStep("create-password")
    } catch {
      showToast("Something went wrong. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCreatePassword = async () => {
    if (isSubmitting) return

    const nextErrors: SignInErrors = {}
    if (newPassword.length < 8) {
      nextErrors.password = "Password must be at least 8 characters"
    }
    if (confirmPassword !== newPassword) {
      nextErrors.confirmPassword = "Passwords do not match"
    }
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setIsSubmitting(true)
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      })
      const payload = (await response.json()) as { error?: { message: string } }

      if (!response.ok) {
        setErrors({ password: payload.error?.message ?? "Unable to save password." })
        return
      }

      router.replace("/onboarding")
    } catch {
      showToast("Something went wrong. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResendVerification = async () => {
    if (isResendingVerification) return

    setIsResendingVerification(true)

    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      })

      if (!response.ok) {
        showToast("Something went wrong. Please try again.")
        return
      }

      showToast("Verification email sent")
    } catch {
      showToast("Something went wrong. Please try again.")
    } finally {
      setIsResendingVerification(false)
    }
  }

  const resetToEmail = () => {
    setStep("email")
    setPassword("")
    setOtp("")
    setNewPassword("")
    setConfirmPassword("")
    setErrors({})
  }

  return (
    <>
      <div className="mx-auto w-full max-w-sm">
        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -4, filter: "blur(4px)" }}
            transition={{ type: "spring", duration: 0.3, bounce: 0 }}
          >
            <div className="text-center">
              <h1 className="text-balance text-2xl font-semibold tracking-tight text-foreground">
                {step === "otp"
                  ? "Check your email"
                  : step === "create-password"
                    ? "Create your password"
                    : "Welcome back"}
              </h1>
              <p className="mt-2 text-pretty text-sm text-muted-foreground">
                {step === "otp"
                  ? `Enter the OTP sent to ${email}.`
                  : step === "create-password"
                    ? "Choose a password for future sign-ins."
                    : "Sign in to continue to your Atmet workspace."}
              </p>
            </div>

            <form
              className="mt-8 space-y-4"
              onSubmit={(event) => {
                event.preventDefault()
                if (step === "email") void handleContinue()
                if (step === "password") void handlePasswordSignIn()
                if (step === "otp") void handleVerifyOtp()
                if (step === "create-password") void handleCreatePassword()
              }}
            >
              {step === "email" || step === "password" ? (
                <div className="space-y-1.5">
                  <Label htmlFor="auth-signin-email" className="text-muted-foreground">
                    Email
                  </Label>
                  <Input
                    id="auth-signin-email"
                    type="email"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value)
                      setStep("email")
                      setPassword("")
                      setErrors((previous) => ({ ...previous, email: undefined }))
                    }}
                    placeholder="you@company.com"
                    disabled={isSubmitting}
                  />
                  {errors.email ? (
                    <p className="text-xs text-destructive">
                      {errors.email}{" "}
                      {errors.email.startsWith("Please verify your email first") ? (
                        <button
                          type="button"
                          onClick={() => {
                            void handleResendVerification()
                          }}
                          className="underline"
                          disabled={isResendingVerification || isSubmitting}
                        >
                          Resend verification email?
                        </button>
                      ) : null}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {step === "password" ? (
                <div className="space-y-1.5">
                  <Label htmlFor="auth-signin-password" className="text-muted-foreground">
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      ref={passwordInputRef}
                      id="auth-signin-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(event) => {
                        setPassword(event.target.value)
                        setErrors((previous) => ({ ...previous, password: undefined }))
                      }}
                      placeholder="Enter your password"
                      className="pr-8"
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
                  <div className="flex justify-end">
                    <Link
                      href="/forgot-password"
                      className="text-xs text-muted-foreground hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  {errors.password ? (
                    <p className="text-xs text-destructive">{errors.password}</p>
                  ) : null}
                </div>
              ) : null}

              {step === "otp" ? (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="auth-signin-otp" className="text-muted-foreground">
                      OTP
                    </Label>
                    <Input
                      ref={otpInputRef}
                      id="auth-signin-otp"
                      inputMode="numeric"
                      value={otp}
                      onChange={(event) => {
                        setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))
                        setErrors((previous) => ({ ...previous, otp: undefined }))
                      }}
                      placeholder="000000"
                      className="text-center font-mono tracking-[0.35em]"
                      disabled={isSubmitting}
                    />
                    {errors.otp ? (
                      <p className="text-xs text-destructive">{errors.otp}</p>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    className="inline-flex min-h-10 items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:underline"
                    onClick={resetToEmail}
                    disabled={isSubmitting}
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Use another email
                  </button>
                </>
              ) : null}

              {step === "create-password" ? (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="auth-new-password" className="text-muted-foreground">
                      Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="auth-new-password"
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(event) => {
                          setNewPassword(event.target.value)
                          setErrors((previous) => ({ ...previous, password: undefined }))
                        }}
                        placeholder="Create a password"
                        className="pr-8"
                        disabled={isSubmitting}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword((previous) => !previous)}
                        className="absolute top-1/2 right-0 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        aria-label={showNewPassword ? "Hide password" : "Show password"}
                        disabled={isSubmitting}
                      >
                        {showNewPassword ? (
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
                    <Label htmlFor="auth-confirm-password" className="text-muted-foreground">
                      Confirm password
                    </Label>
                    <div className="relative">
                      <Input
                        id="auth-confirm-password"
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(event) => {
                          setConfirmPassword(event.target.value)
                          setErrors((previous) => ({ ...previous, confirmPassword: undefined }))
                        }}
                        placeholder="Confirm your password"
                        className="pr-8"
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
                </>
              ) : null}

              <Button
                type="submit"
                size="sm"
                data-auth-primary-action="true"
                className="mt-2 w-full transition-transform active:scale-[0.96]"
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                <span>
                  {step === "password"
                    ? "Sign in"
                    : step === "otp"
                      ? "Verify OTP"
                      : step === "create-password"
                        ? "Create password"
                        : "Continue"}
                </span>
                <Kbd className="h-4 rounded-[calc(min(var(--radius-md),12px)*4/7)] border-transparent bg-primary-foreground/15 px-1 text-[10px] text-primary-foreground">
                  <CornerDownLeft className="h-2.5 w-2.5" />
                </Kbd>
              </Button>
            </form>
          </motion.div>
        </AnimatePresence>
      </div>

      {toast ? (
        <div className="fixed right-4 bottom-4 z-[120] rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground shadow-lg">
          {toast}
        </div>
      ) : null}
    </>
  )
}
