import { Card } from '@/components/ui/card'
import { AiSearch2Illustration } from '@/components/illustrations/ai-search-2'
import { Models2Illustration } from '@/components/illustrations/models-2'

export function PlatformFeatures() {
    return (
        <section id="platform">
            <div className="@container py-24 [--color-card:transparent]">
                <div className="mx-auto w-full max-w-5xl px-6">
                    <div>
                        <span className="text-primary font-mono text-sm uppercase">Platform</span>
                        <div className="mt-8 grid items-end gap-6 md:grid-cols-2">
                            <h2 className="text-foreground text-4xl font-semibold md:text-5xl">A control center for AI-run workflows</h2>
                            <div className="lg:ps-12">
                                <p className="text-muted-foreground text-balance">Give teams one place to connect apps, define automation, monitor progress, and approve the moments that matter.</p>
                            </div>
                        </div>
                    </div>
                    <div className="@2xl:grid-cols-2 @2xl:grid-rows-4 mt-16 grid gap-6 [--color-border:color-mix(in_oklab,var(--color-foreground)10%,transparent)] *:shadow-lg *:shadow-black/5 lg:-mx-8">
                        <Card className="@2xl:row-span-3 group grid grid-rows-[auto_1fr] rounded-2xl p-0">
                            <div className="text-balance p-8">
                                <h3 className="text-foreground font-semibold">Skills library</h3>
                                <p className="text-muted-foreground mt-3">Choose a ready-made skill for common work, or create your own skill when your team needs a custom agent capability.</p>
                            </div>
                            <div className="overflow-hidden px-8 pb-8">
                                <AiSearch2Illustration />
                            </div>
                        </Card>

                        <Card className="@2xl:row-span-2 grid grid-rows-[auto_1fr] gap-8 overflow-hidden rounded-2xl p-8">
                            <div className="text-balance">
                                <h3 className="text-foreground font-semibold">Choose your model</h3>
                                <p className="text-muted-foreground mt-3">Pick the AI model that fits each workflow, from fast daily automation to deeper reasoning tasks.</p>
                            </div>
                            <div className="flex items-center justify-center">
                                <Models2Illustration />
                            </div>
                        </Card>

                        <Card className="@2xl:row-span-2 @xl:@max-3xl:col-start-2 @max-3xl:row-start-1 group grid grid-rows-[auto_1fr] gap-8 overflow-hidden rounded-2xl p-8">
                            <div className="text-balance">
                                <h3 className="text-foreground font-semibold">Live status & usage</h3>
                                <p className="text-muted-foreground mt-3">Track agent activity, workspace limits, and workflow outcomes before they become bottlenecks.</p>
                            </div>

                        </Card>

                        <Card className="bg-linear-to-l @md:grid-cols-[1fr_auto] grid gap-8 overflow-hidden rounded-2xl from-slate-900/50 p-8">
                            <div className="text-balance">
                                <h3 className="text-foreground font-semibold">Context, files & approvals</h3>
                                <p className="text-muted-foreground mt-2">Keep conversations, files, and approval decisions attached to the work they affect.</p>
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
        </section>
    )
}
