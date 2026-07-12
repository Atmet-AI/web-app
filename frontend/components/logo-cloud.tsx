'use client'
import { AnimatePresence, motion } from 'motion/react'
import React, { useEffect, useState } from 'react'

import { Beacon } from '@/components/ui/svgs/beacon'
import { Bolt } from '@/components/ui/svgs/bolt'
import { Cisco } from '@/components/ui/svgs/cisco'
import { Hulu } from '@/components/ui/svgs/hulu'
import { OpenaiWordmarkLight as OpenAIFull } from '@/components/ui/svgs/openai'
import { PrimeVideo as Primevideo } from '@/components/ui/svgs/prime-video'
import { Stripe } from '@/components/ui/svgs/stripe'
import { SupabaseDark as Supabase } from '@/components/ui/svgs/supabase'
import { Polars } from '@/components/ui/svgs/polars'
import { VercelWordmark as VercelFull } from '@/components/ui/svgs/vercel'
import { Spotify } from '@/components/ui/svgs/spotify'
import { Paypal as PayPal } from '@/components/ui/svgs/paypal'
import { LeapWalletDark as LeapWallet } from '@/components/ui/svgs/leap-wallet'
import { useLandingPage } from '@/components/landing-page-context'

const aiLogos: React.ReactNode[] = [
    <OpenAIFull
        key="openai"
        height={24}
        width="auto"
    />,
    <Bolt
        key="bolt"
        height={20}
        width="auto"
    />,
    <Cisco
        key="cisco-ai"
        height={32}
        width="auto"
    />,
    <Hulu
        key="hulu-ai"
        height={22}
        width="auto"
    />,
    <Spotify
        key="spotify-ai"
        height={24}
        width="auto"
    />,
]

const hostingLogos: React.ReactNode[] = [
    <Supabase
        key="supabase"
        height={24}
        width="auto"
    />,
    <Cisco
        key="cisco-hosting"
        height={32}
        width="auto"
    />,
    <Hulu
        key="hulu-hosting"
        height={22}
        width="auto"
    />,
    <Spotify
        key="spotify-hosting"
        height={24}
        width="auto"
    />,
    <VercelFull
        key="vercel"
        height={20}
        width="auto"
    />,
]

const paymentsLogos: React.ReactNode[] = [
    <Stripe
        key="stripe"
        height={24}
        width="auto"
    />,
    <PayPal
        key="paypal"
        height={24}
        width="auto"
    />,
    <LeapWallet
        key="leapwallet"
        height={24}
        width="auto"
    />,
    <Beacon
        key="beacon"
        height={20}
        width="auto"
    />,
    <Polars
        key="polars"
        height={24}
        width="auto"
    />,
]

const streamingLogos: React.ReactNode[] = [
    <Primevideo
        key="primevideo"
        height={28}
        width="auto"
    />,
    <Hulu
        key="hulu-streaming"
        height={22}
        width="auto"
    />,
    <Spotify
        key="spotify-streaming"
        height={24}
        width="auto"
    />,
    <Cisco
        key="cisco-streaming"
        height={32}
        width="auto"
    />,
    <Beacon
        key="beacon-streaming"
        height={20}
        width="auto"
    />,
]

const logos: Record<'operations' | 'finance' | 'engineering' | 'sales' | 'marketing' | 'more', React.ReactNode[]> = {
    operations: aiLogos,
    finance: paymentsLogos,
    engineering: hostingLogos,
    sales: streamingLogos,
    marketing: [
        <Hulu key="hulu-marketing" height={22} width="auto" />,
        <Spotify key="spotify-marketing" height={24} width="auto" />,
        <Primevideo key="primevideo-marketing" height={28} width="auto" />,
        <Beacon key="beacon-marketing" height={20} width="auto" />,
        <OpenAIFull key="openai-marketing" height={24} width="auto" />,
    ],
    more: [
        <Supabase key="supabase-more" height={24} width="auto" />,
        <VercelFull key="vercel-more" height={20} width="auto" />,
        <Cisco key="cisco-more" height={32} width="auto" />,
        <PayPal key="paypal-more" height={24} width="auto" />,
        <Bolt key="bolt-more" height={20} width="auto" />,
    ],
}

type LogoGroup = keyof typeof logos

export function LogoCloud() {
    const { t } = useLandingPage()
    const [currentGroup, setCurrentGroup] = useState<LogoGroup>('operations')
    const currentWordClasses = (group: LogoGroup) =>
        group === currentGroup
            ? 'ui-badge ui-badge-blue inline-flex w-fit shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-md border-0 px-1.5 py-0.5 font-medium leading-none transition-colors'
            : 'inline-flex w-fit shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-md border-0 bg-muted px-1.5 py-0.5 font-medium leading-none text-muted-foreground transition-colors duration-200'

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentGroup((prev) => {
                const groups = Object.keys(logos) as LogoGroup[]
                const currentIndex = groups.indexOf(prev)
                const nextIndex = (currentIndex + 1) % groups.length
                return groups[nextIndex]
            })
        }, 2500)

        return () => clearInterval(interval)
    }, [])

    return (
        <section
            className="bg-background pb-16 pt-12 md:pt-16">
            <div className="mx-auto max-w-5xl px-6">
                <div className="mx-auto mb-8 max-w-3xl text-balance text-center md:mb-10">
                    <p className="text-muted-foreground text-xl md:text-2xl">
                        {t.logoCloud.prefix}{' '}
                        <span
                            data-slot={currentGroup === 'operations' ? 'badge' : undefined}
                            className={currentWordClasses('operations')}>
                            {t.logoCloud.operations}
                        </span>{' '}
                        <span
                            data-slot={currentGroup === 'finance' ? 'badge' : undefined}
                            className={currentWordClasses('finance')}>
                            {t.logoCloud.finance}
                        </span>{' '}
                        <span
                            data-slot={currentGroup === 'engineering' ? 'badge' : undefined}
                            className={currentWordClasses('engineering')}>
                            {t.logoCloud.engineering}
                        </span>{' '}
                        <span
                            data-slot={currentGroup === 'sales' ? 'badge' : undefined}
                            className={currentWordClasses('sales')}>
                            {t.logoCloud.sales}
                        </span>{' '}
                        <span
                            data-slot={currentGroup === 'marketing' ? 'badge' : undefined}
                            className={currentWordClasses('marketing')}>
                            {t.logoCloud.marketing}
                        </span>{' '}
                        <span
                            data-slot={currentGroup === 'more' ? 'badge' : undefined}
                            className={currentWordClasses('more')}>
                            {t.logoCloud.more}
                        </span>
                    </p>
                </div>
                <div className="perspective-dramatic mx-auto grid max-w-5xl grid-cols-3 items-center gap-8 md:h-10 md:grid-cols-5">
                    <AnimatePresence
                        initial={false}
                        mode="popLayout">
                        {logos[currentGroup].map((logo, i) => (
                            <motion.div
                                key={`${currentGroup}-${i}`}
                                className="**:fill-foreground! mask-b-from-55% flex h-10 items-center justify-center"
                                initial={{ opacity: 0, y: 24, filter: 'blur(6px)' }}
                                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                                exit={{ opacity: 0, y: -24, filter: 'blur(6px)', scale: 0.5 }}
                                transition={{ delay: i * 0.05, duration: 0.4 }}>
                                {logo}
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            </div>
        </section>
    )
}
