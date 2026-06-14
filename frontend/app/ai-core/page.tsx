import { Suspense } from "react"

import AiCoreClientPage from "./page-client"

export default function AiCorePage() {
  return (
    <Suspense fallback={<div className="flex min-h-[calc(100svh-2.5rem)] flex-1" />}>
      <AiCoreClientPage />
    </Suspense>
  )
}
