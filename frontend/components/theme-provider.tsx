"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes"

function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      {...props}
    >
      <ThemeHotkey />
      <AppearanceColorInitializer />
      {children}
    </NextThemesProvider>
  )
}

const appearanceColors = {
  graphite: { primary: "#111111", foreground: "#ffffff", ring: "rgb(23 23 23 / 30%)" },
  cobalt: { primary: "#1e90ff", foreground: "#ffffff", ring: "rgb(30 144 255 / 36%)" },
  emerald: { primary: "#059669", foreground: "#ffffff", ring: "rgb(5 150 105 / 36%)" },
  violet: { primary: "#7c3aed", foreground: "#ffffff", ring: "rgb(124 58 237 / 36%)" },
  rose: { primary: "#e11d48", foreground: "#ffffff", ring: "rgb(225 29 72 / 36%)" },
  amber: { primary: "#d97706", foreground: "#ffffff", ring: "rgb(217 119 6 / 36%)" },
  cyan: { primary: "#0891b2", foreground: "#ffffff", ring: "rgb(8 145 178 / 36%)" },
  teal: { primary: "#0f766e", foreground: "#ffffff", ring: "rgb(15 118 110 / 36%)" },
  slate: { primary: "#334155", foreground: "#ffffff", ring: "rgb(51 65 85 / 36%)" },
} as const

function AppearanceColorInitializer() {
  React.useEffect(() => {
    let colorId: keyof typeof appearanceColors = "cobalt"

    try {
      const stored = window.localStorage.getItem("atmet-appearance-settings")
      const parsed = stored ? (JSON.parse(stored) as { colorId?: string }) : null
      if (parsed?.colorId && parsed.colorId in appearanceColors) {
        colorId = parsed.colorId as keyof typeof appearanceColors
      }
    } catch {
      colorId = "cobalt"
    }

    const color = appearanceColors[colorId]
    const root = document.documentElement
    root.style.setProperty("--primary", color.primary)
    root.style.setProperty("--primary-foreground", color.foreground)
    root.style.setProperty("--sidebar-primary", color.primary)
    root.style.setProperty("--sidebar-primary-foreground", color.foreground)
    root.style.setProperty("--ring", color.primary)
    root.style.setProperty("--sidebar-ring", color.ring)
  }, [])

  return null
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  )
}

function ThemeHotkey() {
  const { resolvedTheme, setTheme } = useTheme()

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.repeat) {
        return
      }

      if (event.metaKey || event.ctrlKey || event.altKey) {
        return
      }

      if (event.key.toLowerCase() !== "d") {
        return
      }

      if (isTypingTarget(event.target)) {
        return
      }

      setTheme(resolvedTheme === "dark" ? "light" : "dark")
    }

    window.addEventListener("keydown", onKeyDown)

    return () => {
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [resolvedTheme, setTheme])

  return null
}

export { ThemeProvider }
