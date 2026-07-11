"use client"

import { useEffect } from "react"
import { bind, setEnabled } from "cuelume"
import {
  ATMET_SOUND_SETTINGS_CHANGED_EVENT,
  readSoundsEnabled,
} from "@/lib/sound-preferences"

export function CuelumeProvider() {
  useEffect(() => {
    bind()
    let isMounted = true

    function applySavedPreference(userKey?: string | null) {
      if (!isMounted) return
      setEnabled(readSoundsEnabled(userKey))
    }

    applySavedPreference()

    fetch("/api/users/me", { cache: "no-store", credentials: "same-origin" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { data?: { user?: { id?: string | null; email?: string | null } } } | null) => {
        const user = payload?.data?.user
        applySavedPreference(user?.id ?? user?.email ?? null)
      })
      .catch(() => {})

    const handleSoundSettingsChanged = (event: Event) => {
      const customEvent = event as CustomEvent<{ soundsEnabled?: boolean }>
      if (typeof customEvent.detail?.soundsEnabled === "boolean") {
        setEnabled(customEvent.detail.soundsEnabled)
      }
    }

    window.addEventListener(
      ATMET_SOUND_SETTINGS_CHANGED_EVENT,
      handleSoundSettingsChanged
    )

    return () => {
      isMounted = false
      window.removeEventListener(
        ATMET_SOUND_SETTINGS_CHANGED_EVENT,
        handleSoundSettingsChanged
      )
    }
  }, [])

  return null
}
