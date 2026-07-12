'use client'

import { Card } from '@/components/ui/card'
import { AiMemoryIllustration } from '@/components/illustrations/ai-memory'
import { AiSearch2Illustration } from '@/components/illustrations/ai-search-2'
import { Models2Illustration } from '@/components/illustrations/models-2'
import { useLandingPage } from '@/components/landing-page-context'
import { cn } from '@/lib/utils'

export function PlatformFeatures() {
    const { language, t } = useLandingPage()

    return (
        <section id="platform">
            <div className="@container py-16 [--color-card:transparent] md:py-20">
                <div className="mx-auto w-full max-w-5xl px-6">
                    <div>
                        <span className="text-primary font-mono text-sm uppercase">{t.platform.eyebrow}</span>
                        <div className="mt-8 grid items-end gap-6 md:grid-cols-2">
                            <h2 className={cn("text-foreground text-4xl font-semibold md:text-5xl", language === 'ar' && 'font-thmanyah-serif-display')}>{t.platform.title}</h2>
                            <div className="lg:ps-12">
                                <p className="text-muted-foreground text-balance">{t.platform.description}</p>
                            </div>
                        </div>
                    </div>
                    <div className="@2xl:grid-cols-2 @2xl:grid-rows-5 mt-16 grid gap-6 [--color-border:color-mix(in_oklab,var(--color-foreground)10%,transparent)] lg:-mx-8">
                        <Card className="@2xl:row-span-3 group grid grid-rows-[auto_1fr] rounded-2xl p-0">
                            <div className="text-balance p-8">
                                <h3 className="text-foreground font-semibold">{t.platform.skillsTitle}</h3>
                                <p className="text-muted-foreground mt-3">{t.platform.skillsDescription}</p>
                            </div>
                            <div className="flex items-center overflow-hidden px-8 pb-8">
                                <AiSearch2Illustration />
                            </div>
                        </Card>

                        <Card className="@2xl:row-span-2 grid grid-rows-[auto_1fr] gap-8 overflow-hidden rounded-2xl p-8">
                            <div className="text-balance">
                                <h3 className="text-foreground font-semibold">{t.platform.modelTitle}</h3>
                                <p className="text-muted-foreground mt-3">{t.platform.modelDescription}</p>
                            </div>
                            <div className="flex items-center justify-center">
                                <Models2Illustration />
                            </div>
                        </Card>

                        <Card className="@2xl:row-span-3 @xl:@max-3xl:col-start-2 @max-3xl:row-start-1 group grid grid-rows-[auto_1fr] gap-8 overflow-hidden rounded-2xl p-8">
                            <div className="text-balance">
                                <h3 className="text-foreground font-semibold">{t.platform.memoryTitle}</h3>
                                <p className="text-muted-foreground mt-3">{t.platform.memoryDescription}</p>
                            </div>
                            <div className="overflow-hidden">
                                <AiMemoryIllustration />
                            </div>
                        </Card>

                        <Card className="bg-linear-to-l @2xl:row-span-2 @md:grid-cols-[1fr_auto] grid gap-8 overflow-hidden rounded-2xl from-primary/8 p-8 dark:from-slate-900/50">
                            <div className="text-balance">
                                <h3 className="text-foreground font-semibold">{t.platform.automationTitle}</h3>
                                <p className="text-muted-foreground mt-2">{t.platform.automationDescription}</p>
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
        </section>
    )
}
