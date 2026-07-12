import Image from 'next/image'

export const HeroIllustration = () => {
    return (
        <div className="@container perspective-dramatic mask-[radial-gradient(ellipse_80%_95%_at_50%_0%,#000_80%,transparent_100%)] max-lg:pt-12">
            <div className="rotate-x-[0.125deg] relative mx-auto max-w-6xl px-3 lg:px-12 lg:pt-20">
                <div className="bg-linear-to-b from-foreground rotate-66 absolute inset-0 z-10 mx-auto w-8 -translate-y-44 rounded-full opacity-5 blur-xl"></div>
                <div className="bg-linear-to-b from-foreground rotate-66 absolute inset-0 z-10 mx-auto w-16 -translate-y-32 translate-x-44 rounded-full opacity-20 blur-2xl rtl:-translate-x-44"></div>
                <Image
                    className="relative z-0 mx-auto block h-auto w-full object-cover object-top"
                    src="/668_1x_shots_so.png"
                    alt="Atmet platform preview"
                    width={1920}
                    height={1440}
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 1123px"
                    priority
                    fetchPriority="high"
                />
            </div>
        </div>
    )
}
