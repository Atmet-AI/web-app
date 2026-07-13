'use client'

import { FlickeringGrid } from '@/components/ui/flickering-grid'
import { useLandingPage } from '@/components/landing-page-context'
import { cn } from '@/lib/utils'

export function CallToAction() {
    const { language, t } = useLandingPage()

    return (
        <section id="waitlist" className="py-0">
            <div className="relative mx-auto w-[min(calc(100vw_-_3rem),75rem)]">
                <div className="relative flex min-h-[21rem] items-center justify-center overflow-hidden rounded-none border-y border-primary/45 bg-primary px-6 py-14 text-center md:px-10">
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
                        <h2 className={cn("text-balance text-4xl font-semibold text-white md:text-5xl", language === 'ar' && 'font-thmanyah-serif-display')}>
                            {t.cta.title} <span className={cn(language === 'ar' && 'font-thmanyah-serif-display')}>{t.cta.accent}</span>
                        </h2>
                        <p className="mb-6 mt-4 text-balance text-white/75">{t.cta.subtitle}</p>

                        <div className="flex flex-wrap items-center justify-center">
                            <a
                                href="/waitlist"
                                data-cuelume-press
                                className="inline-flex h-7 items-center justify-center rounded-[min(var(--radius-md),12px)] border border-transparent bg-white px-2.5 text-[0.8rem] font-medium text-black transition-all hover:bg-white/90 active:translate-y-px active:scale-[0.96]">
                                {t.cta.button}
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
