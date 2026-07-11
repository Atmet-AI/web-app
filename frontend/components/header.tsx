'use client'
import { Button } from '@/components/ui/button'
import React from 'react'
import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger, navigationMenuTriggerStyle } from '@/components/ui/navigation-menu'
import { Menu, X, Shield, SquareActivity, Sparkles, Cpu, Gem, ShoppingBag, BookOpen, Notebook, Croissant, Smartphone, Rocket, Cloud, Bot } from 'lucide-react'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { cn } from '@/lib/utils'
import { Logo } from '@/components/logo'

interface FeatureLink {
    href: string
    name: string
    description?: string
    icon: React.ReactElement
}

interface MobileLink {
    groupName?: string
    links?: FeatureLink[]
    name?: string
    href?: string
}

const features: FeatureLink[] = [
    {
        href: '#how-it-works',
        name: 'AI coworker',
        description: 'Turn instructions into repeatable work',
        icon: <Sparkles className="stroke-foreground fill-green-500/15" />,
    },
    {
        href: '#platform',
        name: 'Workflow automation',
        description: 'Coordinate tools, files, and decisions',
        icon: <SquareActivity className="stroke-foreground fill-indigo-500/15" />,
    },
    {
        href: '#security',
        name: 'Security',
        description: 'Keep business workflows controlled',
        icon: <Shield className="stroke-foreground fill-blue-500/15" />,
    },
]

const moreFeatures: FeatureLink[] = [
    {
        href: '#platform',
        name: 'App connections',
        description: 'Bring your business tools together',
        icon: <Bot className="stroke-foreground fill-yellow-500/15" />,
    },
    {
        href: '#results',
        name: 'Team visibility',
        description: 'Track work as it moves',
        icon: <Rocket className="stroke-foreground fill-orange-500/15" />,
    },
    {
        href: '#security',
        name: 'Approvals',
        description: 'Review sensitive actions first',
        icon: <Cloud className="stroke-foreground fill-teal-500/15" />,
    },
    {
        href: '#security',
        name: 'Security',
        description: 'Keep your data safe and secure',
        icon: <Shield className="stroke-foreground fill-blue-500/15" />,
    },
    {
        href: '#waitlist',
        name: 'Early access',
        description: 'Join the alpha rollout',
        icon: <Gem className="stroke-foreground fill-pink-500/15" />,
    },
    {
        href: 'https://app.atmetai.com/sign-in',
        name: 'Platform',
        description: 'Open the Atmet app',
        icon: <Smartphone className="stroke-foreground fill-zinc-500/15" />,
    },
]

const useCases: FeatureLink[] = [
    {
        href: '#platform',
        name: 'Operations',
        description: 'Automate recurring business work',
        icon: <ShoppingBag className="stroke-foreground fill-emerald-500/25" />,
    },
    {
        href: '#platform',
        name: 'Integrations',
        description: 'Connect apps and APIs',
        icon: <Cpu className="stroke-foreground fill-blue-500/15" />,
    },
    {
        href: '#results',
        name: 'Teams',
        description: 'Keep everyone aligned',
        icon: <Gem className="stroke-foreground fill-pink-500/15" />,
    },
    {
        href: '#how-it-works',
        name: 'Founders',
        description: 'Delegate busywork to an AI coworker',
        icon: <Smartphone className="stroke-foreground fill-zinc-500/15" />,
    },
]

const contentLinks: FeatureLink[] = [
    { name: 'Waitlist', href: '/waitlist', icon: <BookOpen className="stroke-foreground fill-purple-500/15" /> },
    { name: 'Sign in', href: 'https://app.atmetai.com/sign-in', icon: <Croissant className="stroke-foreground fill-red-500/15" /> },
    { name: 'Integrations', href: '#platform', icon: <Notebook className="stroke-foreground fill-zinc-500/15" /> },
]

const mobileLinks: MobileLink[] = [
    {
        groupName: 'Product',
        links: features,
    },
    {
        groupName: 'Solutions',
        links: [...useCases, ...contentLinks],
    },
    { name: 'Waitlist', href: '/waitlist' },
    { name: 'Open app', href: 'https://app.atmetai.com/sign-in' },
]

