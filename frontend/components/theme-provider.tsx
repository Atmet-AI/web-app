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
      <ThemeColorSynchronizer />
      <FixedPrimaryColorInitializer />
      {children}
    </NextThemesProvider>
  )
}

function ThemeColorSynchronizer() {
  const { resolvedTheme } = useTheme()

  React.useEffect(() => {
    const isDark = resolvedTheme === "dark"
    const themeColor = isDark ? "#131313" : "#ffffff"
    const root = document.documentElement
    let themeMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')

    if (!themeMeta) {
      themeMeta = document.createElement("meta")
      themeMeta.name = "theme-color"
      document.head.appendChild(themeMeta)
    }

    themeMeta.content = themeColor
    root.style.colorScheme = isDark ? "dark" : "light"
  }, [resolvedTheme])

  return null
}

function FixedPrimaryColorInitializer() {
  React.useEffect(() => {
    const root = document.documentElement
    root.style.setProperty("--primary", "#1e90ff")
    root.style.setProperty("--primary-foreground", "#ffffff")
    root.style.setProperty("--sidebar-primary", "#1e90ff")
    root.style.setProperty("--sidebar-primary-foreground", "#ffffff")
    root.style.setProperty("--ring", "#1e90ff")
    root.style.setProperty("--sidebar-ring", "#1e90ff")
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
