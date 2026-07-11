import { Card } from '@/components/ui/card'
import { CompletePaymentIllustration } from '@/components/illustrations/complete-payment-illustration'
import { LinkPaymentIllustration } from '@/components/illustrations/link-payment-illustration'

export function MoreFeatures() {
    return (
        <section>
            <div className="@container py-16 [--color-card:transparent] lg:py-24">
                <div className="mx-auto w-full max-w-5xl px-6">
                    <div>
                        <span className="text-primary font-mono text-sm uppercase">What you get</span>
                        <div className="mt-8 grid items-end gap-6 md:grid-cols-2">
                            <h2 className="text-foreground text-4xl font-semibold md:text-5xl">Automation that stays understandable</h2>
                            <div className="lg:ps-12">
                                <p className="text-muted-foreground text-balance">Atmet is built for real business workflows: connected tools, visible state, reviewable actions, and fast iteration.</p>
                            </div>
                        </div>
                    </div>
                    <div className="@xl:grid-cols-2 mt-16 grid gap-6 [--color-border:color-mix(in_oklab,var(--color-foreground)10%,transparent)] *:shadow-lg *:shadow-black/5 lg:-mx-8">
                        <Card className="group grid grid-rows-[auto_1fr] gap-8 rounded-2xl p-8">
                            <div>
                                <h3 className="text-foreground font-semibold">Human approval where it counts</h3>
                                <p className="text-muted-foreground mt-3 text-balance">Let the agent prepare the work, then ask for approval before sending messages, changing records, or touching sensitive data.</p>
                            </div>

                            <CompletePaymentIllustration />
                        </Card>

                        <Card className="group grid grid-rows-[auto_1fr] gap-8 overflow-hidden rounded-2xl p-8">
                            <div>
                                <h3 className="text-foreground font-semibold">Repeatable workflows in seconds</h3>
                                <p className="text-muted-foreground mt-3 text-balance">Turn the tasks you repeat every week into guided automations that your whole team can reuse.</p>
                            </div>

                            <LinkPaymentIllustration />
                        </Card>
                    </div>
                </div>
            </div>
        </section>
    )
}
