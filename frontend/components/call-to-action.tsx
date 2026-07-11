import { Button } from '@/components/ui/button'

export function CallToAction() {
    return (
        <section id="waitlist" className="py-20">
            <div className="relative mx-auto max-w-5xl px-6">
                <div className="relative mx-auto max-w-2xl text-center">
                    <h2 className="text-balance text-4xl font-semibold md:text-5xl">
                        Put your workflow on <span className="bg-linear-to-b from-foreground/50 to-foreground/95 bg-clip-text text-transparent [-webkit-text-stroke:0.5px_var(--color-foreground)]">AI autopilot</span>
                    </h2>
                    <p className="text-muted-foreground mb-6 mt-4 text-balance">Join the early access list and help shape the Atmet alpha for real business automation. </p>

                    <Button size="sm" render={<a href="/waitlist" />} nativeButton={false}>Join waitlist</Button>
                    <Button className="bg-foreground/10 ring-foreground/20 hover:bg-foreground/15 ms-3 backdrop-blur" variant="outline" size="sm" render={<a href="https://app.atmetai.com/sign-in" />} nativeButton={false}>Open app</Button>
                </div>
            </div>
        </section>
    )
}
