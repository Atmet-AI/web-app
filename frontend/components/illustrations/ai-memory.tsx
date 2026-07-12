'use client'

import { Clock, MessageSquare } from 'lucide-react'
import { useLandingPage } from '@/components/landing-page-context'

export const AiMemoryIllustration = () => {
    const { t } = useLandingPage()

    return (
        <div
            aria-hidden
            className="w-full min-w-0">
            <div className="perspective-dramatic flex flex-col gap-4">
                <div className="mask-radial-[100%_100%] mask-radial-from-75% mask-radial-at-top-left rotate-x-5 rotate-z-6 -rotate-4 ps-6 pt-1">
                    <div className="bg-background/75 shadow-black/6.5 rounded-2xl border border-border p-2 shadow-lg shadow-[inset_0_0_0_1px_rgb(30_144_255/0.12)]">
                        <div className="flex items-center gap-2 px-4 py-3">
                            <div className="text-sm font-medium">{t.illustrations.memoryTitle}</div>
                            <div className="bg-primary/10 text-primary ms-auto rounded-full px-2 py-0.5 text-xs">{t.illustrations.memoryActive}</div>
                        </div>
                        <div className="bg-card rounded-xl border border-border p-4 shadow-[inset_0_0_0_1px_rgb(30_144_255/0.1)]">
                            <div className="space-y-3">
                                <div className="text-muted-foreground text-xs">{t.illustrations.memoryWindow}</div>

                                <div className="bg-muted relative h-3 overflow-hidden rounded-full">
                                    <div className="bg-primary/40 absolute inset-y-0 start-0 w-[30%] rounded-full"></div>
                                    <div className="bg-primary absolute inset-y-0 start-[30%] w-[45%] rounded-full"></div>
                                    <div className="absolute inset-0 flex items-center justify-center text-[8px] font-medium text-white">{t.illustrations.memorySynced}</div>
                                </div>
                            </div>

                            <div className="mt-4 space-y-3">
                                <div className="text-muted-foreground text-xs">{t.illustrations.remembered}</div>

                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-2 rounded-lg bg-purple-500/10 p-2 ring-1 ring-purple-500/20">
                                        <MessageSquare className="size-3.5 shrink-0 text-purple-600 dark:text-purple-400" />
                                        <div className="flex-1 truncate text-[10px]">{t.illustrations.memories[0]}</div>
                                        <Clock className="text-muted-foreground size-2.5 shrink-0" />
                                        <span className="text-muted-foreground text-[10px]">Now</span>
                                    </div>

                                    <div className="flex items-center gap-2 rounded-lg bg-blue-500/10 p-2 ring-1 ring-blue-500/20">
                                        <MessageSquare className="size-3.5 shrink-0 text-blue-600 dark:text-blue-400" />
                                        <div className="flex-1 truncate text-[10px]">{t.illustrations.memories[1]}</div>
                                        <Clock className="text-muted-foreground size-2.5 shrink-0" />
                                        <span className="text-muted-foreground text-[10px]">4m</span>
                                    </div>

                                    <div className="flex items-center gap-2 rounded-lg bg-cyan-500/10 p-2 ring-1 ring-cyan-500/20">
                                        <MessageSquare className="size-3.5 shrink-0 text-cyan-600 dark:text-cyan-400" />
                                        <div className="flex-1 truncate text-[10px]">{t.illustrations.memories[2]}</div>
                                        <Clock className="text-muted-foreground size-2.5 shrink-0" />
                                        <span className="text-muted-foreground text-[10px]">8m</span>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-3 flex items-center justify-between text-xs">
                                <div className="text-muted-foreground">{t.illustrations.memoriesActive}</div>
                                <span className="text-primary">Review</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default AiMemoryIllustration
