"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import { AnimatePresence, motion } from "motion/react"
import { CornerDownLeft, Eye, EyeOff, Loader2 } from "lucide-react"
import { useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Kbd } from "@/components/ui/kbd"
import { Label } from "@/components/ui/label"

type SignInErrors = {
  email?: string
  password?: string
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export default function SignInPage() {
  const router = useRouter()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [passwordStepVisible, setPasswordStepVisible] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isResendingVerification, setIsResendingVerification] = useState(false)
  const [errors, setErrors] = useState<SignInErrors>({})
  const [toast, setToast] = useState<string | null>(null)
  const passwordInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!passwordStepVisible) return
    passwordInputRef.current?.focus()
  }, [passwordStepVisible])

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

  const validate = (): SignInErrors => {
    const nextErrors = validateEmail()

    if (!password) {
      nextErrors.password = "Password is required"
    }

    return nextErrors
  }

  const handleContinue = () => {
    const validationErrors = validateEmail()
    setErrors(validationErrors)

    if (Object.keys(validationErrors).length > 0) return
    setPasswordStepVisible(true)
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

  const handleSubmit = async () => {
    if (isSubmitting) return

    const validationErrors = validate()
    setErrors(validationErrors)

    if (Object.keys(validationErrors).length > 0) {
      return
    }

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
        success?: boolean
        error?: string
        token?: string
        user?: {
          id: string
          name: string
          email: string
          role: string
        }
      }

      if (!response.ok) {
        if (payload.error === "invalid_credentials") {
          setErrors({ password: "Incorrect email or password" })
          return
        }

        if (payload.error === "unverified_email") {
          setErrors({
            email: "Please verify your email first.",
          })
          return
        }

        showToast("Something went wrong. Please try again.")
        return
      }

      if (!payload.success || !payload.token || !payload.user) {
        showToast("Something went wrong. Please try again.")
        return
      }

      localStorage.setItem("atmet_token", payload.token)
      localStorage.setItem("atmet_user", JSON.stringify(payload.user))
      router.push("/onboarding")
    } catch {
      showToast("Something went wrong. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <div className="mx-auto w-full max-w-sm">
        <div className="text-center">
          <h1 className="text-balance text-2xl font-semibold tracking-tight text-foreground">
            Welcome back
          </h1>
          <p className="mt-2 text-pretty text-sm text-muted-foreground">
            Sign in to continue to your Atmet workspace.
          </p>
        </div>

        <form
          className="mt-8 space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            if (passwordStepVisible) {
              void handleSubmit()
              return
            }
            handleContinue()
          }}
        >
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

          <AnimatePresence initial={false}>
            {passwordStepVisible ? (
              <motion.div
                key="password-step"
                initial={{ height: 0, opacity: 0, y: -8 }}
                animate={{ height: "auto", opacity: 1, y: 0 }}
                exit={{ height: 0, opacity: 0, y: -4 }}
                transition={{ type: "spring", duration: 0.3, bounce: 0 }}
                className="overflow-hidden"
              >
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
              </motion.div>
            ) : null}
          </AnimatePresence>

          <Button
            type="submit"
            size="sm"
            data-auth-primary-action="true"
            className="mt-2 w-full transition-transform active:scale-[0.96]"
            disabled={isSubmitting}
          >
            {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            <span>{passwordStepVisible ? "Sign in" : "Continue"}</span>
            <Kbd className="h-4 rounded-[calc(min(var(--radius-md),12px)*4/7)] border-transparent bg-primary-foreground/15 px-1 text-[10px] text-primary-foreground">
              <CornerDownLeft className="h-2.5 w-2.5" />
            </Kbd>
          </Button>

        </form>
      </div>

      {toast ? (
        <div className="fixed right-4 bottom-4 z-[120] rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground shadow-lg">
          {toast}
        </div>
      ) : null}
    </>
  )
}
