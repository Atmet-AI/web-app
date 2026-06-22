import Image from "next/image"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default function LandingPage() {
  return (
    <main className="fixed inset-0 z-[90] flex min-h-svh flex-col bg-black text-white">
      <section className="flex min-h-0 flex-1 flex-col px-5 py-5 sm:px-8 sm:py-6">
        <header className="flex h-10 shrink-0 items-center justify-between">
          <Link href="/landing-page" aria-label="Atmet landing page" className="inline-flex items-center">
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

        <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center pb-10 text-center">
          <p className="mb-4 text-xs font-medium uppercase text-white/45">
            Atmet is opening soon
          </p>
          <h1 className="max-w-3xl text-balance text-4xl font-semibold leading-[1.05] tracking-normal text-white sm:text-6xl">
            AI workspaces for teams that move faster than their tools.
          </h1>
          <p className="mt-5 max-w-2xl text-pretty text-sm leading-6 text-white/60 sm:text-base">
            Connect your apps, build intelligent workflows, and keep operational context in one
            focused workspace.
          </p>

          <Link
            href="/waitlist"
            className={cn(
              buttonVariants({ size: "lg" }),
              "mt-8 h-10 rounded-lg bg-white px-4 text-sm text-black hover:bg-white/90"
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
