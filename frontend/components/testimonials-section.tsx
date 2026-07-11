'use client'

import { PrimeVideo as Primevideo } from '@/components/ui/svgs/prime-video'
import { Tailwindcss as TailwindCSS } from '@/components/ui/svgs/tailwindcss'
import { VercelWordmark as VercelFull } from '@/components/ui/svgs/vercel'

import { motion, AnimatePresence } from 'motion/react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Star, Zap } from 'lucide-react'
import { TextEffect } from '@/components/ui/text-effect'
import { ADAM_AVATAR, GLODIE_AVATAR, SHADCN_AVATAR } from '@/lib/const'

const testimonialsData = [
    {
        id: 'tailwindcss' as const,
        LogoComponent: TailwindCSS,
        cardLogoProps: { className: 'h-7 w-44' },
        text: 'Atmet feels like adding an operations teammate who already knows where the work lives. We can turn messy recurring tasks into clear workflows without building internal tools from scratch.',
        avatar: ADAM_AVATAR,
        name: 'Adam Wathan',
        title: 'Operations Lead',
        resultText: '40% fewer manual handoffs across recurring workflows',
        resultText2: '50% faster onboarding for repeatable team processes',
    },
    {
        id: 'vercel' as const,
        LogoComponent: VercelFull,
        cardLogoProps: { className: 'h-7 w-30 ' },
        text: 'The best part is that Atmet keeps humans in the loop. The agent prepares the work, shows what it plans to do, and lets us approve the sensitive steps before anything moves.',
        avatar: SHADCN_AVATAR,
        name: 'Shadcn',
        title: 'Founder',
        resultText: '25% more work completed without switching between tools',
        resultText2: '30% faster turnaround on routine requests',
    },
    {
        id: 'prime' as const,
        LogoComponent: Primevideo,
        cardLogoProps: { className: 'h-7 w-20' },
        text: 'We needed automation that could adapt to our real process, not a brittle checklist. Atmet gives us connected context, files, approvals, and a clear activity trail in one place.',
        avatar: GLODIE_AVATAR,
        name: 'Glodie Lukose',
        title: 'Product Manager',
        resultText: '35% less time spent recreating context for each task',
        resultText2: '20% more team capacity recovered from admin work',
    },
]

type TestimonialId = (typeof testimonialsData)[number]['id']

const animationVariants = {
    exit: { opacity: 0, y: 6 },
    initial: { opacity: 0, y: -6 },
    animate: { opacity: 1, y: 0 },
}

