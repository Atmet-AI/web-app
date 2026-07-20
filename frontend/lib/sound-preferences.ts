export const ATMET_SOUND_SETTINGS_CHANGED_EVENT = "atmet-sound-settings-changed"
export const ATMET_APPEARANCE_SETTINGS_CHANGED_EVENT =
  "atmet-appearance-settings-changed"
export const ATMET_APPEARANCE_SETTINGS_STORAGE_KEY = "atmet-appearance-settings"

type StoredSoundSettings = {
  soundsEnabled?: unknown
}

type StoredAppearanceSettings = StoredSoundSettings & {
  playgroundDotsEnabled?: unknown
}

export function appearanceSettingsStorageKey(userKey?: string | null) {
  return userKey
    ? `${ATMET_APPEARANCE_SETTINGS_STORAGE_KEY}:${userKey}`
    : ATMET_APPEARANCE_SETTINGS_STORAGE_KEY
}

export function readSoundsEnabled(userKey?: string | null) {
  if (typeof window === "undefined") return true

  const rawSettings =
    window.localStorage.getItem(appearanceSettingsStorageKey(userKey)) ??
    window.localStorage.getItem(ATMET_APPEARANCE_SETTINGS_STORAGE_KEY)

  if (!rawSettings) return true

  try {
    const parsed = JSON.parse(rawSettings) as StoredSoundSettings
    return typeof parsed.soundsEnabled === "boolean" ? parsed.soundsEnabled : true
  } catch {
    return true
  }
}

export function readPlaygroundDotsEnabled(userKey?: string | null) {
  if (typeof window === "undefined") return false

  const keys = [
    appearanceSettingsStorageKey(userKey),
    ATMET_APPEARANCE_SETTINGS_STORAGE_KEY,
  ]

  for (const key of keys) {
    const rawSettings = window.localStorage.getItem(key)
    if (!rawSettings) continue

    try {
      const parsed = JSON.parse(rawSettings) as StoredAppearanceSettings
      if (typeof parsed.playgroundDotsEnabled === "boolean") {
        return parsed.playgroundDotsEnabled
      }
    } catch {
      continue
    }
  }

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index)
    if (!key?.startsWith(`${ATMET_APPEARANCE_SETTINGS_STORAGE_KEY}:`)) {
      continue
    }

    try {
      const parsed = JSON.parse(
        window.localStorage.getItem(key) ?? "{}"
      ) as StoredAppearanceSettings
      if (typeof parsed.playgroundDotsEnabled === "boolean") {
        return parsed.playgroundDotsEnabled
      }
    } catch {
      continue
    }
  }

  return false
}

export function announceSoundsEnabled(enabled: boolean) {
  if (typeof window === "undefined") return

  window.dispatchEvent(
    new CustomEvent(ATMET_SOUND_SETTINGS_CHANGED_EVENT, {
      detail: { soundsEnabled: enabled },
    })
  )
}

export function announceAppearanceSettingsChanged(
  settings: StoredAppearanceSettings
) {
  if (typeof window === "undefined") return

  window.dispatchEvent(
    new CustomEvent(ATMET_APPEARANCE_SETTINGS_CHANGED_EVENT, {
      detail: settings,
    })
  )
}
