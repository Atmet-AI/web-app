'use client'
import { AnimatePresence, motion } from 'motion/react'
import React, { useEffect, useState } from 'react'

import { useLandingPage } from '@/components/landing-page-context'

type LogoAsset = {
    name: string
    light: string
    dark: string
    height?: string
}

const logoBase = '/Logos for landing page'

const logoAsset = (name: string, light: string, dark: string, height = '1.5rem'): LogoAsset => ({
    name,
    light: `${logoBase}/Light mode/${light}`,
    dark: `${logoBase}/Dark mode/${dark}`,
    height,
})

const logos: Record<'operations' | 'finance' | 'engineering' | 'sales' | 'marketing' | 'more', LogoAsset[]> = {
    operations: [
        logoAsset('Airtable', 'Airtable/Airtable_idVHS6Pdqb_0.svg', 'Airtable-2/Airtable_idsyXgmlAP_0.svg'),
        logoAsset('Notion', 'Notion/Notion_Logo_0.svg', 'Notion/Notion_Logo_0.svg'),
        logoAsset('Asana', 'Asana/Asana_idgyOBeSXC_0.svg', 'Asana-2/Asana_idmTfCNPDT_0.svg'),
        logoAsset('Cal.com', 'Cal-com/Cal-com_idvcCwbTDI_0.svg', 'Cal-com-2/Cal-com_idQDvBAWQz_0.svg'),
        logoAsset('Zapier', 'Zapier/Zapier_idMPnFrbc7_0.svg', 'Zapier-2/Zapier_idfZNtxiND_0.svg'),
    ],
    finance: [
        logoAsset('QuickBooks', 'QuickBooks_Integration copy/QuickBooks_Integration_idtLcbEf85_1.svg', 'QuickBooks_Integration/QuickBooks_Integration_idtLcbEf85_1.svg'),
        logoAsset('Stripe', 'Stripe/Stripe_Logo_0.svg', 'Stripe-2/Stripe_Logo_0.svg'),
        logoAsset('PayPal', 'PayPal/PayPal_Logo_0.svg', 'PayPal-2/PayPal_Logo_0.svg'),
        logoAsset('Xero', 'Xero/Xero_Xero_Wordmark_Midnight_0.svg', 'Xero-2/Xero_Xero_Wordmark_White_0.svg'),
        logoAsset('Accountable', 'Accountable/Accountable_idqQuJv6-A_0.svg', 'Accountable-2/Accountable_idad5jJwyI_0.svg'),
    ],
    engineering: [
        logoAsset('GitHub', 'GitHub/GitHub_Logo_0.svg', 'GitHub-2/GitHub_Logo_0.svg'),
        logoAsset('Vercel', 'Vercel/Vercel_Logo_0.svg', 'Vercel-2/Vercel_Logo_0.svg'),
        logoAsset('Supabase', 'Supabase-2/Supabase_id9q7Wa4Ba_0.svg', 'Supabase/Supabase_idZ_4AZztt_0.svg'),
        logoAsset('Linear', 'Linear/Linear_Logo_0.svg', 'Linear-2/Linear_Logo_0.svg'),
        logoAsset('Sentry', 'Sentry/Sentry_idatXqcaDf_0.svg', 'Sentry-2/Sentry_idsTcVEvlQ_0.svg'),
    ],
    sales: [
        logoAsset('HubSpot', 'HubSpot/HubSpot_idHe7kSdFV_0.svg', 'HubSpot-2/HubSpot_idHe7kSdFV_0.svg'),
        logoAsset('Pipedrive', 'Pipedrive/Pipedrive_idHo6Lfa2R_0.svg', 'Pipedrive-2/Pipedrive_idvxAd_UEa_0.svg'),
        logoAsset('Calendly', 'Calendly/Calendly_idGx75u1Xb_0.svg', 'Calendly-2/Calendly_idkbixDmT2_0.svg'),
        logoAsset('Cal.com', 'Cal-com/Cal-com_idvcCwbTDI_0.svg', 'Cal-com-2/Cal-com_idQDvBAWQz_0.svg'),
        logoAsset('LinkedIn', 'LinkedIn/LinkedIn_Logo_0.svg', 'LinkedIn-2/LinkedIn_Logo_0.svg'),
    ],
    marketing: [
        logoAsset('Instagram', 'Instagram/Instagram_Logo_0.svg', 'Instagram-2/Instagram_Logo_0.svg'),
        logoAsset('LinkedIn', 'LinkedIn/LinkedIn_Logo_0.svg', 'LinkedIn-2/LinkedIn_Logo_0.svg'),
        logoAsset('Meta', 'Meta/Meta_idwdgcJw5c_0.svg', 'Meta-2/Meta_id0D-m9C5l_0.svg'),
        logoAsset('Mailchimp', 'Mailchimp/Mailchimp_id-GhpqWpt_0.svg', 'Mailchimp-2/Mailchimp_id-GhpqWpt_0.svg'),
        logoAsset('Analytics Insight', 'Analytics_Insight®/Analytics_Insight®_idFLRvosxz_0.svg', 'Analytics_Insight®-2/Analytics_Insight®_idStK-qYte_0.svg'),
    ],
    more: [
        logoAsset('OpenAI', 'OpenAI/OpenAI_Logo_0.svg', 'OpenAI-2/OpenAI_Logo_0.svg'),
        logoAsset('Claude', 'Claude/Claude_Logo_0.svg', 'Claude-2/Claude_Logo_0.svg'),
        logoAsset('Zapier', 'Zapier/Zapier_idMPnFrbc7_0.svg', 'Zapier-2/Zapier_idfZNtxiND_0.svg'),
        logoAsset('Atmet', 'Logo.png', 'Logo-2.png', '1.75rem'),
        logoAsset('Supabase', 'Supabase-2/Supabase_id9q7Wa4Ba_0.svg', 'Supabase/Supabase_idZ_4AZztt_0.svg'),
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
                                key={`${currentGroup}-${logo.name}`}
                                className="mask-b-from-55% flex h-10 items-center justify-center"
                                initial={{ opacity: 0, y: 24, filter: 'blur(6px)' }}
                                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                                exit={{ opacity: 0, y: -24, filter: 'blur(6px)', scale: 0.5 }}
                                transition={{ delay: i * 0.05, duration: 0.4 }}>
                                <LogoMark logo={logo} />
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            </div>
        </section>
    )
}

function LogoMark({ logo }: { logo: LogoAsset }) {
    return (
        <>
            <img
                src={logo.light}
                alt=""
                aria-hidden="true"
                className="block max-w-36 object-contain brightness-0 dark:hidden"
                style={{ height: logo.height }}
            />
            <img
                src={logo.dark}
                alt=""
                aria-hidden="true"
                className="hidden max-w-36 object-contain brightness-0 invert dark:block"
                style={{ height: logo.height }}
            />
        </>
    )
}
