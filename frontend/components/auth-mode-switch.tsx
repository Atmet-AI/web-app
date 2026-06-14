"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

export function AuthModeSwitch() {
  const pathname = usePathname()

  if (pathname !== "/sign-in" && pathname !== "/waitlist") {
    return null
  }

  const isWaitlist = pathname === "/waitlist"

  return (
    <p className="shrink-0 pb-1 text-center text-xs text-muted-foreground">
      {isWaitlist ? "Already have an account?" : "Don't have an account?"}{" "}
      <Link
        href={isWaitlist ? "/sign-in" : "/waitlist"}
        className="inline-flex min-h-10 items-center font-medium text-foreground underline-offset-4 hover:underline"
      >
        {isWaitlist ? "Sign in" : "Join the waitlist"}
      </Link>
    </p>
  )
}
