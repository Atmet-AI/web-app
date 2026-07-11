import { AgentWorkflowIllustration } from '@/components/illustrations/agent-workflow'
import { AiMentionsIllustration } from '@/components/illustrations/ai-mentions'
import { IntegrationsIllustration } from '@/components/illustrations/integrations'
import Image from 'next/image'

export function HowItWorks() {
    return (
        <section id="how-it-works">
            <div className="@container relative pb-12 pt-24 [--color-card:color-mix(in_oklab,var(--color-zinc-900)_70%,var(--color-background))] md:py-40">
                <div className="mask-b-from-55% dither mask-b-to-75% mask-radial-from-45% mask-radial-at-bottom mask-radial-[125%_80%] absolute inset-0 aspect-video opacity-75 mix-blend-overlay">
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
                        <span className="text-primary font-mono text-sm uppercase">How it works</span>
                        <div className="mt-8 grid items-end gap-6 md:grid-cols-2">
                            <h2 className="text-foreground text-4xl font-semibold md:text-5xl">Automate the work that slows teams down</h2>
                            <div className="lg:ps-12">
                                <p className="text-muted-foreground text-balance">Atmet learns your apps, tasks, and approvals so your team can delegate repeatable work without losing control.</p>
                            </div>
                        </div>
                    </div>
                    <div className="@max-4xl:max-w-sm mx-auto [--color-border-illustration:rgb(255_255_255/0.12)] lg:-mx-12">
                        <div className="@max-4xl:gap-12 @4xl:grid-cols-3 grid gap-10">
                            <div className="grid gap-8">
                                <div className="flex min-h-64 items-center justify-center">
                                    <div className="w-full max-w-xs">
                                        <IntegrationsIllustration />
                                    </div>
                                </div>
                                <div className="@4xl:px-12">
                                    <h3 className="text-balance font-semibold">1. Connect your apps</h3>
                                    <p className="text-muted-foreground mt-4">
                                        Bring your <span className="text-foreground font-medium">business tools</span> into one AI workspace.
                                    </p>
                                </div>
                            </div>
                            <div className="grid gap-8">
                                <div className="flex min-h-64 items-center justify-center">
                                    <div className="w-full max-w-xs">
                                        <AiMentionsIllustration />
                                    </div>
                                </div>
                                <div className="@4xl:px-12">
                                    <h3 className="text-balance font-semibold">2. Describe the workflow</h3>
                                    <p className="text-muted-foreground mt-4">
                                        Tell Atmet what needs to happen, who approves it, and when it should run.
                                    </p>
                                </div>
                            </div>
                            <div className="grid gap-8">
                                <div className="flex min-h-64 items-center justify-center">
                                    <div className="w-full max-w-xs">
                                        <AgentWorkflowIllustration />
                                    </div>
                                </div>
                                <div className="@4xl:px-12">
                                    <h3 className="text-balance font-semibold">3. Let the agent execute</h3>
                                    <p className="text-muted-foreground mt-4">
                                        Review sensitive steps and get a clear trail of every completed action.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
