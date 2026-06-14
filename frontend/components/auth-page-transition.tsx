"use client"

import { usePathname } from "next/navigation"
import { motion } from "motion/react"

export function AuthPageTransition({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname()

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, y: 6, filter: "blur(4px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ type: "spring", duration: 0.3, bounce: 0 }}
      className="w-full"
    >
      {children}
    </motion.div>
  )
}
