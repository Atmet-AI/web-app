'use client'

import { FlickeringGrid } from '@/components/ui/flickering-grid'
import { useLandingPage } from '@/components/landing-page-context'

export function CallToAction() {
    const { t } = useLandingPage()

    return (
        <section id="waitlist" className="py-14">
            <div className="relative mx-auto max-w-5xl px-6">
                <div className="relative overflow-hidden rounded-3xl border border-primary/45 bg-primary px-6 py-16 text-center shadow-2xl shadow-primary/20 ring-1 ring-white/15 md:px-10">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgb(255_255_255/0.24),transparent_42%),linear-gradient(135deg,rgb(30_144_255)_0%,rgb(20_122_224)_52%,rgb(11_84_172)_100%)]" />
                    <FlickeringGrid
                        color="rgb(255, 255, 255)"
                        squareSize={3}
                        gridGap={4}
                        flickerChance={0.34}
                        maxOpacity={0.34}
                        aria-hidden="true"
                        className="absolute inset-0 z-10 opacity-90 [mask-image:radial-gradient(ellipse_at_center,black_0%,transparent_76%)]"
                    />
                    <div className="relative z-20 mx-auto max-w-2xl">
                        <h2 className="text-balance text-4xl font-semibold md:text-5xl">
                            {t.cta.title} <span className="text-white">{t.cta.accent}</span>
                        </h2>
                        <p className="mb-6 mt-4 text-balance text-primary-foreground/75">{t.cta.subtitle}</p>

                        <div className="flex flex-wrap items-center justify-center">
                            <a
                                href="/waitlist"
                                className="inline-flex h-8 items-center justify-center rounded-lg bg-white px-2.5 text-[13px] font-semibold text-primary transition-colors hover:bg-white/90">
                                {t.cta.button}
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
