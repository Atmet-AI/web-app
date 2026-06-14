import Link from "next/link"
import Image from "next/image"

import { AuthModeSwitch } from "@/components/auth-mode-switch"
import { AuthPageTransition } from "@/components/auth-page-transition"

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="fixed inset-0 z-[90] grid min-h-0 bg-sidebar p-2 dark:bg-black lg:grid-cols-2">
      <section
        data-auth-scope="true"
        className="relative flex min-h-0 flex-col rounded-2xl bg-background px-6 py-6 dark:bg-sidebar sm:px-10 sm:py-8 lg:px-16"
      >
        <header className="flex shrink-0 justify-center">
          <Link
            href="/"
            aria-label="Atmet home"
            className="group inline-flex min-h-10 items-center rounded-lg px-2"
          >
            <Image
              src="/Logos/Atmet%20Whitemode.png"
              alt="Atmet"
              width={1781}
              height={337}
              priority
              className="h-5 w-auto object-contain opacity-55 transition-opacity duration-200 group-hover:opacity-100 dark:hidden"
            />
            <Image
              src="/Logos/Atmet%20Darkmode.png"
              alt="Atmet"
              width={1781}
              height={337}
              priority
              className="hidden h-5 w-auto object-contain opacity-55 transition-opacity duration-200 group-hover:opacity-100 dark:block"
            />
          </Link>
        </header>

        <main className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto py-16">
          <AuthPageTransition>{children}</AuthPageTransition>
        </main>

        <AuthModeSwitch />
      </section>

      <aside aria-hidden="true" className="hidden bg-sidebar dark:bg-black lg:block" />
    </div>
  )
}
