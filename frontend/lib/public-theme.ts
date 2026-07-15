export const ATMET_PUBLIC_THEME_PARAM = "atmet_theme"
export const ATMET_THEME_STORAGE_KEY = "theme"

export type PublicTheme = "light" | "dark"

export function isPublicTheme(value: string | null): value is PublicTheme {
  return value === "light" || value === "dark"
}

export function getPublicThemeHref(href: string, theme: PublicTheme) {
  if (href.startsWith("#")) {
    return href
  }

  const url = new URL(href, "https://atmetai.com")
  url.searchParams.set(ATMET_PUBLIC_THEME_PARAM, theme)

  if (href.startsWith("http://") || href.startsWith("https://")) {
    return url.toString()
  }

  return `${url.pathname}${url.search}${url.hash}`
}
