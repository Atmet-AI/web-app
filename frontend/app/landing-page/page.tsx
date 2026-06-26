import Image from "next/image"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { BackgroundRippleEffect } from "@/components/ui/background-ripple-effect"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Badge } from "@/registry/spell-ui/badge"

export default function LandingPage() {
  return (
    <main className="dark fixed inset-0 z-[90] flex min-h-svh flex-col overflow-hidden bg-black text-white">
      <BackgroundRippleEffect />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgb(0_0_0_/_0.08)_42%,rgb(0_0_0_/_0.74)_100%)]"
        aria-hidden="true"
      />

      <section className="pointer-events-none relative z-10 flex min-h-0 flex-1 flex-col px-5 py-5 sm:px-8 sm:py-6">
        <header className="flex h-10 shrink-0 items-center justify-center">
          <Link
            href="/landing-page"
            aria-label="Atmet landing page"
            className="pointer-events-auto inline-flex items-center"
          >
            <Image
              src="/Logos/Atmet%20Darkmode.png"
              alt="Atmet"
              width={1781}
              height={337}
              priority
              className="h-5 w-auto object-contain"
            />
          </Link>
        </header>

        <div className="pointer-events-none mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center pb-10 text-center">
          <Badge
            variant="blue"
            size="sm"
            className="landing-dark-blue-badge mb-4"
          >
            Early access v0.1.3 alpha version
          </Badge>

          <h1 className="max-w-3xl text-3xl leading-tight font-semibold tracking-normal text-balance text-white sm:text-4xl">
            Your AI Coworker{" "}
            <Badge
              variant="blue"
              className="landing-dark-blue-badge landing-headline-badge mx-1 align-middle"
            >
              Agent
            </Badge>{" "}
            that automates your business workflow. For any type of business.
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-pretty text-white/60">
            Connect your apps, use model skills, record your tasks, talk to the
            AI and it&apos;s ready.
          </p>

          <Link
            href="/waitlist"
            data-auth-primary-action="true"
            className={cn(
              buttonVariants({ size: "sm" }),
              "pointer-events-auto mt-7 bg-primary text-primary-foreground hover:bg-primary/90"
            )}
          >
            <span>Join the waitlist</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </main>
  )
}
