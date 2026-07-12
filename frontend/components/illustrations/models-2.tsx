import { Gemini } from '@/components/ui/svgs/gemini'
import { MistralAi } from '@/components/ui/svgs/mistral-ai'
import { Openai } from '@/components/ui/svgs/openai'
import { Deepseek } from '@/components/ui/svgs/deepseek'
import { Cohere } from '@/components/ui/svgs/cohere'

type Model = {
    name: string
    icon: React.ReactNode
}

export const Models2Illustration = () => {
    const models: Model[] = [
        { name: 'Deepseek', icon: <Deepseek /> },
        { name: 'Cohere AI', icon: <Cohere /> },
        { name: 'Gemini', icon: <Gemini /> },
        { name: 'Open AI', icon: <Openai className="fill-foreground" /> },
        { name: 'Mistral AI', icon: <MistralAi /> },
    ]

    return (
        <div
            aria-hidden
            className="mask-x-from-75% relative w-full min-w-0 py-6">
            <div className="relative mx-auto max-w-md">
                <Gemini className="absolute left-1/2 top-1/2 z-0 size-14 -translate-x-1/2 -translate-y-1/2 blur-md dark:opacity-50" />

                <div className="not-dark:bg-illustration absolute left-1/2 top-1/2 z-0 size-14 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/20" />

                <div className="relative z-10 grid grid-cols-5 items-center">
                    {models.map((model, index) => (
                        <div
                            key={index}
                            className="flex h-14 items-center justify-center">
                            <div className="rotate-x-5 not-nth-3:opacity-75 flex size-14 items-center justify-center [&>svg]:m-auto [&>svg]:size-7">
                                {model.icon}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="text-foreground/65 mt-3 text-center text-sm font-medium">Gemini</div>
        </div>
    )
}
export default Models2Illustration
