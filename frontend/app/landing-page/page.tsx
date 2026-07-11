import { HowItWorks } from "@/app/(marketing)/(home)/sections/how-it-works"
import { MoreFeatures } from "@/app/(marketing)/(home)/sections/more-features"
import { PlatformFeatures } from "@/app/(marketing)/(home)/sections/platform-features"
import { StatsSection } from "@/app/(marketing)/(home)/sections/stats-section"
import { CallToAction } from "@/components/call-to-action"
import FooterSection from "@/components/footer"
import Header from "@/components/header"
import { HeroIllustration } from "@/components/illustrations/hero-illustration"
import { LogoCloud } from "@/components/logo-cloud"
import { TestimonialsSection } from "@/components/testimonials-section"

export default function LandingPage() {
  return (
    <div className="dark fixed inset-0 z-[90] overflow-y-auto bg-background text-foreground">
      <Header />
      <main role="main" data-theme="dark" className="bg-background">
        <section className="relative overflow-hidden bg-background">
          <div className="pb-20 pt-24 md:pt-32 lg:pt-48">
            <div className="relative z-10 mx-auto grid max-w-5xl items-end gap-4 px-6">
              <div>
                <h1 className="max-w-4xl text-balance text-5xl font-semibold tracking-normal lg:text-6xl">
                  Your AI coworker agent for{" "}
                  <span className="font-redaction-35-italic text-white">
                    business workflows
                  </span>
                </h1>
              </div>
              <div className="max-w-xl">
                <p className="mb-6 text-balance text-lg text-muted-foreground lg:text-xl">
                  Connect your apps, describe the work, and let Atmet automate
                  repeatable tasks across your business.
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <a
                    href="/waitlist"
                    className="inline-flex h-9 min-w-[124px] items-center justify-center rounded-lg border border-transparent bg-primary px-3.5 text-[13px] font-semibold text-primary-foreground shadow-md shadow-black/15 ring-1 ring-primary/40 transition-colors hover:bg-primary/90"
                  >
                    Join the waitlist
                  </a>
                  <a
                    href="https://app.atmetai.com/sign-in"
                    className="inline-flex h-9 min-w-[124px] items-center justify-center rounded-lg bg-card px-3.5 text-[13px] font-semibold text-foreground shadow-sm shadow-black/15 transition-colors hover:bg-muted/50"
                  >
                    Open app
                  </a>
                </div>
              </div>
            </div>
            <HeroIllustration />
          </div>
        </section>
        <LogoCloud />
        <HowItWorks />
        <PlatformFeatures />
        <MoreFeatures />
        <StatsSection />
        <TestimonialsSection />
        <CallToAction />
      </main>
      <FooterSection />
    </div>
  )
}
