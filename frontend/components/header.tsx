'use client'

import React from 'react'
import { ChevronDown, Languages, Menu, Moon, Sun, X } from 'lucide-react'

import { Logo } from '@/components/logo'
import { useLandingPage } from '@/components/landing-page-context'
import { cn } from '@/lib/utils'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const scrollToSection = (href: string) => {
    if (!href.startsWith('#')) {
        return false
    }

    const target = document.querySelector<HTMLElement>(href)
    const scrollRoot = document.querySelector<HTMLElement>('[data-landing-scroll-root="true"]')

    if (!target || !scrollRoot) {
        return false
    }

    const rootTop = scrollRoot.getBoundingClientRect().top
    const targetTop = target.getBoundingClientRect().top
    const headerOffset = 84

    scrollRoot.scrollTo({
        top: scrollRoot.scrollTop + targetTop - rootTop - headerOffset,
        behavior: 'smooth',
    })

    window.history.replaceState(null, '', href)
    return true
}

export default function Header() {
    const { dir, theme, t, toggleLanguage, toggleTheme } = useLandingPage()
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false)
    const [isScrolled, setIsScrolled] = React.useState(false)
    const navLinks = [
        { name: t.nav.howItWorks, href: '#how-it-works' },
        { name: t.nav.features, href: '#platform' },
        { name: t.nav.useCases, href: '#use-cases' },
        { name: t.nav.contact, href: '#contact' },
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
            <div
                className={cn(
                    'pointer-events-auto mx-auto h-11 w-full max-w-5xl overflow-hidden rounded-xl border border-border/35 bg-background/72 shadow-[0_0_0_0.5px_color-mix(in_oklab,var(--color-border)_45%,transparent)] backdrop-blur-xl transition-all duration-300',
                    'in-data-scrolled:bg-background/86',
                    'max-lg:in-data-[state=active]:h-[calc(100svh-2rem)] max-lg:in-data-[state=active]:bg-background/94'
                )}>
                <div className="h-full px-3 sm:px-4">
                    <div className="relative flex h-full flex-wrap items-center justify-between">
                        <div className="flex h-full items-center justify-between gap-6 max-lg:h-12 max-lg:w-full max-lg:border-b max-lg:border-foreground/10">
                            <a
                                href="/landing-page"
                                aria-label="home"
                                className="inline-flex items-center">
                                <Logo className="h-4" />
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
                            <div className="flex items-center gap-0.5">
                                {navLinks.map((link) => (
                                    <a
                                        key={link.name}
                                        href={link.href}
                                        onClick={(event) => {
                                            if (scrollToSection(link.href)) {
                                                event.preventDefault()
                                            }
                                        }}
                                        className="inline-flex h-7 items-center rounded-md px-2.5 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground">
                                        {link.name}
                                    </a>
                                ))}
                            </div>
                        </nav>

                        {isMobileMenuOpen && <MobileMenu closeMenu={() => setIsMobileMenuOpen(false)} />}

                        <div className="max-lg:in-data-[state=active]:mt-6 in-data-[state=active]:flex hidden w-full flex-wrap items-center justify-end md:flex-nowrap lg:m-0 lg:flex lg:h-full lg:w-fit lg:gap-1 lg:border-transparent lg:bg-transparent lg:p-0 lg:shadow-none dark:shadow-none dark:lg:bg-transparent">
                            <a
                                href="https://atmet.mintlify.site/"
                                className="inline-flex h-7 items-center justify-center rounded-md bg-muted px-2 text-[12px] font-semibold text-foreground transition-colors hover:bg-muted/75">
                                {t.nav.docs}
                            </a>
                            <div
                                dir="ltr"
                                className={cn(
                                    'inline-flex h-7 overflow-hidden rounded-md bg-primary text-primary-foreground',
                                    dir === 'rtl' && 'flex-row-reverse'
                                )}>
                                <a
                                    href="/waitlist"
                                    dir={dir}
                                    className="inline-flex h-7 items-center justify-center !bg-primary px-2.5 text-[12px] font-semibold !text-primary-foreground transition-colors hover:!bg-primary/90">
                                    {t.nav.waitlist}
                                </a>
                                <DropdownMenu>
                                    <DropdownMenuTrigger
                                        data-landing-action-menu-trigger="true"
                                        className={cn(
                                            'inline-flex h-7 w-7 items-center justify-center !bg-primary !text-primary-foreground transition-colors hover:!bg-primary/90 data-[popup-open]:!bg-primary',
                                            dir === 'rtl' ? 'border-r border-primary-foreground/20' : 'border-l border-primary-foreground/20'
                                        )}
                                        render={
                                            <button
                                                type="button"
                                                data-landing-action-menu-trigger="true"
                                                aria-label="Open display options"
                                            />
                                        }>
                                        <ChevronDown className="size-3.5" />
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="min-w-44">
                                        <DropdownMenuItem onClick={toggleLanguage}>
                                            <Languages className="size-4" />
                                            <span>{t.controls.language}</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={toggleTheme}>
                                            {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
                                            <span>{theme === 'dark' ? t.controls.themeLight : t.controls.themeDark}</span>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>
                    </div>
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
        { name: t.nav.useCases, href: '#use-cases', primary: false },
        { name: t.nav.contact, href: '#contact', primary: false },
        { name: t.nav.docs, href: 'https://atmet.mintlify.site/', primary: false },
        { name: t.nav.waitlist, href: '/waitlist', primary: true },
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
                        onClick={(event) => {
                            if (scrollToSection(link.href)) {
                                event.preventDefault()
                            }

                            closeMenu()
                        }}
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
