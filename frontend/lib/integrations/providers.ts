import "server-only"

import { randomBytes } from "crypto"

import { supabaseAdmin } from "@/lib/supabase/admin"
import type { CatalogIntegration } from "@/lib/integrations-catalog"

export type IntegrationProviderRecord = {
  id: string
  slug: string
}

export type OAuthTokenResponse = {
  access_token: string
  refresh_token?: string
  expires_in?: number
  scope?: string
  token_type?: string
  id_token?: string
}

type OAuthProfile = {
  email?: string
}

type OAuthProvider = {
  buildAuthorizeUrl(input: {
    requestUrl: string
    slug: string
    state: string
    catalog: CatalogIntegration
  }): string
  exchangeCode(input: {
    requestUrl: string
    slug: string
    code: string
  }): Promise<OAuthTokenResponse>
  getProfile?(accessToken: string): Promise<OAuthProfile>
}

const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/gmail.modify",
]

function getGoogleClientConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required for Gmail OAuth.")
  }

  return { clientId, clientSecret }
}

function getRedirectUri(requestUrl: string, slug: string) {
  const requestOrigin = new URL(requestUrl).origin
  const baseUrl = process.env.GOOGLE_OAUTH_REDIRECT_BASE_URL ?? requestOrigin

  return new URL(`/apps/${slug}/callback`, baseUrl).toString()
}

const gmailProvider: OAuthProvider = {
  buildAuthorizeUrl({ requestUrl, slug, state }) {
    const { clientId } = getGoogleClientConfig()
    const authorizeUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth")

    authorizeUrl.searchParams.set("client_id", clientId)
    authorizeUrl.searchParams.set("redirect_uri", getRedirectUri(requestUrl, slug))
    authorizeUrl.searchParams.set("response_type", "code")
    authorizeUrl.searchParams.set("access_type", "offline")
    authorizeUrl.searchParams.set("prompt", "consent")
    authorizeUrl.searchParams.set("include_granted_scopes", "true")
    authorizeUrl.searchParams.set("scope", GMAIL_SCOPES.join(" "))
    authorizeUrl.searchParams.set("state", state)

    return authorizeUrl.toString()
  },

  async exchangeCode({ requestUrl, slug, code }) {
    const { clientId, clientSecret } = getGoogleClientConfig()
    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: getRedirectUri(requestUrl, slug),
    })

    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    })

    const data = (await response.json()) as OAuthTokenResponse & { error_description?: string }

    if (!response.ok) {
      throw new Error(data.error_description ?? "Google OAuth token exchange failed.")
    }

    return data
  },

  async getProfile(accessToken) {
    const response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!response.ok) return {}

    return (await response.json()) as OAuthProfile
  },
}

const oauthProviders: Record<string, OAuthProvider> = {
  gmail: gmailProvider,
}

export function getOAuthProvider(slug: string) {
  return oauthProviders[slug] ?? null
}

export function createOAuthState() {
  return randomBytes(32).toString("hex")
}

export function getProviderConfig(catalog: CatalogIntegration) {
  return {
    connectorProvider: catalog.connectorProvider ?? "native",
    composioToolkit: catalog.composioToolkit,
    scopes: catalog.scopes,
    setupInstructions: catalog.setupInstructions,
    triggers: catalog.triggers,
    actions: catalog.actions,
  }
}

export async function ensureIntegrationProvider(
  catalog: CatalogIntegration
): Promise<IntegrationProviderRecord> {
  const { data, error } = await supabaseAdmin
    .from("integration_provider")
    .upsert(
      {
        slug: catalog.slug,
        name: catalog.name,
        auth_type: catalog.authType,
        category: catalog.category,
        logo_url: catalog.logo,
        description: catalog.description,
        status: "active",
        connector_provider: catalog.connectorProvider ?? "native",
        external_toolkit: catalog.composioToolkit ?? null,
        external_config: catalog.connectorProvider === "composio"
          ? { toolkit: catalog.composioToolkit ?? catalog.slug }
          : {},
        config: getProviderConfig(catalog),
      },
      { onConflict: "slug" }
    )
    .select("id, slug")
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to prepare integration provider.")
  }

  return data
}
