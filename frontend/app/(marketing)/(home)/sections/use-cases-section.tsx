'use client'

import React from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronDown } from 'lucide-react'

import { useLandingPage } from '@/components/landing-page-context'
import { cn } from '@/lib/utils'

export function UseCasesSection() {
    const { language, t } = useLandingPage()
    const [openIndex, setOpenIndex] = React.useState(0)

    return (
        <section id="use-cases" className="bg-background">
            <div className="py-16 md:py-20">
                <div className="mx-auto w-full max-w-5xl px-6">
                    <div className="max-w-3xl">
                        <span className="font-mono text-sm uppercase text-primary">{t.useCases.eyebrow}</span>
                        <h2 className={cn('mt-8 text-balance text-4xl font-semibold text-foreground md:text-5xl', language === 'ar' && 'font-thmanyah-serif-display')}>
                            {t.useCases.title}
                        </h2>
                        <p className="mt-4 max-w-2xl text-balance text-muted-foreground">{t.useCases.description}</p>
                    </div>

                    <div className="mt-12 max-w-4xl">
                        <div className="divide-y divide-border/70 border-y border-border/70">
                            {t.useCases.items.map((item, index) => {
                                const isOpen = openIndex === index

                                return (
                                    <div key={item.title}>
                                        <button
                                            type="button"
                                            aria-expanded={isOpen}
                                            onClick={() => setOpenIndex(isOpen ? -1 : index)}
                                            className="group flex w-full items-center gap-4 py-4 text-start">
                                            <span className="min-w-0 flex-1 text-[0.95rem] font-medium text-foreground">{item.title}</span>
                                            <ChevronDown className={cn('size-4 shrink-0 text-muted-foreground transition-transform duration-200', isOpen && 'rotate-180 text-foreground')} />
                                        </button>

                                        <AnimatePresence initial={false}>
                                            {isOpen && (
                                                <motion.div
                                                    key="content"
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
                                                    className="overflow-hidden">
                                                    <p className="max-w-2xl pb-5 text-sm leading-6 text-muted-foreground">{item.description}</p>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
