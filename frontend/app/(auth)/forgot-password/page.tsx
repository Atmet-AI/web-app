"use client"

import Link from "next/link"
import { AnimatePresence, motion } from "motion/react"
import { ArrowLeft, Check, CornerDownLeft, Loader2 } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Kbd } from "@/components/ui/kbd"
import { Label } from "@/components/ui/label"

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = async () => {
    if (!email.trim()) {
      setError("Email is required")
      return
    }
    if (!isValidEmail(email)) {
      setError("Please enter a valid email address")
      return
    }
    if (isSubmitting) return

    setIsSubmitting(true)
    await new Promise((resolve) => window.setTimeout(resolve, 500))
    setIsSubmitting(false)
    setIsSubmitted(true)
  }

  return (
    <div className="mx-auto w-full max-w-sm">
      <AnimatePresence initial={false} mode="wait">
        {isSubmitted ? (
          <motion.div
            key="sent"
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
              Check your inbox
            </h1>
            <p className="mt-2 text-pretty text-sm text-muted-foreground">
              If an account exists for {email}, we&apos;ve sent password reset instructions.
            </p>
            <Link
              href="/sign-in"
              className="mt-6 inline-flex min-h-10 items-center gap-1.5 text-sm font-medium text-foreground hover:underline"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to sign in
            </Link>
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
                Reset your password
              </h1>
              <p className="mt-2 text-pretty text-sm text-muted-foreground">
                Enter your work email and we&apos;ll send you reset instructions.
              </p>
            </div>

            <form
              className="mt-8 space-y-4"
              onSubmit={(event) => {
                event.preventDefault()
                void handleSubmit()
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="forgot-password-email" className="text-muted-foreground">
                  Email
                </Label>
                <Input
                  id="forgot-password-email"
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value)
                    setError("")
                  }}
                  placeholder="you@company.com"
                  aria-invalid={Boolean(error)}
                  disabled={isSubmitting}
                />
                {error ? <p className="text-xs text-destructive">{error}</p> : null}
              </div>

              <Button
                type="submit"
                size="sm"
                data-auth-primary-action="true"
                className="w-full transition-transform active:scale-[0.96]"
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                <span>Send reset instructions</span>
                <Kbd className="h-4 rounded-[calc(min(var(--radius-md),12px)*4/7)] border-transparent bg-primary-foreground/15 px-1 text-[10px] text-primary-foreground">
                  <CornerDownLeft className="h-2.5 w-2.5" />
                </Kbd>
              </Button>
            </form>

            <div className="mt-5 text-center">
              <Link
                href="/sign-in"
                className="inline-flex min-h-10 items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:underline"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to sign in
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
