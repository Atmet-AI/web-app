'use client'

import { buttonVariants } from '@/components/ui/button'
import { useLandingPage } from '@/components/landing-page-context'
import { Github, Instagram, Link, Mail, Plus, Table2 } from 'lucide-react'

export const IntegrationsIllustration = () => {
    const { t } = useLandingPage()
    const integrations = t.illustrations.integrations

    return (
        <div
            aria-hidden
            className="bg-foreground/5 group rounded-2xl">
            <div className="flex items-center gap-1.5 px-6 py-2.5 text-sm font-medium">
                <Link className="size-3.5 opacity-50" />
                {t.illustrations.integrationsTitle}
            </div>
            <div className="relative">
                <div className="absolute inset-0 scale-100 blur-lg opacity-20 transition-all duration-300 dark:opacity-35">
                    <div className="absolute inset-x-6 bottom-0 top-12 -translate-y-3 bg-primary/70"></div>
                </div>
                <div className="bg-card ring-border relative overflow-hidden rounded-2xl border border-border px-6 py-3 shadow-md shadow-black/5 ring-1 before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_55%_50%,rgb(30_144_255/0.18),transparent_62%)] dark:before:bg-[radial-gradient(circle_at_55%_50%,rgb(30_144_255/0.28),transparent_62%)]">
                    <Integration
                        icon={<Mail className="text-red-500" />}
                        name={integrations[0][0]}
                        description={integrations[0][1]}
                    />
                    <Integration
                        icon={<Github className="text-foreground" />}
                        name={integrations[1][0]}
                        description={integrations[1][1]}
                    />
                    <Integration
                        icon={<Instagram className="text-pink-500" />}
                        name={integrations[2][0]}
                        description={integrations[2][1]}
                    />
                    <Integration
                        icon={<Table2 className="text-emerald-500" />}
                        name={integrations[3][0]}
                        description={integrations[3][1]}
                    />
                </div>
            </div>
        </div>
    )
}

const Integration = ({ icon, name, description }: { icon: React.ReactNode; name: string; description: string }) => {
    return (
        <div className="grid max-w-xs grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-dashed py-3 last:border-b-0">
            <div className="bg-muted border-foreground/5 flex size-12 items-center justify-center rounded-lg border *:size-5">{icon}</div>
            <div className="space-y-0.5">
                <h3 className="text-sm font-medium">{name}</h3>
                <p className="text-muted-foreground line-clamp-1 text-sm">{description}</p>
            </div>
            <div className={buttonVariants({ variant: 'outline', size: 'icon' })}>
                <Plus className="size-4" />
            </div>
        </div>
    )
}

export default IntegrationsIllustration
