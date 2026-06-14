"use client"

import * as React from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"

import { ActionCard } from "@/components/integrations/ActionCard"
import { AppHeader } from "@/components/integrations/AppHeader"
import { ConnectApiKeyDrawer } from "@/components/integrations/ConnectApiKeyDrawer"
import { ConnectOAuthModal } from "@/components/integrations/ConnectOAuthModal"
import { TriggerCard } from "@/components/integrations/TriggerCard"
import { Badge } from "@/registry/spell-ui/badge"

import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Integration } from "@/lib/integrations-store"

type FlashMessage = {
  type: "success" | "error"
  text: string
}

export default function AppDetailsPage() {
  const params = useParams<{ slug: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const slug = params.slug

  const [integration, setIntegration] = React.useState<Integration | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  const [isMutating, setIsMutating] = React.useState(false)
  const [oauthModalOpen, setOauthModalOpen] = React.useState(false)
  const [oauthError, setOauthError] = React.useState<string | null>(null)

  const [apiDrawerOpen, setApiDrawerOpen] = React.useState(false)
  const [apiKey, setApiKey] = React.useState("")
  const [keyName, setKeyName] = React.useState("")
  const [showApiKey, setShowApiKey] = React.useState(false)
  const [testMessage, setTestMessage] = React.useState<string | null>(null)
  const [testSucceeded, setTestSucceeded] = React.useState(false)
  const [manualConfirm, setManualConfirm] = React.useState(false)
  const [isTesting, setIsTesting] = React.useState(false)
  const [isSavingApiKey, setIsSavingApiKey] = React.useState(false)

  const [flashMessage, setFlashMessage] = React.useState<FlashMessage | null>(null)

  const loadIntegration = React.useCallback(async () => {
    if (!slug) return

    setIsLoading(true)
    setErrorMessage(null)

    try {
      const response = await fetch(`/api/integrations/${slug}`, { cache: "no-store" })
      if (!response.ok) {
        throw new Error("Failed to load integration details.")
      }

      const data = (await response.json()) as Integration
      setIntegration(data)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong."
      setErrorMessage(message)
      setIntegration(null)
    } finally {
      setIsLoading(false)
    }
  }, [slug])

  React.useEffect(() => {
    void loadIntegration()
  }, [loadIntegration])

  React.useEffect(() => {
    if (!flashMessage) return

    const timeoutId = window.setTimeout(() => {
      setFlashMessage(null)
    }, 3200)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [flashMessage])

  React.useEffect(() => {
    if (!integration) return
    if (searchParams.get("connected") !== "true") return

    setFlashMessage({ type: "success", text: `${integration.name} connected successfully` })
    router.replace(`/apps/${integration.slug}`)
    void loadIntegration()
  }, [integration, loadIntegration, router, searchParams])

  const handleConnectClick = React.useCallback(() => {
    if (!integration) return

    if (integration.authType === "oauth") {
      setOauthError(null)
      setOauthModalOpen(true)
      return
    }

    setApiDrawerOpen(true)
  }, [integration])

  const handleDisconnect = React.useCallback(async () => {
    if (!integration) return

    setIsMutating(true)
    setErrorMessage(null)

    try {
      const response = await fetch(`/api/integrations/${integration.slug}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to disconnect integration.")
      }

      setFlashMessage({ type: "success", text: `${integration.name} disconnected successfully` })
      await loadIntegration()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to disconnect integration."
      setFlashMessage({ type: "error", text: message })
    } finally {
      setIsMutating(false)
    }
  }, [integration, loadIntegration])

  const handleReconnect = React.useCallback(() => {
    if (!integration) return

    if (integration.authType === "oauth") {
      setOauthError(null)
      setOauthModalOpen(true)
      return
    }

    setApiDrawerOpen(true)
  }, [integration])

  const handleContinueOAuth = React.useCallback(async () => {
    if (!integration) return

    setIsMutating(true)
    setOauthError(null)

    try {
      const response = await fetch(`/api/integrations/${integration.slug}/oauth/init`, {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error("Unable to start OAuth connection.")
      }

      const data = (await response.json()) as { redirectUrl: string }
      router.push(data.redirectUrl)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to start OAuth connection."
      setOauthError(message)
      setFlashMessage({ type: "error", text: message })
    } finally {
      setIsMutating(false)
    }
  }, [integration, router])

  const handleTestConnection = React.useCallback(async () => {
    if (!integration) return

    setIsTesting(true)
    setTestMessage(null)

    try {
      const response = await fetch(`/api/integrations/${integration.slug}/test`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ apiKey }),
      })

      const data = (await response.json()) as { success: boolean; message?: string }

      if (!response.ok || !data.success) {
        setTestSucceeded(false)
        setTestMessage(data.message ?? "Connection test failed.")
        return
      }

      setTestSucceeded(true)
      setTestMessage(data.message ?? "Connection successful")
    } catch {
      setTestSucceeded(false)
      setTestMessage("Connection test failed.")
    } finally {
      setIsTesting(false)
    }
  }, [apiKey, integration])

  const handleSaveApiKey = React.useCallback(async () => {
    if (!integration) return

    setIsSavingApiKey(true)

    try {
      const response = await fetch(`/api/integrations/${integration.slug}/connect`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ apiKey, keyName }),
      })

      const data = (await response.json()) as { success: boolean; message?: string }

      if (!response.ok || !data.success) {
        throw new Error(data.message ?? "Failed to save integration.")
      }

      setApiDrawerOpen(false)
      setApiKey("")
      setKeyName("")
      setTestMessage(null)
      setTestSucceeded(false)
      setManualConfirm(false)
      setFlashMessage({ type: "success", text: "Connected successfully" })
      await loadIntegration()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save integration."
      setFlashMessage({ type: "error", text: message })
    } finally {
      setIsSavingApiKey(false)
    }
  }, [apiKey, integration, keyName, loadIntegration])

  const handleUseTrigger = React.useCallback(
    (triggerId: string) => {
      if (!integration) return
      router.push(`/workflow?integration=${integration.slug}&trigger=${triggerId}`)
    },
    [integration, router]
  )

  const handleUseAction = React.useCallback(
    (actionId: string) => {
      if (!integration) return
      router.push(`/workflow?integration=${integration.slug}&action=${actionId}`)
    },
    [integration, router]
  )

  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-2.5rem)] flex-1 flex-col bg-background">
        <section className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="space-y-4">
            <Skeleton className="h-32 w-full rounded-2xl" />
            <Skeleton className="h-10 w-56 rounded-lg" />
            <Skeleton className="h-64 w-full rounded-2xl" />
          </div>
        </section>
      </div>
    )
  }

  if (!integration) {
    return (
      <div className="flex min-h-[calc(100vh-2.5rem)] flex-1 flex-col bg-background">
        <section className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {errorMessage ?? "Integration not found."}
          </div>
        </section>
      </div>
    )
  }

  return (
    <>
      <div className="flex min-h-[calc(100vh-2.5rem)] flex-1 flex-col bg-background">
        <section className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="space-y-5">
            <AppHeader
              integration={integration}
              onConnect={handleConnectClick}
              onDisconnect={handleDisconnect}
              onReconnect={handleReconnect}
              isSubmitting={isMutating}
            />

            {errorMessage ? (
              <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {errorMessage}
              </div>
            ) : null}

            <Tabs defaultValue="overview" className="gap-4">
              <TabsList className="h-8">
                <TabsTrigger value="overview" className="text-xs">
                  Overview
                </TabsTrigger>
                <TabsTrigger value="triggers" className="text-xs">
                  Triggers
                </TabsTrigger>
                <TabsTrigger value="actions" className="text-xs">
                  Actions
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <section className="rounded-2xl border border-border bg-card p-5">
                  <h2 className="text-sm font-semibold text-foreground">What you can do</h2>
                  <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                    <li>Start workflows from {integration.triggers.length} trigger events.</li>
                    <li>Run {integration.actions.length} actions in {integration.name}.</li>
                    <li>Keep data access controlled using explicit integration permissions.</li>
                  </ul>
                </section>

                <section className="rounded-2xl border border-border bg-card p-5">
                  <h2 className="text-sm font-semibold text-foreground">Required permissions</h2>
                  <ul className="mt-3 space-y-2">
                    {integration.scopes.map((scope) => (
                      <li key={scope.name} className="rounded-lg border border-border bg-background px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="neutral" size="sm">
                            {scope.name}
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{scope.description}</p>
                      </li>
                    ))}
                  </ul>
                </section>

                <section className="rounded-2xl border border-border bg-card p-5">
                  <h2 className="text-sm font-semibold text-foreground">How to connect</h2>
                  <ol className="mt-2 space-y-2 text-sm text-muted-foreground">
                    {integration.setupInstructions.map((step, index) => (
                      <li key={step}>
                        <span className="mr-2 text-foreground">{index + 1}.</span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </section>
              </TabsContent>

              <TabsContent value="triggers" className="space-y-3">
                {integration.triggers.length > 0 ? (
                  integration.triggers.map((trigger) => (
                    <TriggerCard
                      key={trigger.id}
                      trigger={trigger}
                      onUseInWorkflow={() => handleUseTrigger(trigger.id)}
                    />
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                    No triggers are available for this integration.
                  </div>
                )}
              </TabsContent>

              <TabsContent value="actions" className="space-y-3">
                {integration.actions.length > 0 ? (
                  integration.actions.map((action) => (
                    <ActionCard
                      key={action.id}
                      action={action}
                      onUseInWorkflow={() => handleUseAction(action.id)}
                    />
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                    No actions are available for this integration.
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </section>
      </div>

      <ConnectOAuthModal
        integration={integration}
        open={oauthModalOpen}
        onOpenChange={setOauthModalOpen}
        onContinue={handleContinueOAuth}
        isSubmitting={isMutating}
        errorMessage={oauthError}
      />

      <ConnectApiKeyDrawer
        integration={integration}
        open={apiDrawerOpen}
        onOpenChange={setApiDrawerOpen}
        apiKey={apiKey}
        keyName={keyName}
        showApiKey={showApiKey}
        testMessage={testMessage}
        testSucceeded={testSucceeded}
        isTesting={isTesting}
        isSaving={isSavingApiKey}
        manualConfirm={manualConfirm}
        onApiKeyChange={(value) => {
          setApiKey(value)
          setTestSucceeded(false)
          setTestMessage(null)
        }}
        onKeyNameChange={setKeyName}
        onShowApiKeyChange={setShowApiKey}
        onManualConfirmChange={setManualConfirm}
        onTestConnection={handleTestConnection}
        onSave={handleSaveApiKey}
      />

      {flashMessage ? (
        <div
          className={`fixed right-4 bottom-4 z-50 inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs shadow-sm ${
            flashMessage.type === "success"
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              : "border-destructive/40 bg-destructive/10 text-destructive"
          }`}
        >
          {isMutating || isSavingApiKey ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          {flashMessage.text}
        </div>
      ) : null}
    </>
  )
}