export function TestimonialsSection() {
    const [testimonial, setTestimonial] = useState<TestimonialId>('tailwindcss')

    return (
        <section className="@container py-24 md:py-40">
            <div className="mx-auto w-full max-w-5xl px-6">
                <div className="relative">
                    {(() => {
                        const currentTestimonialData = testimonialsData.find((t) => t.id === testimonial)
                        if (!currentTestimonialData) return null
                        const { LogoComponent, cardLogoProps, text, avatar, name, title, resultText, resultText2, id } = currentTestimonialData
                        return (
                            <div className="@2xl:grid-cols-3 grid">
                                <div className="row-span-3 grid grid-rows-subgrid gap-12">
                                    <div className="grid gap-3 self-start ps-px">
                                        <div className="before:border-foreground/25 before:inset-ring-1 before:inset-ring-black/25 relative aspect-square size-20 overflow-hidden rounded-xl shadow-md shadow-black/15 before:absolute before:inset-0 before:rounded-xl before:border before:ring-1">
                                            <img
                                                src={avatar}
                                                alt={`Avatar of ${name}`}
                                                height="460"
                                                width="460"
                                            />
                                        </div>
                                        <div className="space-y-0.5 text-base *:block">
                                            <span className="text-foreground font-medium">{name}</span>
                                            <span className="text-muted-foreground text-sm">{title}</span>
                                        </div>
                                    </div>

                                    <div className="@max-2xl:row-start-1 relative w-fit self-center py-0.5">
                                        <span className="border-foreground/10 mask-x-from-75% absolute -inset-x-12 inset-y-0 border-y"></span>
                                        <div className="flex items-center gap-3 py-1">
                                            {testimonialsData.map((t) => (
                                                <button
                                                    onClick={() => setTestimonial(t.id)}
                                                    key={t.id}
                                                    aria-label={t.name}
                                                    className={cn('relative aspect-square size-8 cursor-pointer overflow-hidden rounded-md shadow-md shadow-black/15 duration-200 ease-out', 'before:border-foreground/25 before:inset-ring-1 before:inset-ring-black/25 before:absolute before:inset-0 before:rounded-md before:border before:ring-1', t.id !== testimonial && 'grayscale-100 scale-98 opacity-50')}>
                                                    <img
                                                        src={t.avatar}
                                                        alt={`Avatar of ${t.name}`}
                                                        height="460"
                                                        width="460"
                                                    />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="@2xl:col-span-2 row-span-3 grid grid-rows-subgrid gap-12">
                                    <AnimatePresence
                                        initial={false}
                                        mode="wait">
                                        <motion.div
                                            key={id}
                                            variants={animationVariants}
                                            exit="exit"
                                            initial="initial"
                                            animate="animate"
                                            transition={{ duration: 0.25, ease: 'easeInOut' }}>
                                            <p className='text-2xl before:me-1 before:font-serif before:content-["\201C"] after:ms-1 after:font-serif after:content-["\201D"] lg:text-3xl'>{text}</p>
                                        </motion.div>
                                    </AnimatePresence>
                                    <AnimatePresence
                                        initial={false}
                                        mode="wait">
                                        <motion.div
                                            key={`logo-${id}`}
                                            variants={animationVariants}
                                            exit="exit"
                                            initial="initial"
                                            animate="animate"
                                            transition={{ duration: 0.25, delay: 0.075, ease: 'easeInOut' }}
                                            className="**:fill-foreground self-center">
                                            <LogoComponent {...cardLogoProps} />
                                        </motion.div>
                                    </AnimatePresence>

                                    <div className="relative">
                                        <PlusDecorator className="-translate-[calc(50%-0.5px)]" />
                                        <PlusDecorator className="end-0 -translate-y-[calc(50%-0.5px)] translate-x-[calc(50%-0.5px)] rtl:-translate-x-[calc(50%-0.5px)]" />
                                        <PlusDecorator className="bottom-0 end-0 translate-x-[calc(50%-0.5px)] rtl:-translate-x-[calc(50%-0.5px)] translate-y-[calc(50%-0.5px)]" />
                                        <PlusDecorator className="bottom-0 -translate-x-[calc(50%-0.5px)] rtl:translate-x-[calc(50%-0.5px)] translate-y-[calc(50%-0.5px)]" />
                                        <div className="relative grid grid-cols-2 border py-6">
                                            <span className="bg-foreground/10 border-background pointer-events-none absolute inset-y-4 start-1/2 w-0.5 rounded border-e"></span>

                                            <div className="space-y-4 px-6">
                                                <div
                                                    aria-hidden
                                                    className="flex justify-center gap-1">
                                                    <Star className="fill-muted-foreground stroke-muted-foreground size-5 drop-shadow" />
                                                    <Star className="fill-muted-foreground stroke-muted-foreground size-5 drop-shadow" />
                                                    <Star className="fill-muted-foreground stroke-muted-foreground size-5 drop-shadow" />
                                                    <Star className="fill-muted-foreground stroke-muted-foreground size-5 drop-shadow" />
                                                    <Star className="fill-muted-foreground stroke-muted-foreground size-5 drop-shadow" />
                                                </div>
                                                <TextEffect
                                                    preset="fade"
                                                    per="char"
                                                    delay={0.25}
                                                    speedReveal={5}
                                                    key={id}
                                                    className="text-muted-foreground text-balance text-center text-sm font-medium">
                                                    {resultText}
                                                </TextEffect>
                                            </div>
                                            <div className="space-y-4 px-6">
                                                <div
                                                    aria-hidden
                                                    className="flex justify-center gap-1">
                                                    <Zap className="fill-muted-foreground stroke-muted-foreground size-5 drop-shadow" />
                                                    <Zap className="fill-muted-foreground stroke-muted-foreground size-5 drop-shadow" />
                                                    <Zap className="fill-muted-foreground stroke-muted-foreground size-5 drop-shadow" />
                                                    <Zap className="fill-muted-foreground stroke-muted-foreground size-5 drop-shadow" />
                                                    <Zap className="fill-muted-foreground stroke-muted-foreground size-5 drop-shadow" />
                                                </div>
                                                <TextEffect
                                                    preset="fade"
                                                    per="char"
                                                    delay={0.25}
                                                    speedReveal={5}
                                                    key={id}
                                                    className="text-muted-foreground text-balance text-center text-sm font-medium">
                                                    {resultText2}
                                                </TextEffect>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })()}
                </div>
            </div>
        </section>
    )
}

const PlusDecorator = ({ className }: { className?: string }) => (
    <div
        aria-hidden
        className={cn('mask-radial-from-15% z-1 before:bg-foreground/25 after:bg-foreground/25 absolute size-3 before:absolute before:inset-0 before:m-auto before:h-px after:absolute after:inset-0 after:m-auto after:w-px', className)}
    />
)
