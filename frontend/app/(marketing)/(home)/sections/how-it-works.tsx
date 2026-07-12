'use client'

import { AgentWorkflowIllustration } from '@/components/illustrations/agent-workflow'
import { AiMentionsIllustration } from '@/components/illustrations/ai-mentions'
import { IntegrationsIllustration } from '@/components/illustrations/integrations'
import { useLandingPage } from '@/components/landing-page-context'
import Image from 'next/image'

export function HowItWorks() {
    const { t } = useLandingPage()

    return (
        <section id="how-it-works">
            <div className="@container relative py-16 [--color-card:color-mix(in_oklab,var(--color-zinc-900)_70%,var(--color-background))] md:py-24">
                <div className="mask-b-from-55% dither mask-b-to-75% mask-radial-from-45% mask-radial-at-bottom mask-radial-[125%_80%] absolute inset-0 aspect-video opacity-30 mix-blend-multiply dark:opacity-75 dark:mix-blend-overlay">
                    <Image
                        src="https://raw.githubusercontent.com/tailark/assets/refs/heads/main/constellation_uvxuml.webp"
                        alt="gradient background"
                        className="size-full object-cover object-bottom"
                        width={2342}
                        height={1561}
                    />
                </div>
                <div className="relative mx-auto w-full max-w-5xl px-6">
                    <div className="mb-16">
                        <span className="text-primary font-mono text-sm uppercase">{t.how.eyebrow}</span>
                        <div className="mt-8 grid items-end gap-6 md:grid-cols-2">
                            <h2 className="text-foreground text-4xl font-semibold md:text-5xl">{t.how.title}</h2>
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
