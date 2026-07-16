import { Suspense } from "react"

import AiCoreClientPage from "./page-client"

export default function AiCorePage() {
  return (
    <Suspense fallback={<div className="flex min-h-0 flex-1" />}>
      <AiCoreClientPage />
    </Suspense>
  )
}
