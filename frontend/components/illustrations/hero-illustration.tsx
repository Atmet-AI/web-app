'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { motion } from 'motion/react'

import { cn } from '@/lib/utils'
import { useLandingPage } from '@/components/landing-page-context'

const HERO_ROTATION_MS = 5000

const heroImages = [
    {
        light: '/hero%20section%20images/Image%201%20light.png',
        dark: '/hero%20section%20images/image%201%20dark.png',
        width: 3498,
        height: 2226,
    },
    {
        light: '/hero%20section%20images/image%202%20light.png',
        dark: '/hero%20section%20images/image%202%20dark.png',
        width: 3498,
        height: 2226,
    },
    {
        light: '/hero%20section%20images/image%203%20light.png',
        dark: '/hero%20section%20images/image%203%20dark.png',
        width: 3498,
        height: 2226,
    },
    {
        light: '/hero%20section%20images/image%204%20light.png',
        dark: '/hero%20section%20images/image%204%20dark.png',
        width: 3498,
        height: 2226,
    },
]

export const HeroIllustration = () => {
    const { t } = useLandingPage()
    const [activeImage, setActiveImage] = useState(0)
    const selectedImage = heroImages[activeImage]
    const tabLabels = t.heroPreview.tabs

    useEffect(() => {
        const timeout = window.setTimeout(() => {
            setActiveImage((current) => (current + 1) % heroImages.length)
        }, HERO_ROTATION_MS)

        return () => window.clearTimeout(timeout)
    }, [activeImage])

    return (
        <div className="mx-auto mt-auto flex w-[min(calc(100vw_-_3rem),75rem)] flex-1 flex-col justify-end pt-12 md:pt-16">
            <div className="mb-0 grid grid-cols-2 border-y border-border/70 bg-background/80 backdrop-blur-md md:grid-cols-4" role="tablist" aria-label="Hero image preview">
                {heroImages.map((_, index) => (
                    <button
                        key={tabLabels[index]}
                        aria-label={`Show ${tabLabels[index]} preview`}
                        aria-selected={activeImage === index}
                        className={cn(
                            "relative flex h-11 min-w-0 items-center overflow-hidden border-e border-border/70 px-4 text-start text-sm font-medium transition-colors last:border-e-0 active:translate-y-px",
                            activeImage === index
                                ? "text-foreground"
                                : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                        )}
                        role="tab"
                        type="button"
                        onClick={() => setActiveImage(index)}
                    >
                        {activeImage === index ? (
                            <motion.span
                                key={activeImage}
                                aria-hidden="true"
                                className="absolute inset-x-0 top-0 h-0.5 origin-left bg-primary rtl:origin-right"
                                initial={{ scaleX: 0 }}
                                animate={{ scaleX: 1 }}
                                transition={{ duration: HERO_ROTATION_MS / 1000, ease: 'linear' }}
                            />
                        ) : null}
                        <span className="truncate">{tabLabels[index]}</span>
                    </button>
                ))}
            </div>
            <div className="flex min-h-[18rem] flex-1 items-end overflow-hidden">
                <Image
                    className="-mb-px hidden h-auto max-h-full w-full object-contain object-bottom dark:block"
                    src={selectedImage.dark}
                    alt={`Atmet platform preview ${tabLabels[activeImage]}`}
                    width={selectedImage.width}
                    height={selectedImage.height}
                    sizes="(max-width: 1280px) calc(100vw - 3rem), 75rem"
                    priority={activeImage === 0}
                    fetchPriority={activeImage === 0 ? "high" : "auto"}
                />
                <Image
                    className="-mb-px block h-auto max-h-full w-full object-contain object-bottom dark:hidden"
                    src={selectedImage.light}
                    alt={`Atmet platform preview ${tabLabels[activeImage]}`}
                    width={selectedImage.width}
                    height={selectedImage.height}
                    sizes="(max-width: 1280px) calc(100vw - 3rem), 75rem"
                    priority={activeImage === 0}
                    fetchPriority={activeImage === 0 ? "high" : "auto"}
                />
            </div>
        </div>
    )
}
