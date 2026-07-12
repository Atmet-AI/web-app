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

function SectionDivider() {
  return (
    <div aria-hidden="true" className="relative h-10 w-full">
      <div className="absolute inset-x-0 top-0 border-t border-border/70" />
      <div className="absolute inset-x-0 top-10 border-t border-border/55" />
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
        "fixed inset-0 z-[90] overflow-y-auto bg-background text-foreground"
      )}>
      <Header />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-y-0 left-1/2 z-10 hidden w-[min(calc(100%-3rem),75rem)] -translate-x-1/2 border-x border-border/70 lg:block"
      />
      <main role="main" className="bg-background">
        <section className="relative overflow-hidden bg-background">
          <div className="pb-14 pt-24 md:pt-32 lg:pt-48">
            <div className="relative z-10 mx-auto grid max-w-5xl items-end gap-4 px-6">
              <div>
                <h1 className="max-w-4xl text-balance text-5xl font-semibold tracking-normal lg:text-6xl">
                  {t.hero.titleStart}{" "}
                  <span className={cn(language === "en" ? "font-redaction-35-italic" : "font-arabic-ibm", "text-foreground")}>
                    {t.hero.titleAccent}
                  </span>
                </h1>
              </div>
              <div className="max-w-xl">
                <p className="mb-6 text-balance text-lg text-muted-foreground lg:text-xl">
                  {t.hero.subtitle}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href="/waitlist"
                    className="inline-flex h-8 items-center justify-center rounded-lg border border-transparent bg-primary px-2.5 text-[13px] font-semibold text-primary-foreground shadow-md shadow-black/15 ring-1 ring-primary/40 transition-colors hover:bg-primary/90"
                  >
                    {t.hero.waitlist}
                  </a>
                  <a
                    href="https://app.atmetai.com/sign-in"
                    className="inline-flex h-8 items-center justify-center rounded-lg bg-card px-2.5 text-[13px] font-semibold text-foreground shadow-sm shadow-black/15 transition-colors hover:bg-muted/50"
                  >
                    {t.hero.openApp}
                  </a>
                </div>
              </div>
            </div>
            <HeroIllustration />
          </div>
        </section>
        <SectionDivider />
        <LogoCloud />
        <SectionDivider />
        <HowItWorks />
        <SectionDivider />
        <PlatformFeatures />
        <SectionDivider />
        <StatsSection />
        <SectionDivider />
        <CallToAction />
      </main>
      <FooterSection />
    </div>
  )
}
