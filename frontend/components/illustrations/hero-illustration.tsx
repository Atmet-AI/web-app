'use client'

import Image from 'next/image'
import { useState } from 'react'

import { cn } from '@/lib/utils'

const heroImages = [
    {
        label: 'Build agent',
        light: '/Lite%20atmet.png',
        dark: '/dark%20Atemt%20.png',
        width: 1920,
        height: 1440,
    },
    {
        label: 'Connect apps',
        light: '/more%203%20images%20/image%202%20light.png',
        dark: '/more%203%20images%20/Image%202%20dark.png',
        width: 2882,
        height: 2210,
    },
    {
        label: 'Run workflow',
        light: '/more%203%20images%20/image%203%20light.png',
        dark: '/more%203%20images%20/image%203%20dark.png',
        width: 1180,
        height: 770,
    },
    {
        label: 'Review output',
        light: '/more%203%20images%20/iamge%204%20light.png',
        dark: '/more%203%20images%20/Screen%20Shot%202026-07-12%20at%2023.27.59.png',
        width: 10000,
        height: 7000,
    },
]

export const HeroIllustration = () => {
    const [activeImage, setActiveImage] = useState(0)
    const selectedImage = heroImages[activeImage]

    return (
        <div className="mx-auto mt-auto flex w-[min(calc(100vw_-_3rem),75rem)] flex-1 flex-col justify-end pt-12 md:pt-16">
            <div className="mb-0 grid grid-cols-2 border-y border-border/70 bg-background/80 backdrop-blur-md md:grid-cols-4" role="tablist" aria-label="Hero image preview">
                {heroImages.map((image, index) => (
                    <button
                        key={image.label}
                        aria-label={`Show ${image.label} preview`}
                        aria-selected={activeImage === index}
                        className={cn(
                            "relative flex h-11 items-center border-e border-border/70 px-4 text-start text-sm font-medium transition-colors last:border-e-0 active:translate-y-px",
                            activeImage === index
                                ? "text-foreground before:absolute before:inset-x-0 before:top-0 before:h-0.5 before:bg-primary"
                                : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                        )}
                        role="tab"
                        type="button"
                        onClick={() => setActiveImage(index)}
                    >
                        {image.label}
                    </button>
                ))}
            </div>
            <div className="flex min-h-[18rem] flex-1 items-end overflow-hidden">
                <Image
                    className="-mb-px hidden h-auto max-h-full w-full object-contain object-bottom dark:block"
                    src={selectedImage.dark}
                    alt={`Atmet platform preview ${selectedImage.label}`}
                    width={selectedImage.width}
                    height={selectedImage.height}
                    sizes="(max-width: 1280px) calc(100vw - 3rem), 75rem"
                    priority={activeImage === 0}
                    fetchPriority={activeImage === 0 ? "high" : "auto"}
                />
                <Image
                    className="-mb-px block h-auto max-h-full w-full object-contain object-bottom dark:hidden"
                    src={selectedImage.light}
                    alt={`Atmet platform preview ${selectedImage.label}`}
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
