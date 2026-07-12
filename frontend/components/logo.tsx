import Image from "next/image"

import { cn } from "@/lib/utils"

export const Logo = ({ className }: { className?: string; uniColor?: boolean }) => {
  return (
    <span className={cn("relative inline-flex h-5 w-[5.3rem] items-center", className)}>
      <Image
        src="/Logos/Atmet%20Whitemode.png"
        alt="Atmet"
        width={1781}
        height={337}
        priority
        className="h-full w-auto object-contain dark:hidden"
      />
      <Image
        src="/Logos/Atmet%20Darkmode.png"
        alt="Atmet"
        width={1781}
        height={337}
        priority
        className="hidden h-full w-auto object-contain dark:block"
      />
    </span>
  )
}

export const LogoIcon = ({ className }: { className?: string; uniColor?: boolean }) => {
  return (
    <Image
      src="/Logos/Favicon%20Atmet.png"
      alt="Atmet"
      width={128}
      height={128}
      className={cn("size-5 object-contain", className)}
    />
  )
}

export const LogoStroke = ({ className }: { className?: string }) => {
  return <Logo className={cn("h-7", className)} />
}
