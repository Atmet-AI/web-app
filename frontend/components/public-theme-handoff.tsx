"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import { useTheme } from "next-themes"

import {
  ATMET_PUBLIC_THEME_PARAM,
  ATMET_THEME_STORAGE_KEY,
  isPublicTheme,
} from "@/lib/public-theme"

export function PublicThemeHandoff() {
  const searchParams = useSearchParams()
  const { setTheme } = useTheme()
  const requestedTheme = searchParams.get(ATMET_PUBLIC_THEME_PARAM)

  React.useEffect(() => {
    if (!isPublicTheme(requestedTheme)) {
      return
    }

    const rememberedTheme = window.localStorage.getItem(ATMET_THEME_STORAGE_KEY)
    if (rememberedTheme) {
      return
    }

    setTheme(requestedTheme)
  }, [requestedTheme, setTheme])

  return null
}