export default function Header() {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false)
    const [isScrolled, setIsScrolled] = React.useState(false)

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
            data-theme="dark"
            data-state={isMobileMenuOpen ? 'active' : 'inactive'}
            {...(isScrolled && { 'data-scrolled': true })}
            className="pointer-events-none fixed inset-x-0 top-4 z-50 px-4">
            <div
                className={cn(
                    'border-border-illustration/70 pointer-events-auto mx-auto h-14 max-w-5xl overflow-hidden rounded-2xl border bg-background/55 shadow-2xl shadow-black/20 ring-1 ring-white/10 backdrop-blur-xl transition-all duration-300',
                    'in-data-scrolled:bg-background/70 in-data-scrolled:shadow-black/30',
                    'lg:h-[3.75rem]',
                    'max-lg:in-data-[state=active]:h-[calc(100svh-2rem)] max-lg:in-data-[state=active]:bg-background/80'
                )}>
                <div className="h-full px-5 sm:px-6">
                    <div className="relative flex h-full flex-wrap items-center justify-between">
                        <div
                            aria-hidden
                            className="bg-size-[4px_1px] absolute inset-x-0 bottom-0 hidden h-px bg-[linear-gradient(90deg,var(--color-foreground)_1px,transparent_1px)] bg-repeat-x opacity-20 max-lg:in-data-[state=active]:block"
                        />
                        <div className="flex h-full items-center justify-between gap-8 max-lg:h-14 max-lg:w-full max-lg:border-b max-lg:border-foreground/10">
                            <a
                                href="/landing-page"
                                aria-label="home">
                                <Logo className="h-6" />
                            </a>

                            <button
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                aria-label={isMobileMenuOpen == true ? 'Close Menu' : 'Open Menu'}
                                className="relative z-20 -m-2.5 -me-3 block cursor-pointer p-2.5 lg:hidden">
                                <Menu className="in-data-[state=active]:rotate-180 in-data-[state=active]:scale-0 in-data-[state=active]:opacity-0 m-auto size-5 duration-200" />
                                <X className="in-data-[state=active]:rotate-0 in-data-[state=active]:scale-100 in-data-[state=active]:opacity-100 absolute inset-0 m-auto size-5 -rotate-180 scale-0 opacity-0 duration-200" />
                            </button>
                        </div>

                        <div className="absolute inset-0 m-auto hidden h-fit w-fit lg:block">
                            <NavMenu />
                        </div>

                        {isMobileMenuOpen && <MobileMenu closeMenu={() => setIsMobileMenuOpen(false)} />}

                        <div className="max-lg:in-data-[state=active]:mt-6 in-data-[state=active]:flex hidden w-full flex-wrap items-center justify-end space-y-8 md:flex-nowrap lg:m-0 lg:flex lg:h-full lg:w-fit lg:gap-6 lg:space-y-0 lg:border-transparent lg:bg-transparent lg:p-0 lg:shadow-none dark:shadow-none dark:lg:bg-transparent">
                            <div className="flex w-full flex-col items-center space-y-3 sm:flex-row sm:gap-3 sm:space-y-0 md:w-fit">
                                <Button variant="outline" size="sm" render={<a href="https://app.atmetai.com/sign-in" />} nativeButton={false}>Sign in</Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    )
}

