export const ATMET_SOUND_SETTINGS_CHANGED_EVENT = "atmet-sound-settings-changed"
export const ATMET_APPEARANCE_SETTINGS_STORAGE_KEY = "atmet-appearance-settings"

type StoredSoundSettings = {
  soundsEnabled?: unknown
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

export function announceSoundsEnabled(enabled: boolean) {
  if (typeof window === "undefined") return

  window.dispatchEvent(
    new CustomEvent(ATMET_SOUND_SETTINGS_CHANGED_EVENT, {
      detail: { soundsEnabled: enabled },
    })
  )
}
