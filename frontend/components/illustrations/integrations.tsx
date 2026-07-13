'use client'

import { buttonVariants } from '@/components/ui/button'
import { useLandingPage } from '@/components/landing-page-context'
import { Link, Plus } from 'lucide-react'

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
                <div className="bg-card ring-border relative overflow-hidden rounded-2xl border border-border px-6 py-3 ring-1 before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_55%_50%,rgb(30_144_255/0.18),transparent_62%)] dark:before:bg-[radial-gradient(circle_at_55%_50%,rgb(30_144_255/0.28),transparent_62%)]">
                    <Integration
                        icon={<GmailLogo />}
                        name={integrations[0][0]}
                        description={integrations[0][1]}
                    />
                    <Integration
                        icon={<GithubLogo />}
                        name={integrations[1][0]}
                        description={integrations[1][1]}
                    />
                    <Integration
                        icon={<InstagramLogo />}
                        name={integrations[2][0]}
                        description={integrations[2][1]}
                    />
                    <Integration
                        icon={<GoogleSheetsLogo />}
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
            <div className="bg-muted border-foreground/5 flex size-12 items-center justify-center rounded-lg border *:size-6">{icon}</div>
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

const GmailLogo = () => (
    <svg viewBox="0 0 256 193" aria-hidden="true">
        <path fill="#4285F4" d="M58.2 192.5V93.8L27.3 65.2 0 49.6v125.5c0 9.6 7.8 17.4 17.4 17.4h40.8Z" />
        <path fill="#34A853" d="M197.8 192.5h40.8c9.6 0 17.4-7.8 17.4-17.4V49.6l-31 17.7-27.2 26.5v98.7Z" />
        <path fill="#EA4335" d="m58.2 93.8-4.2-39.1 4.2-37.4L128 69.6l69.8-52.3 4.7 35.4-4.7 41.1L128 146.1 58.2 93.8Z" />
        <path fill="#FBBC04" d="M197.8 17.3v76.5L256 49.6V26c0-21.5-24.6-33.8-41.9-20.9l-16.3 12.2Z" />
        <path fill="#C5221F" d="M0 49.6 58.2 93.8V17.3L41.9 5.1C24.6-7.8 0 4.5 0 26v23.6Z" />
    </svg>
)

const GithubLogo = () => (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="fill-[#181717] dark:fill-white">
        <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2.17c-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.19-3.08-.12-.29-.52-1.46.11-3.04 0 0 .97-.31 3.17 1.18A11.1 11.1 0 0 1 12 6.03c.98 0 1.95.13 2.87.39 2.2-1.49 3.17-1.18 3.17-1.18.63 1.58.23 2.75.11 3.04.74.8 1.19 1.82 1.19 3.08 0 4.42-2.69 5.39-5.25 5.67.41.36.78 1.06.78 2.14v3.18c0 .31.21.67.79.56A11.52 11.52 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
)

const InstagramLogo = () => (
    <svg viewBox="0 0 24 24" aria-hidden="true">
        <defs>
            <linearGradient id="instagram-logo-gradient" x1="2" x2="22" y1="22" y2="2" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="#FEDA75" />
                <stop offset="0.28" stopColor="#FA7E1E" />
                <stop offset="0.48" stopColor="#D62976" />
                <stop offset="0.73" stopColor="#962FBF" />
                <stop offset="1" stopColor="#4F5BD5" />
            </linearGradient>
        </defs>
        <rect width="18.5" height="18.5" x="2.75" y="2.75" fill="none" stroke="url(#instagram-logo-gradient)" strokeWidth="2.4" rx="5.2" />
        <circle cx="12" cy="12" r="4.1" fill="none" stroke="url(#instagram-logo-gradient)" strokeWidth="2.25" />
        <circle cx="17.35" cy="6.65" r="1.35" fill="url(#instagram-logo-gradient)" />
    </svg>
)

const GoogleSheetsLogo = () => (
    <svg viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#0F9D58" d="M29 4H13a3 3 0 0 0-3 3v34a3 3 0 0 0 3 3h22a3 3 0 0 0 3-3V13L29 4Z" />
        <path fill="#87CEAC" d="M29 4v9h9L29 4Z" />
        <path fill="#FFFFFF" d="M16 20h16v16H16V20Zm2.5 2.5v4h4.8v-4h-4.8Zm7.2 0v4h3.8v-4h-3.8Zm-7.2 6.3v4.7h4.8v-4.7h-4.8Zm7.2 0v4.7h3.8v-4.7h-3.8Z" />
    </svg>
)

export default IntegrationsIllustration