const MobileMenu = ({ closeMenu }: { closeMenu: () => void }) => {
    return (
        <nav
            role="navigation"
            className="w-full [--color-border:--alpha(var(--color-foreground)/5%)] [--color-muted:--alpha(var(--color-foreground)/5%)]">
            <Accordion className="**:hover:no-underline -mx-4 mt-0.5 space-y-0.5">
                {mobileLinks.map((link, index) => {
                    if (link.groupName && link.links) {
                        return (
                            <AccordionItem
                                key={index}
                                value={link.groupName}
                                className="before:border-border group relative border-b-0 before:pointer-events-none before:absolute before:inset-x-4 before:bottom-0 before:border-b">
                                <AccordionTrigger className="**:font-normal! data-[state=open]:bg-muted flex items-center justify-between px-4 py-3 text-lg">{link.groupName}</AccordionTrigger>
                                <AccordionContent className="pb-5">
                                    <ul>
                                        {link.links.map((feature, featureIndex) => (
                                            <li key={featureIndex}>
                                                <a
                                                    href={feature.href}
                                                    onClick={closeMenu}
                                                    className="grid grid-cols-[auto_1fr] items-center gap-2.5 px-4 py-2">
                                                    <div
                                                        aria-hidden
                                                        className="flex items-center justify-center *:size-4">
                                                        {feature.icon}
                                                    </div>
                                                    <div className="text-base">{feature.name}</div>
                                                </a>
                                            </li>
                                        ))}
                                    </ul>
                                </AccordionContent>
                            </AccordionItem>
                        )
                    }
                    return null
                })}
            </Accordion>
            {mobileLinks.map((link, index) => {
                if (link.name && link.href) {
                    return (
                        <a
                            key={index}
                            href={link.href}
                            onClick={closeMenu}
                            className="group relative block border-0 border-b py-4 text-lg">
                            {link.name}
                        </a>
                    )
                }
                return null
            })}
        </nav>
    )
}

