import "server-only"

import { lookup } from "node:dns/promises"
import type { LookupAddress } from "node:dns"
import { isIP } from "node:net"

const BLOCKED_HOST_SUFFIXES = [".internal", ".local", ".localhost"]

function isPrivateIpv4(address: string) {
  const parts = address.split(".").map(Number)
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) return true

  const [a, b] = parts
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  )
}

function isPrivateIpv6(address: string) {
  const normalized = address.toLowerCase().split("%")[0]

  if (normalized.startsWith("::ffff:")) {
    const mappedIpv4 = normalized.slice("::ffff:".length)
    return isIP(mappedIpv4) !== 4 || isPrivateIpv4(mappedIpv4)
  }

  return (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    /^fe[89ab]/.test(normalized) ||
    normalized.startsWith("ff") ||
    normalized.startsWith("2001:db8:")
  )
}

function isPrivateAddress(address: string) {
  const version = isIP(address)
  if (version === 4) return isPrivateIpv4(address)
  if (version === 6) return isPrivateIpv6(address)
  return true
}

export async function assertPublicHttpsUrl(value: string) {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new Error("Agent API URL must be a valid URL.")
  }

  if (url.protocol !== "https:") {
    throw new Error("Agent API URL must use HTTPS.")
  }

  if (url.username || url.password) {
    throw new Error("Agent API URL cannot include credentials.")
  }

  const hostname = url.hostname.toLowerCase().replace(/\.$/, "")
  if (
    hostname === "localhost" ||
    BLOCKED_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix))
  ) {
    throw new Error("Agent API URL must use a public host.")
  }

  const literalIpVersion = isIP(hostname)
  if (literalIpVersion && isPrivateAddress(hostname)) {
    throw new Error("Agent API URL cannot use a private or reserved address.")
  }

  let addresses: LookupAddress[]
  try {
    addresses = await lookup(hostname, { all: true, verbatim: true })
  } catch {
    throw new Error("Agent API host could not be resolved.")
  }

  if (addresses.length === 0 || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new Error("Agent API URL must resolve only to public addresses.")
  }

  return url
}

export async function safeExternalFetch(
  value: string,
  init: RequestInit
) {
  const url = await assertPublicHttpsUrl(value)
  return fetch(url, { ...init, redirect: "error" })
}
