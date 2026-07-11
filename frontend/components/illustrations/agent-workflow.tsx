import { Brain, Check, CircleDashed, Database, Search, Zap } from 'lucide-react'

export const AgentWorkflowIllustration = () => {
    return (
        <div
            aria-hidden
            className="before:bg-card after:bg-card/75 before:z-1 group relative w-full min-w-0 px-2 pb-1 pt-6 before:absolute before:inset-x-4 before:bottom-4 before:top-4 before:rounded-2xl before:shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08)] before:backdrop-blur after:absolute after:inset-x-7 after:bottom-4 after:top-2 after:rounded-2xl after:shadow-[inset_0_0_0_1px_rgb(255_255_255/0.06)]">
            <div className="bg-card shadow-black/6.5 relative z-10 rounded-2xl p-6 shadow-lg shadow-[inset_0_0_0_1px_rgb(255_255_255/0.1)]">
                <div className="text-base font-medium">Workflow</div>

                <div className="mt-4 space-y-0.5">
                    <div className="flex items-center gap-3">
                        <LogoContainer>
                            <Search className="size-4" />
                        </LogoContainer>
                        <div className="flex-1 space-y-1">
                            <div className="text-foreground text-sm font-medium">Query Analysis</div>
                            <div className="text-muted-foreground text-xs">Extract intent and entities</div>
                        </div>
                        <div className="flex size-6 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            <Check className="size-3.5" />
                        </div>
                    </div>

                    <div className="ms-5 border-s border-dashed border-white/10 py-3.5"></div>

                    <div className="flex items-center gap-3">
                        <LogoContainer>
                            <Database className="size-4 text-blue-600 dark:text-blue-400" />
                        </LogoContainer>
                        <div className="flex-1 space-y-1">
                            <div className="text-foreground text-sm font-medium">Context Retrieval</div>
                            <div className="text-muted-foreground text-xs">Searching vector database</div>
                        </div>
                        <div className="flex size-6 animate-pulse rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
                            <CircleDashed className="m-auto size-4 animate-spin" />
                        </div>
                    </div>

                    <div className="ms-5 border-s border-dashed border-white/10 py-3.5"></div>

                    <div className="flex items-center gap-3 opacity-50">
                        <LogoContainer>
                            <Brain className="size-4" />
                        </LogoContainer>
                        <div className="flex-1 space-y-1">
                            <div className="text-foreground text-sm font-medium">Response Generation</div>
                            <div className="text-muted-foreground line-clamp-1 text-xs">Run inference with context</div>
                        </div>
                        <div className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs">Pending</div>
                    </div>

                    <div className="ms-5 border-s border-dashed border-white/10 py-3 opacity-50"></div>

                    <div className="flex items-center gap-3 opacity-50">
                        <LogoContainer>
                            <Zap className="size-4" />
                        </LogoContainer>
                        <div className="flex-1 space-y-1">
                            <div className="text-foreground text-sm font-medium">Output Delivery</div>
                            <div className="text-muted-foreground text-xs">Stream response to client</div>
                        </div>
                        <div className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs">Pending</div>
                    </div>
                </div>
            </div>
        </div>
    )
}

const LogoContainer = ({ children }: { children: React.ReactNode }) => {
    return <div className="bg-linear-to-b from-muted to-background inset-ring-3 inset-ring-background bg-card flex size-10 items-center justify-center rounded-lg shadow-md shadow-[inset_0_0_0_1px_rgb(255_255_255/0.1)]">{children}</div>
}

export default AgentWorkflowIllustration
