"use client"

import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "motion/react"

const CAPABILITIES = [
  "Atmet can summarize your inbox and surface what needs attention.",
  "Atmet can turn a Slack message into a complete workflow.",
  "Atmet can research a topic and deliver a concise brief.",
  "Atmet can monitor operations and alert your team when something changes.",
  "Atmet can draft, organize, and publish content across your tools.",
  "Atmet can extract insights from documents, sheets, and conversations.",
  "Atmet can automate recurring reports and deliver them on schedule.",
  "Atmet can connect your apps and coordinate work between them.",
  "Atmet can build reusable AI skills for your team.",
  "Atmet can handle repetitive tasks while you focus on decisions.",
] as const

const ROTATION_INTERVAL = 7000

export function AuthCapabilityShowcase() {
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    const interval = window.setInterval(() => {
      setActiveIndex((currentIndex) => {
        const offset = Math.floor(Math.random() * (CAPABILITIES.length - 1)) + 1
        return (currentIndex + offset) % CAPABILITIES.length
      })
    }, ROTATION_INTERVAL)

    return () => window.clearInterval(interval)
  }, [])

  return (
    <div className="relative z-10 flex h-full items-center justify-center px-16 text-center">
      <div className="w-full max-w-lg font-sans">
        <div className="grid min-h-24 place-items-center">
          <AnimatePresence initial={false} mode="wait">
            <motion.p
              key={activeIndex}
              initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -4, filter: "blur(4px)" }}
              transition={{ type: "spring", duration: 0.3, bounce: 0 }}
              className="text-balance text-lg font-medium tracking-tight text-foreground xl:text-xl"
            >
              {CAPABILITIES[activeIndex]}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
