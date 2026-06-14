"use client"

import * as React from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"

export default function OAuthCallbackPage() {
  const params = useParams<{ slug: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const slug = params.slug

  const [message, setMessage] = React.useState("Finalizing secure connection...")
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!slug) return

    const code = searchParams.get("code")

    if (!code) {
      setErrorMessage("Authorization code is missing. Please reconnect the integration.")
      return
    }

    const run = async () => {
      try {
        const response = await fetch(`/api/integrations/${slug}/oauth/callback`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ code }),
        })

        const data = (await response.json()) as { success: boolean; message?: string }

        if (!response.ok || !data.success) {
          throw new Error(data.message ?? "OAuth callback failed.")
        }

        setMessage("Connection complete. Redirecting...")
        router.replace(`/apps/${slug}?connected=true`)
      } catch (error) {
        const fallback = "OAuth connection failed. Please try again."
        setErrorMessage(error instanceof Error ? error.message : fallback)
      }
    }

    void run()
  }, [router, searchParams, slug])

  return (
    <div className="flex min-h-[calc(100vh-2.5rem)] flex-1 flex-col bg-background">
      <section className="mx-auto flex w-full max-w-xl flex-1 items-center justify-center px-4 py-6 sm:px-6 lg:px-8">
        <div className="w-full rounded-2xl border border-border bg-card p-6 text-center">
          {errorMessage ? (
            <p className="text-sm text-destructive">{errorMessage}</p>
          ) : (
            <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {message}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
