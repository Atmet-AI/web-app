import type { Integration } from "@/lib/integrations-store"

export const AVAILABLE_INTEGRATION_SLUGS = new Set([
  "gmail",
  "google-contacts",
  "google-calendar",
  "google-drive",
  "google-sheets",
  "google-docs",
  "telegram",
  "chatgpt",
  "github",
  "instagram",
])

export function isIntegrationAvailable(
  integrationOrSlug: Pick<Integration, "slug"> | string
) {
  const slug =
    typeof integrationOrSlug === "string"
      ? integrationOrSlug
      : integrationOrSlug.slug
  return AVAILABLE_INTEGRATION_SLUGS.has(slug)
}
