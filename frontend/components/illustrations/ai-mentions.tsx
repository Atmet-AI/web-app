import { CornerDownLeft } from 'lucide-react'
import { Figma } from '@/components/ui/svgs/figma'
import { MicrosoftExcel } from '@/components/ui/svgs/microsoft-excel'
import { MicrosoftWord } from '@/components/ui/svgs/microsoft-word'

type Result = {
    icon: React.ReactNode
    text: string
}

export const AiMentionsIllustration = () => {
    const results: Result[] = [
        { icon: <Figma className="size-4" />, text: 'design-system.fig' },
        { icon: <MicrosoftExcel className="size-4" />, text: 'april-report.xlsx' },
        { icon: <MicrosoftWord className="size-4" />, text: 'annual-summary.docx' },
        { icon: <MicrosoftExcel className="size-4" />, text: 'budget-2024.xlsx' },
        { icon: <MicrosoftWord className="size-4" />, text: 'meeting-notes.docx' },
    ]
    return (
        <div
            aria-hidden
            className="w-full min-w-0">
            <div className="text-muted-foreground relative rounded-lg p-3 text-xs leading-relaxed shadow-[inset_0_0_0_1px_rgb(255_255_255/0.1)]">
                Build an agent for every overdue invoice,
                <br />
                check the account in HubSpot,
                <br />
                find the last customer email thread,
                <br />
                create a task for the account owner,
                <br />
                and ask me before sending with{' '}
                <span className="relative w-fit items-center">
                    <span className="bg-linear-to-r absolute inset-0 h-5 -translate-y-0.5 via-indigo-500/15 to-emerald-500/15" />
                    <span>@</span>
                    <span className="bg-foreground absolute inset-y-0 -end-px inline-block h-5 w-[1.5px] -translate-y-0.5 animate-pulse" />
                </span>
            </div>

            <div className="bg-illustration shadow-black/6.5 mt-2 overflow-hidden rounded-xl shadow-lg shadow-[inset_0_0_0_1px_rgb(255_255_255/0.1)]">
                <div className="divide-y divide-white/10">
                    {results.map((result, index) => (
                        <div
                            key={index}
                            className="hover:bg-foreground/5 group/result flex cursor-pointer items-center gap-2 px-3 py-2.5 transition-colors">
                            <div className="not-group-hover:/result:text-muted-foreground flex gap-1.5">
                                <div className="[&>svg]:size-3.5">{result.icon}</div>
                                <div className="flex-1 text-xs">{result.text}</div>
                            </div>
                            <div className="bg-background text-muted-foreground not-group-first/result:hidden ms-auto flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] shadow-[inset_0_0_0_1px_rgb(255_255_255/0.1)]">
                                <CornerDownLeft className="size-2.5" />
                                Tab
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="mt-4 flex items-center justify-between text-xs">
                <div className="text-muted-foreground">3 suggestions</div>
                <div className="text-muted-foreground flex items-center gap-1">
                    <span className="bg-background rounded px-1 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.1)]">↑</span>
                    <span className="bg-background rounded px-1 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.1)]">↓</span>
                    to navigate
                </div>
            </div>
        </div>
    )
}

export default AiMentionsIllustration