const NavMenu = () => {
    const menuRef = React.useRef<React.ElementRef<typeof NavigationMenu>>(null)

    const handleViewportHeight = () => {
        requestAnimationFrame(() => {
            const menuNode = menuRef.current
            if (!menuNode) return

            const openContent = document.querySelector<HTMLElement>('[data-slot="navigation-menu-viewport"][data-state="open"]')

            if (openContent) {
                const height = openContent.scrollHeight
                document.documentElement.style.setProperty('--navigation-menu-viewport-height', `${height}px`)
            } else {
                document.documentElement.style.removeProperty('--navigation-menu-viewport-height')
            }
        })
    }

    return (
        <NavigationMenu
            ref={menuRef}
            onValueChange={handleViewportHeight}
            className="**:data-[slot=navigation-menu-viewport-parent]:max-w-268 **:data-[slot=navigation-menu-viewport]:bg-transparent **:data-[slot=navigation-menu-viewport]:rounded-none **:data-[slot=navigation-menu-viewport]:ring-0 **:data-[slot=navigation-menu-viewport]:border-0 **:data-[slot=navigation-menu-viewport]:shadow-none [--color-muted:color-mix(in_oklch,var(--color-foreground)_5%,transparent)] [--viewport-outer-px:2rem] max-lg:hidden">
            <NavigationMenuList className="gap-3">
                <NavigationMenuItem value="product">
                    <NavigationMenuTrigger>Product</NavigationMenuTrigger>
                    <NavigationMenuContent className="mt-4.5 origin-top pb-14 pt-5 shadow-none ring-0">
                        <div className="min-w-5xl divide-foreground/10 grid w-full grid-cols-4 gap-4 divide-x pe-12">
                            <div className="row-span-2 -me-2 grid grid-rows-subgrid gap-1 pe-2">
                                <span className="text-muted-foreground ms-2 text-xs">Features</span>
                                <ul className="mt-1 space-y-2">
                                    {features.map((feature, index) => (
                                        <ListItem
                                            key={index}
                                            href={feature.href}
                                            title={feature.name}
                                            description={feature.description}>
                                            {feature.icon}
                                        </ListItem>
                                    ))}
                                </ul>
                            </div>
                            <div className="col-span-2 row-span-2 grid grid-rows-subgrid gap-1 border-e-0">
                                <span className="text-muted-foreground ms-2 text-xs">More Features</span>
                                <ul className="mt-1 grid grid-cols-2 gap-2">
                                    {moreFeatures.map((feature, index) => (
                                        <ListItem
                                            key={index}
                                            href={feature.href}
                                            title={feature.name}
                                            description={feature.description}>
                                            {feature.icon}
                                        </ListItem>
                                    ))}
                                </ul>
                            </div>
                            <div className="row-span-2 grid grid-rows-subgrid gap-1">
                                <span className="text-muted-foreground ms-2 text-xs">Changelog</span>
                                <div className="bg-linear-to-br inset-ring-foreground/10 inset-ring-1 relative mt-3 grid overflow-hidden rounded-xl bg-blue-200 from-pink-50 via-white/50 to-emerald-200 p-1 transition-colors duration-200 hover:bg-blue-300">
                                    <div className="absolute inset-0 aspect-video px-6">
                                        <div className="mask-b-from-35% before:bg-background before:ring-foreground/10 after:ring-foreground/5 after:bg-background/75 before:z-1 group relative -mx-4 h-4/5 px-4 pt-6 before:absolute before:inset-x-6 before:bottom-0 before:top-4 before:rounded-t-xl before:border before:border-transparent before:ring-1 after:absolute after:inset-x-9 after:bottom-0 after:top-2 after:rounded-t-xl after:border after:border-transparent after:ring-1">
                                            <div className="bg-card ring-foreground/10 relative z-10 h-full overflow-hidden rounded-t-xl border border-transparent p-8 text-sm shadow-xl shadow-black/25 ring-1"></div>
                                        </div>
                                    </div>
                                    <div className="space-y-0.5 self-end p-3">
                                        <NavigationMenuLink asChild className="text-foreground p-0 text-sm font-medium before:absolute before:inset-0 hover:bg-transparent focus:bg-transparent">
                                            <a href="#how-it-works">Workflow memory</a>
                                        </NavigationMenuLink>
                                        <p className="text-muted-foreground line-clamp-1 text-xs">Teach Atmet how your business works, then reuse that context across tasks.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </NavigationMenuContent>
                </NavigationMenuItem>
                <NavigationMenuItem value="solutions">
                    <NavigationMenuTrigger>Solutions</NavigationMenuTrigger>
                    <NavigationMenuContent className="mt-4.5 origin-top pb-12 pt-5">
                        <div className="min-w-5xl divide-foreground/10 grid w-full grid-cols-4 gap-4 divide-x pe-12">
                            <div className="col-span-2 row-span-2 -me-4 grid grid-rows-subgrid gap-1 pe-2">
                                <span className="text-muted-foreground ms-2 text-xs">Use Cases</span>
                                <ul className="mt-1 grid grid-cols-2 gap-2">
                                    {useCases.map((useCase, index) => (
                                        <ListItem
                                            key={index}
                                            href={useCase.href}
                                            title={useCase.name}
                                            description={useCase.description}>
                                            {useCase.icon}
                                        </ListItem>
                                    ))}
                                </ul>
                            </div>
                            <div className="row-span-2 grid grid-rows-subgrid gap-1 ps-2">
                                <span className="text-muted-foreground ms-2 text-xs">Content</span>
                                <ul className="mt-1">
                                    {contentLinks.map((content, index) => (
                                        <NavigationMenuLink key={index} asChild>
                                            <a href={content.href} className="grid grid-cols-[auto_1fr] items-center gap-2.5">
                                                {content.icon}
                                                <div className="text-foreground text-sm font-medium">{content.name}</div>
                                            </a>
                                        </NavigationMenuLink>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </NavigationMenuContent>
                </NavigationMenuItem>
                <NavigationMenuItem value="pricing">
                    <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                        <a href="/waitlist">Waitlist</a>
                    </NavigationMenuLink>
                </NavigationMenuItem>
                <NavigationMenuItem value="company">
                    <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                        <a href="https://app.atmetai.com/sign-in">Open app</a>
                    </NavigationMenuLink>
                </NavigationMenuItem>
            </NavigationMenuList>
        </NavigationMenu>
    )
}

function ListItem({ title, description, children, href, ...props }: React.ComponentPropsWithoutRef<'li'> & { href: string; title: string; description?: string }) {
    return (
        <li {...props}>
            <NavigationMenuLink asChild>
                <a href={href} className="grid grid-cols-[auto_1fr] gap-3.5">
                    <div className="bg-background ring-foreground/10 relative flex size-9 items-center justify-center rounded border border-transparent shadow-sm ring-1">{children}</div>
                    <div className="space-y-0.5">
                        <div className="text-foreground text-sm font-medium">{title}</div>
                        <p className="text-muted-foreground line-clamp-1 text-xs">{description}</p>
                    </div>
                </a>
            </NavigationMenuLink>
        </li>
    )
}
