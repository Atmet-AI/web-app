'use client'

import React from 'react'
import { Languages, Menu, Moon, Sun, X } from 'lucide-react'

import { Logo } from '@/components/logo'
import { useLandingPage } from '@/components/landing-page-context'
import { cn } from '@/lib/utils'

export default function Header() {
    const { theme, t, toggleLanguage, toggleTheme } = useLandingPage()
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false)
    const [isScrolled, setIsScrolled] = React.useState(false)
    const navLinks = [
        { name: t.nav.howItWorks, href: '#how-it-works' },
        { name: t.nav.features, href: '#platform' },
        { name: t.nav.useCases, href: '#results' },
        { name: t.nav.contact, href: '#contact' },
    ]
    const actionLinks = [
        { name: t.nav.waitlist, href: '/waitlist', primary: true },
        { name: t.nav.docs, href: '/docs' },
    ]

    React.useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50)
        }

        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    React.useEffect(() => {
        const originalOverflow = document.body.style.overflow

        if (isMobileMenuOpen) {
            document.body.style.overflow = 'hidden'
        }

        return () => {
            document.body.style.overflow = originalOverflow
        }
    }, [isMobileMenuOpen])

    return (
        <header
            role="banner"
            data-state={isMobileMenuOpen ? 'active' : 'inactive'}
            {...(isScrolled && { 'data-scrolled': true })}
            className="pointer-events-none fixed inset-x-0 top-4 z-50 px-4">
            <div className="mx-auto flex max-w-[72rem] items-start justify-center gap-2">
            <div
                className={cn(
                    'pointer-events-auto h-12 w-full max-w-4xl overflow-hidden rounded-xl border border-border/70 bg-background/72 shadow-xl shadow-black/10 ring-1 ring-border/50 backdrop-blur-xl transition-all duration-300 dark:shadow-black/20',
                    'in-data-scrolled:bg-background/86 in-data-scrolled:shadow-black/15 dark:in-data-scrolled:shadow-black/30',
                    'max-lg:in-data-[state=active]:h-[calc(100svh-2rem)] max-lg:in-data-[state=active]:bg-background/94'
                )}>
                <div className="h-full px-4 sm:px-5">
                    <div className="relative flex h-full flex-wrap items-center justify-between">
                        <div className="flex h-full items-center justify-between gap-6 max-lg:h-12 max-lg:w-full max-lg:border-b max-lg:border-foreground/10">
                            <a
                                href="/landing-page"
                                aria-label="home"
                                className="inline-flex items-center">
                                <Logo className="h-[1.125rem]" />
                            </a>

                            <button
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                aria-label={isMobileMenuOpen ? 'Close Menu' : 'Open Menu'}
                                className="relative z-20 -m-2.5 -me-3 block cursor-pointer p-2.5 lg:hidden">
                                <Menu className="in-data-[state=active]:rotate-180 in-data-[state=active]:scale-0 in-data-[state=active]:opacity-0 m-auto size-5 duration-200" />
                                <X className="in-data-[state=active]:rotate-0 in-data-[state=active]:scale-100 in-data-[state=active]:opacity-100 absolute inset-0 m-auto size-5 -rotate-180 scale-0 opacity-0 duration-200" />
                            </button>
                        </div>

                        <nav
                            aria-label="Primary"
                            className="absolute inset-0 m-auto hidden h-fit w-fit lg:block">
                            <div className="flex items-center gap-1">
                                {navLinks.map((link) => (
                                    <a
                                        key={link.name}
                                        href={link.href}
                                        className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground">
                                        {link.name}
                                    </a>
                                ))}
                            </div>
                        </nav>

                        {isMobileMenuOpen && <MobileMenu closeMenu={() => setIsMobileMenuOpen(false)} />}

                        <div className="max-lg:in-data-[state=active]:mt-6 in-data-[state=active]:flex hidden w-full flex-wrap items-center justify-end md:flex-nowrap lg:m-0 lg:flex lg:h-full lg:w-fit lg:gap-1.5 lg:border-transparent lg:bg-transparent lg:p-0 lg:shadow-none dark:shadow-none dark:lg:bg-transparent">
                            {actionLinks.map((link) => (
                                <a
                                    key={link.name}
                                    href={link.href}
                                    className={cn(
                                        'inline-flex h-7 items-center justify-center rounded-md px-2 text-[12px] font-semibold transition-colors',
                                        link.primary
                                            ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                                            : 'bg-muted text-foreground hover:bg-muted/75'
                                    )}>
                                    {link.name}
                                </a>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            <div className="pointer-events-auto hidden h-12 items-center gap-1.5 rounded-xl border border-border/70 bg-background/72 px-2 shadow-xl shadow-black/10 ring-1 ring-border/50 backdrop-blur-xl lg:flex dark:shadow-black/20">
                <button
                    type="button"
                    onClick={toggleTheme}
                    aria-label={theme === 'dark' ? t.controls.themeLight : t.controls.themeDark}
                    className="inline-flex h-7 items-center justify-center rounded-md bg-muted px-2 text-[12px] font-semibold text-foreground transition-colors hover:bg-muted/75">
                    {theme === 'dark' ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
                </button>
                <button
                    type="button"
                    onClick={toggleLanguage}
                    className="inline-flex h-7 items-center gap-1 rounded-md bg-muted px-2 text-[12px] font-semibold text-foreground transition-colors hover:bg-muted/75">
                    <Languages className="size-3.5" />
                    {t.controls.language}
                </button>
            </div>
            </div>
        </header>
    )
}

const MobileMenu = ({ closeMenu }: { closeMenu: () => void }) => {
    const { t, theme, toggleLanguage, toggleTheme } = useLandingPage()
    const navLinks = [
        { name: t.nav.howItWorks, href: '#how-it-works', primary: false },
        { name: t.nav.features, href: '#platform', primary: false },
        { name: t.nav.useCases, href: '#results', primary: false },
        { name: t.nav.contact, href: '#contact', primary: false },
        { name: t.nav.waitlist, href: '/waitlist', primary: true },
        { name: t.nav.docs, href: '/docs', primary: false },
    ]

    return (
        <nav
            role="navigation"
            aria-label="Mobile"
            className="w-full pt-4">
            <div className="grid gap-1">
                {navLinks.map((link) => (
                    <a
                        key={link.name}
                        href={link.href}
                        onClick={closeMenu}
                        className={cn(
                            'rounded-lg px-3 py-3 text-base font-medium transition-colors',
                            link.primary ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                        )}>
                        {link.name}
                    </a>
                ))}
                <button
                    type="button"
                    onClick={toggleTheme}
                    className="rounded-lg px-3 py-3 text-start text-base font-medium text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground">
                    {theme === 'dark' ? t.controls.themeLight : t.controls.themeDark}
                </button>
                <button
                    type="button"
                    onClick={toggleLanguage}
                    className="rounded-lg px-3 py-3 text-start text-base font-medium text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground">
                    {t.controls.language}
                </button>
            </div>
        </nav>
    )
}
