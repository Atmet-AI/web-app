import { supabaseAdmin } from "@/lib/supabase/admin"

export type AccessPolicies = {
  blockedDomains: string[]
  mfaMode: string
  sessionTimeout: string
  ipEnabled: boolean
  ipAllowlist: string
}

const DEFAULT_ACCESS_POLICIES: AccessPolicies = {
  blockedDomains: [],
  mfaMode: "Optional",
  sessionTimeout: "8 hours",
  ipEnabled: false,
  ipAllowlist: "",
}

function normalizeDomain(value: string) {
  return value.trim().toLowerCase().replace(/^@/, "")
}

export async function getAccessPolicies(): Promise<AccessPolicies> {
  const { data, error } = await supabaseAdmin
    .from("platform_setting")
    .select("value")
    .eq("key", "access_policies")
    .maybeSingle()

  if (error || !data?.value || typeof data.value !== "object") {
    return DEFAULT_ACCESS_POLICIES
  }

  const value = data.value as Record<string, unknown>

  return {
    blockedDomains: Array.isArray(value.blockedDomains)
      ? value.blockedDomains
          .filter((item): item is string => typeof item === "string")
          .map(normalizeDomain)
          .filter(Boolean)
      : DEFAULT_ACCESS_POLICIES.blockedDomains,
    mfaMode: typeof value.mfaMode === "string" ? value.mfaMode : DEFAULT_ACCESS_POLICIES.mfaMode,
    sessionTimeout: typeof value.sessionTimeout === "string" ? value.sessionTimeout : DEFAULT_ACCESS_POLICIES.sessionTimeout,
    ipEnabled: typeof value.ipEnabled === "boolean" ? value.ipEnabled : DEFAULT_ACCESS_POLICIES.ipEnabled,
    ipAllowlist: typeof value.ipAllowlist === "string" ? value.ipAllowlist : DEFAULT_ACCESS_POLICIES.ipAllowlist,
  }
}

export function getEmailDomain(email: string) {
  return normalizeDomain(email.split("@").pop() ?? "")
}

export function isEmailDomainBlocked(email: string, policies: AccessPolicies) {
  const domain = getEmailDomain(email)
  return Boolean(domain && policies.blockedDomains.includes(domain))
}

export function sessionTimeoutSeconds(value: string) {
  switch (value) {
    case "1 hour":
      return 60 * 60
    case "24 hours":
      return 60 * 60 * 24
    case "7 days":
      return 60 * 60 * 24 * 7
    case "8 hours":
    default:
      return 60 * 60 * 8
  }
}

function ipv4ToNumber(ip: string) {
  const parts = ip.split(".").map((part) => Number(part))
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return null
  }

  return parts.reduce((total, part) => total * 256 + part, 0) >>> 0
}

function isIpv4InCidr(ip: string, cidr: string) {
  const [rangeIp, prefixText = "32"] = cidr.trim().split("/")
  const ipNumber = ipv4ToNumber(ip)
  const rangeNumber = ipv4ToNumber(rangeIp)
  const prefix = Number(prefixText)

  if (ipNumber === null || rangeNumber === null || !Number.isInteger(prefix) || prefix < 0 || prefix > 32) {
    return false
  }

  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0
  return (ipNumber & mask) === (rangeNumber & mask)
}

export function isIpAllowed(ip: string, policies: AccessPolicies) {
  if (!policies.ipEnabled) return true

  const entries = policies.ipAllowlist
    .split(/[\n,]/)
    .map((entry) => entry.trim())
    .filter(Boolean)

  if (entries.length === 0) return false

  return entries.some((entry) => {
    if (entry.includes("/")) return isIpv4InCidr(ip, entry)
    return ip === entry
  })
}
