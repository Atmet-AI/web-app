'use client'

import { HowItWorks } from "@/app/(marketing)/(home)/sections/how-it-works"
import { PlatformFeatures } from "@/app/(marketing)/(home)/sections/platform-features"
import { StatsSection } from "@/app/(marketing)/(home)/sections/stats-section"
import { CallToAction } from "@/components/call-to-action"
import FooterSection from "@/components/footer"
import Header from "@/components/header"
import { HeroIllustration } from "@/components/illustrations/hero-illustration"
import { LandingPageProvider, useLandingPage } from "@/components/landing-page-context"
import { LogoCloud } from "@/components/logo-cloud"
import { cn } from "@/lib/utils"

const dividerPatterns = [
  "bg-[linear-gradient(135deg,transparent_44%,rgb(0_0_0/0.16)_45%,rgb(0_0_0/0.16)_51%,transparent_52%)] bg-[length:20px_20px] dark:bg-[linear-gradient(135deg,transparent_44%,rgb(255_255_255/0.14)_45%,rgb(255_255_255/0.14)_51%,transparent_52%)]",
  "bg-[radial-gradient(circle,rgb(0_0_0/0.18)_1.15px,transparent_1.2px)] bg-[length:14px_14px] dark:bg-[radial-gradient(circle,rgb(255_255_255/0.16)_1.15px,transparent_1.2px)]",
  "bg-[linear-gradient(rgb(0_0_0/0.10)_1px,transparent_1px),linear-gradient(90deg,rgb(0_0_0/0.10)_1px,transparent_1px)] bg-[length:18px_18px] dark:bg-[linear-gradient(rgb(255_255_255/0.10)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255/0.10)_1px,transparent_1px)]",
  "bg-[linear-gradient(45deg,transparent_46%,rgb(0_0_0/0.11)_47%,rgb(0_0_0/0.11)_53%,transparent_54%),linear-gradient(135deg,transparent_46%,rgb(0_0_0/0.11)_47%,rgb(0_0_0/0.11)_53%,transparent_54%)] bg-[length:24px_24px] dark:bg-[linear-gradient(45deg,transparent_46%,rgb(255_255_255/0.10)_47%,rgb(255_255_255/0.10)_53%,transparent_54%),linear-gradient(135deg,transparent_46%,rgb(255_255_255/0.10)_47%,rgb(255_255_255/0.10)_53%,transparent_54%)]",
  "bg-[linear-gradient(90deg,transparent_46%,rgb(0_0_0/0.14)_47%,rgb(0_0_0/0.14)_53%,transparent_54%)] bg-[length:16px_16px] dark:bg-[linear-gradient(90deg,transparent_46%,rgb(255_255_255/0.12)_47%,rgb(255_255_255/0.12)_53%,transparent_54%)]",
]

function SectionDivider({ variant = 0 }: { variant?: number }) {
  return (
    <div aria-hidden="true" className="relative h-14 w-full overflow-hidden">
      <div
        className={cn(
          "absolute inset-y-px left-1/2 w-[min(calc(100vw_-_3rem),75rem)] -translate-x-1/2 [mask-image:linear-gradient(90deg,transparent,black_8%,black_92%,transparent)]",
          dividerPatterns[variant % dividerPatterns.length]
        )}
      />
      <div className="absolute inset-x-0 top-0 border-t border-border/75" />
      <div className="absolute inset-x-0 bottom-0 border-t border-border/65" />
    </div>
  )
}

export default function LandingPage() {
  return (
    <LandingPageProvider>
      <LandingPageContent />
    </LandingPageProvider>
  )
}

function LandingPageContent() {
  const { theme, language, dir, t } = useLandingPage()

  return (
    <div
      lang={language}
      dir={dir}
      className={cn(
        theme === "dark" && "dark",
        language === "ar" && "font-arabic-ibm",
        "fixed inset-0 z-[90] overflow-y-auto bg-background text-foreground [scrollbar-gutter:stable_both-edges]"
      )}>
      <Header />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-y-0 left-1/2 z-10 hidden w-[min(calc(100vw_-_3rem),75rem)] -translate-x-1/2 border-x border-border/70 lg:block"
      />
      <main role="main" className="bg-background">
        <section className="relative overflow-hidden bg-background">
          <div className="flex min-h-[calc(100svh-3.5rem)] flex-col pt-24 md:pt-32 lg:pt-40">
            <div className="relative z-10 mx-auto grid max-w-5xl place-items-center gap-4 px-6 text-center">
              <div>
                <h1 className={cn("mx-auto max-w-4xl text-balance text-5xl font-semibold tracking-normal lg:text-6xl", language === "ar" && "font-thmanyah-serif-display !leading-[1.28] lg:!leading-[1.24]")}>
                  {t.hero.titleStart}{" "}
                  <span className={cn(language === "en" ? "font-redaction-35-italic" : "font-thmanyah-serif-display !leading-[1.28] lg:!leading-[1.24]", "text-foreground")}>
                    {t.hero.titleAccent}
                  </span>
                </h1>
              </div>
              <div className="mx-auto max-w-xl">
                <p className="mb-6 text-balance text-lg text-muted-foreground lg:text-xl">
                  {t.hero.subtitle}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <a
                    href="/waitlist"
                    data-cuelume-press
                    data-auth-primary-action="true"
                    className="inline-flex h-7 w-[6.75rem] items-center justify-center whitespace-nowrap rounded-[min(var(--radius-md),12px)] border border-transparent bg-primary px-2 text-[0.8rem] font-medium text-primary-foreground transition-all hover:bg-primary/90 active:translate-y-px active:scale-[0.96]"
                  >
                    {t.hero.waitlist}
                  </a>
                  <a
                    href="https://app.atmetai.com/sign-in"
                    className="inline-flex h-7 w-[6.75rem] items-center justify-center whitespace-nowrap rounded-[min(var(--radius-md),12px)] bg-muted px-2 text-[0.8rem] font-medium text-foreground transition-colors hover:bg-muted/75"
                  >
                    {t.hero.openApp}
                  </a>
                </div>
              </div>
            </div>
            <HeroIllustration />
          </div>
        </section>
        <SectionDivider variant={0} />
        <LogoCloud />
        <SectionDivider variant={1} />
        <HowItWorks />
        <SectionDivider variant={2} />
        <PlatformFeatures />
        <SectionDivider variant={3} />
        <StatsSection />
        <SectionDivider variant={4} />
        <CallToAction />
      </main>
      <FooterSection />
    </div>
  )
}
