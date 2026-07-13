'use client'

import { Figma } from '@/components/ui/svgs/figma'
import { Drive } from '@/components/ui/svgs/drive'
import { Search } from 'lucide-react'
import { useLandingPage } from '@/components/landing-page-context'

type Result = {
    title: string
    content: string
    filename: string
    fileIcon: React.ReactNode
    image: string
}

export const AiSearch2Illustration = () => {
    const { t } = useLandingPage()
    const results: Result[] = [
        {
            title: 'Hero Section Illustrations Pack',
            content: 'A collection of 24 hand-crafted illustrations perfect for landing pages, featuring abstract shapes and gradients...',
            filename: 'hero-illustrations.png',
            fileIcon: <Drive />,
            image: 'https://images.unsplash.com/photo-1709803983276-7bcb343e3a9f?q=80&w=1276&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
        },
        {
            title: 'Tailark Design System v2.0',
            content: 'Complete documentation for colors, typography, spacing tokens, and 50+ reusable UI components...',
            filename: 'tailark-ds.fig',
            fileIcon: <Figma />,
            image: 'https://images.unsplash.com/photo-1634322487121-ba84c23cbc78?q=80&w=1335&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
        },
        {
            title: 'Marketing Illustration Library',
            content: 'Over 100 customizable vector illustrations for marketing campaigns, social media, and product showcases...',
            filename: 'marketing-illustrations.png',
            fileIcon: <Drive />,
            image: 'https://images.unsplash.com/photo-1613206468203-fa00870edf79?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
        },
    ]

    return (
        <div
            aria-hidden
            className="relative w-full min-w-0">
            <div className="perspective-dramatic flex flex-col gap-4">
                <div className="mask-radial-[100%_100%] mask-radial-from-75% mask-radial-at-top-left rotate-x-3 -rotate-4 rotate-z-6 space-y-3 ps-6 pt-1">
                    <div className="rounded-2xl border border-border bg-zinc-100/80 p-2 dark:bg-background/75">
                        <div className="flex items-center gap-2 p-4">
                            <Search className="size-4" />
                            <span className="">{t.illustrations.skillSearch}</span>
                        </div>
                        <div className="divide-y divide-border rounded-2xl border border-border bg-white/85 dark:bg-background/85">
                            {results.map((result, index) => (
                                <div
                                    key={index}
                                    className="hover:bg-foreground/3 flex cursor-pointer select-none gap-4 rounded-lg p-4">
                                    <div className="relative h-fit">
                                        <div className="before:border-foreground/5 relative size-10 overflow-hidden rounded-xl before:absolute before:inset-0 before:rounded-xl before:border">
                                            <img
                                                src={result.image}
                                                alt={result.title}
                                                className="size-full object-cover"
                                            />
                                        </div>
                                        <div className="bg-background translate-1/2 absolute bottom-0 end-0 flex size-5 items-center justify-center rounded-full *:size-3">{result.fileIcon}</div>
                                    </div>

                                    <div className="flex-1 space-y-1">
                                        <div className="font-medium">{t.illustrations.skillResults[index][0]}</div>
                                        <span className="text-foreground block text-xs">
                                            <span className="text-muted-foreground"> {t.illustrations.skillResults[index][1]}</span>
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default AiSearch2Illustration
