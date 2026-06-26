import Link from "next/link"
import Image from "next/image"

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-[90] flex min-h-0 flex-col bg-sidebar p-2 dark:bg-black">
      <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto rounded-2xl bg-background px-6 py-6 dark:bg-sidebar sm:px-10 sm:py-8">
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

        <main className="flex min-h-0 flex-1 items-center justify-center py-12">
          {children}
        </main>
      </div>
    </div>
  )
}
