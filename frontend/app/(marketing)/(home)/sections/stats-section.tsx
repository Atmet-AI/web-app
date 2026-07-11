import { Map } from '@/components/map'

export function StatsSection() {
    return (
        <section
            id="results"
            data-theme="dark"
            className="bg-background">
            <div className="@container py-12 md:py-20">
                <div className="mx-auto max-w-5xl px-6">
                    <div className="mask-t-from-35% mask-b-from-75%">
                        <Map />
                    </div>
                    <div className="relative mx-auto max-w-3xl">
                        <span className="@2xl:block bg-border pointer-events-none absolute inset-y-4 start-1/3 hidden w-px"></span>
                        <span className="@2xl:block bg-border pointer-events-none absolute inset-y-4 start-2/3 hidden w-px"></span>
                        <div className="**:text-center @max-2xl:max-w-2xs @max-2xl:mx-auto @max-2xl:gap-6 @2xl:grid-cols-3 grid *:px-6">
                            <div className="space-y-4 *:block">
                                <span className="text-3xl font-semibold">
                                    99.9 <span className="text-muted-foreground text-lg">%</span>
                                </span>
                                <p className="text-muted-foreground text-balance text-sm">
                                    <strong className="text-foreground font-medium">Operational visibility</strong> across connected workflows.
                                </p>
                            </div>
                            <div className="space-y-4 *:block">
                                <span className="text-3xl font-semibold">24/7</span>
                                <p className="text-muted-foreground text-balance text-sm">
                                    <strong className="text-foreground font-medium">Always-on agents</strong> ready for scheduled business work.
                                </p>
                            </div>
                            <div className="space-y-4 *:block">
                                <span className="text-3xl font-semibold">
                                    12 <span className="text-muted-foreground text-lg">X</span>
                                </span>
                                <p className="text-muted-foreground text-balance text-sm">
                                    <strong className="text-foreground font-medium">12X</strong> more repeatable workflows with less manual handoff.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
