'use client'

import { Logo } from '@/components/logo'
import { useLandingPage } from '@/components/landing-page-context'

export default function FooterSection() {
    const { t } = useLandingPage()
    const links = [
        {
            group: t.footer.product,
            items: [
                { title: t.nav.howItWorks, href: '#how-it-works' },
                { title: t.footer.platform, href: '#platform' },
                { title: t.footer.results, href: '#results' },
                { title: t.footer.openApp, href: 'https://app.atmetai.com/sign-in' },
            ],
        },
        {
            group: t.footer.access,
            items: [
                { title: t.nav.waitlist, href: '/waitlist' },
                { title: t.footer.signIn, href: 'https://app.atmetai.com/sign-in' },
                { title: 'Atmetai.com', href: '/' },
            ],
        },
    ]

    return (
        <footer
            id="contact"
            role="contentinfo"
            className="bg-background border-t py-8 sm:py-20 lg:pt-32">
            <div className="mx-auto max-w-5xl space-y-16 px-6">
                <div className="grid gap-12 md:grid-cols-5">
                    <div className="space-y-6 md:col-span-2 md:space-y-12">
                        <a
                            href="/landing-page"
                            aria-label="go home"
                            className="block size-fit">
                            <Logo />
                        </a>

                        <p className="text-muted-foreground text-balance text-sm">{t.footer.description}</p>
                    </div>

                    <div className="col-span-3 grid gap-6 sm:grid-cols-3">
                        {links.map((link, index) => (
                            <div
                                key={index}
                                className="space-y-4 text-sm">
                                <span className="block font-medium">{link.group}</span>

                                <div className="flex flex-wrap gap-2 sm:flex-col">
                                    {link.items.map((item, index) => (
                                        <a
                                            key={index}
                                            href={item.href}
                                            className="inline-flex w-fit rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground">
                                            <span>{item.title}</span>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        ))}

                        <div className="space-y-4">
                            <span className="block font-medium">{t.footer.community}</span>
                            <div className="flex flex-wrap gap-2 text-sm">
                                <a
                                    href="#"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label="LinkedIn"
                                    className="inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground">
                                    <svg
                                        className="size-5"
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="1em"
                                        height="1em"
                                        viewBox="0 0 24 24">
                                        <path
                                            fill="currentColor"
                                            d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93zM6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37z"></path>
                                    </svg>
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
                <div
                    aria-hidden
                    className="bg-size-[6px_1px] h-px bg-[linear-gradient(90deg,var(--color-foreground)_1px,transparent_1px)] bg-repeat-x opacity-25"
                />
                <div className="flex flex-wrap justify-between gap-4">
                    <span className="text-muted-foreground text-sm">© {new Date().getFullYear()} Atmet, {t.footer.rights} </span>

                    <span className="text-sm text-emerald-500">{t.footer.earlyAccess}</span>
                </div>
            </div>
        </footer>
    )
}
