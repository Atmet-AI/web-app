import { redirect } from "next/navigation"
import { headers } from "next/headers"

import LandingPage from "./landing-page/page"

function getHostname(host: string | null) {
  return host?.split(":")[0]?.toLowerCase() ?? ""
}

function isMarketingHostname(hostname: string) {
  return (
    hostname === "atmetai.com" ||
    hostname === "www.atmetai.com" ||
    hostname === "localhost" ||
    hostname === "127.0.0.1"
  )
}

export default async function Page() {
  const hostname = getHostname((await headers()).get("host"))

  if (isMarketingHostname(hostname)) {
    return <LandingPage />
  }

  redirect("/ai-core")
}
