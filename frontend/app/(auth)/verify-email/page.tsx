"use client"

import Link from "next/link"
import { Mail, Loader2 } from "lucide-react"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"

const RESEND_COOLDOWN_SECONDS = 60

export default function VerifyEmailPage() {
  const [email, setEmail] = useState("")
  const [cooldown, setCooldown] = useState(0)
  const [isResending, setIsResending] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (message: string) => {
    setToast(message)
    window.setTimeout(() => {
      setToast((previous) => (previous === message ? null : previous))
    }, 2800)
  }

  useEffect(() => {
    const pendingEmail = sessionStorage.getItem("pendingVerification") ?? ""
    setEmail(pendingEmail)
  }, [])

  useEffect(() => {
    if (cooldown <= 0) return

    const timer = window.setInterval(() => {
      setCooldown((previous) => {
        if (previous <= 1) {
          window.clearInterval(timer)
          return 0
        }
        return previous - 1
      })
    }, 1000)

    return () => window.clearInterval(timer)
  }, [cooldown])

  const resendVerification = async () => {
    if (isResending || cooldown > 0) return

    setIsResending(true)

    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      if (!response.ok) {
        showToast("Something went wrong. Please try again.")
        return
      }

      setCooldown(RESEND_COOLDOWN_SECONDS)
      showToast("Verification email sent")
    } catch {
      showToast("Something went wrong. Please try again.")
    } finally {
      setIsResending(false)
    }
  }

  return (
    <>
      <div
        className="rounded-xl border border-border bg-background p-5 shadow-sm"
        style={{ borderWidth: "0.5px" }}
      >
        <div className="mb-3 flex justify-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Mail className="h-6 w-6" />
          </span>
        </div>

        <h1 className="text-center text-sm font-semibold text-foreground">Check your email</h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          We sent a verification link to
        </p>
        <p className="mt-0.5 break-all text-center text-sm font-medium text-foreground">
          {email || "your email address"}
        </p>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Click the link in the email to verify your account and get started.
        </p>

        <div className="my-4 h-px bg-border" />

        <div className="space-y-2">
          <p className="text-center text-xs text-muted-foreground">Didn&apos;t receive the email?</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 w-full"
            onClick={() => {
              void resendVerification()
            }}
            disabled={cooldown > 0 || isResending}
          >
            {isResending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend verification email"}
          </Button>
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          <Link
            href="/sign-in"
            className="text-foreground hover:underline"
            onClick={() => {
              sessionStorage.removeItem("pendingVerification")
            }}
          >
            Return to sign in
          </Link>
        </p>
      </div>

      {toast ? (
        <div className="fixed right-4 bottom-4 z-[120] rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground shadow-lg">
          {toast}
        </div>
      ) : null}
    </>
  )
}
