'use client'

import { AgentWorkflowIllustration } from '@/components/illustrations/agent-workflow'
import { AiMentionsIllustration } from '@/components/illustrations/ai-mentions'
import { IntegrationsIllustration } from '@/components/illustrations/integrations'
import { useLandingPage } from '@/components/landing-page-context'
import { cn } from '@/lib/utils'

export function HowItWorks() {
    const { language, t } = useLandingPage()

    return (
        <section id="how-it-works">
            <div className="@container relative py-16 [--color-card:color-mix(in_oklab,var(--color-zinc-900)_70%,var(--color-background))] md:py-24">
                <div className="relative mx-auto w-full max-w-5xl px-6">
                    <div className="mb-16">
                        <span className="text-primary font-mono text-sm uppercase">{t.how.eyebrow}</span>
                        <div className="mt-8 grid items-end gap-6 md:grid-cols-2">
                            <h2 className={cn("text-foreground text-4xl font-semibold md:text-5xl", language === 'ar' && 'font-thmanyah-serif-display')}>{t.how.title}</h2>
                            <div className="lg:ps-12">
                                <p className="text-muted-foreground text-balance">{t.how.description}</p>
                            </div>
                        </div>
                    </div>
                    <div className="@max-4xl:max-w-sm mx-auto [--color-border-illustration:var(--color-border)] lg:-mx-12">
                        <div className="@max-4xl:gap-12 @4xl:grid-cols-3 grid gap-10">
                            <div className="grid gap-8">
                                <div className="flex min-h-64 items-center justify-center">
                                    <div className="w-full max-w-xs">
                                        <IntegrationsIllustration />
                                    </div>
                                </div>
                                <div className="@4xl:px-12">
                                    <h3 className="text-balance font-semibold">{t.how.steps[0].title}</h3>
                                    <p className="text-muted-foreground mt-4">{t.how.steps[0].description}</p>
                                </div>
                            </div>
                            <div className="grid gap-8">
                                <div className="flex min-h-64 items-center justify-center">
                                    <div className="w-full max-w-xs">
                                        <AiMentionsIllustration />
                                    </div>
                                </div>
                                <div className="@4xl:px-12">
                                    <h3 className="text-balance font-semibold">{t.how.steps[1].title}</h3>
                                    <p className="text-muted-foreground mt-4">{t.how.steps[1].description}</p>
                                </div>
                            </div>
                            <div className="grid gap-8">
                                <div className="flex min-h-64 items-center justify-center">
                                    <div className="w-full max-w-xs">
                                        <AgentWorkflowIllustration />
                                    </div>
                                </div>
                                <div className="@4xl:px-12">
                                    <h3 className="text-balance font-semibold">{t.how.steps[2].title}</h3>
                                    <p className="text-muted-foreground mt-4">{t.how.steps[2].description}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
