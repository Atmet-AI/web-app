"use client"

import * as React from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { ArrowRightCircle, Bolt, Loader2 } from "lucide-react"

import { AppHeader } from "@/components/integrations/AppHeader"
import { ConnectApiKeyDrawer } from "@/components/integrations/ConnectApiKeyDrawer"
import { ConnectOAuthModal } from "@/components/integrations/ConnectOAuthModal"
import { Badge } from "@/registry/spell-ui/badge"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { isIntegrationAvailable } from "@/lib/integrations/availability"
import type {
  Integration,
  IntegrationAction,
  IntegrationPermission,
  IntegrationTrigger,
} from "@/lib/integrations-store"
import { useWorkspace } from "@/lib/workspace-context"

type FlashMessage = {
  type: "success" | "error"
  text: string
}

type ApiResponse<T> = {
  data?: T
  error?: {
    message?: string
  }
}

function summarizeItems(items: Array<{ name: string }>, fallback: string) {
  if (items.length === 0) return fallback
  return items
    .slice(0, 4)
    .map((item) => item.name)
    .join(", ")
}

function buildUseCases(integration: Integration) {
  const useCases = [
    {
      title: "Ask Atmet to use this app",
      description: `Mention ${integration.name} in chat and Atmet can pick from the connected tools when the request needs it.`,
    },
    {
      title: "Build agent workflows",
      description: `Create workflow nodes that run ${summarizeItems(integration.actions, `${integration.name} actions`)}.`,
    },
  ]

  if (integration.triggers.length > 0) {
    useCases.push({
      title: "Start from app events",
      description: `Trigger workflows from ${summarizeItems(integration.triggers, `${integration.name} events`)}.`,
    })
  }

  return useCases
}

export default function AppDetailsPage() {
  const params = useParams<{ slug: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const {
    activeWorkspaceId,
    apiFetch,
    isLoading: isWorkspaceLoading,
  } = useWorkspace()
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

  const [flashMessage, setFlashMessage] = React.useState<FlashMessage | null>(
    null
  )

  const loadIntegration = React.useCallback(async () => {
    if (!slug) return
    if (isWorkspaceLoading || !activeWorkspaceId) return

    setIsLoading(true)
    setErrorMessage(null)

    try {
      const response = await apiFetch(`/api/integrations/${slug}`, {
        cache: "no-store",
      })
      if (!response.ok) {
        throw new Error("Failed to load integration details.")
      }

      const data = (await response.json()) as {
        data?: { integration?: Integration }
      }
      setIntegration(data.data?.integration ?? null)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Something went wrong."
      setErrorMessage(message)
      setIntegration(null)
    } finally {
      setIsLoading(false)
    }
  }, [activeWorkspaceId, apiFetch, isWorkspaceLoading, slug])

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
    const connectedSource = searchParams.get("connected")
    if (connectedSource !== "true" && connectedSource !== "composio") return

    setFlashMessage({
      type: "success",
      text:
        connectedSource === "composio"
          ? `${integration.name} authorization started`
          : `${integration.name} connected successfully`,
    })
    router.replace(`/apps/${integration.slug}`)
    void loadIntegration()
  }, [integration, loadIntegration, router, searchParams])

  const handleConnectClick = React.useCallback(() => {
    if (!integration) return
    if (!isIntegrationAvailable(integration)) return

    if (integration.authType === "apikey") {
      setApiDrawerOpen(true)
      return
    }

    if (
      integration.connectorProvider === "composio" ||
      integration.authType === "oauth"
    ) {
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
      const response = await apiFetch(`/api/integrations/${integration.slug}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to disconnect integration.")
      }

      setFlashMessage({
        type: "success",
        text: `${integration.name} disconnected successfully`,
      })
      await loadIntegration()
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to disconnect integration."
      setFlashMessage({ type: "error", text: message })
    } finally {
      setIsMutating(false)
    }
  }, [apiFetch, integration, loadIntegration])

  const handleContinueOAuth = React.useCallback(async () => {
    if (!integration) return
    if (!isIntegrationAvailable(integration)) return

    setIsMutating(true)
    setOauthError(null)

    try {
      const isComposioConnection = integration.connectorProvider === "composio"
      const response = await apiFetch(
        isComposioConnection
          ? "/api/composio/authorize"
          : `/api/integrations/${integration.slug}/oauth/init`,
        {
          method: "POST",
          ...(isComposioConnection
            ? {
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  toolkit: integration.composioToolkit ?? integration.slug,
                  providerSlug: integration.slug,
                  connectionName: integration.name,
                  callbackPath: `/apps/${integration.slug}?connected=composio`,
                }),
              }
            : {}),
        }
      )

      const result = (await response.json()) as ApiResponse<{
        redirectUrl: string
      }>

      if (!response.ok) {
        throw new Error(
          result.error?.message ??
            (isComposioConnection
              ? "Unable to start secure connection."
              : "Unable to start OAuth connection.")
        )
      }

      const redirectUrl = result.data?.redirectUrl

      if (!redirectUrl) {
        throw new Error(
          result.error?.message ?? "Unable to start OAuth connection."
        )
      }

      router.push(redirectUrl)
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to start OAuth connection."
      setOauthError(message)
      setFlashMessage({ type: "error", text: message })
    } finally {
      setIsMutating(false)
    }
  }, [apiFetch, integration, router])

  const handleTestConnection = React.useCallback(async () => {
    if (!integration) return

    setIsTesting(true)
    setTestMessage(null)

    try {
      const response = await apiFetch(
        `/api/integrations/${integration.slug}/test`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ apiKey }),
        }
      )

      const result = (await response.json()) as ApiResponse<{
        success: boolean
        message?: string
      }>
      const data = result.data

      if (!response.ok || !data?.success) {
        setTestSucceeded(false)
        setTestMessage(
          result.error?.message ?? data?.message ?? "Connection test failed."
        )
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
  }, [apiFetch, apiKey, integration])

  const handleSaveApiKey = React.useCallback(async () => {
    if (!integration) return

    setIsSavingApiKey(true)

    try {
      const response = await apiFetch(
        `/api/integrations/${integration.slug}/connect`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ apiKey, keyName }),
        }
      )

      const result = (await response.json()) as ApiResponse<{
        success: boolean
        message?: string
      }>
      const data = result.data

      if (!response.ok || !data?.success) {
        throw new Error(
          result.error?.message ??
            data?.message ??
            "Failed to save integration."
        )
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
      const message =
        error instanceof Error ? error.message : "Failed to save integration."
      setFlashMessage({ type: "error", text: message })
    } finally {
      setIsSavingApiKey(false)
    }
  }, [apiFetch, apiKey, integration, keyName, loadIntegration])

  const handleUseTrigger = React.useCallback(
    (triggerId: string) => {
      if (!integration) return
      router.push(
        `/workflow?integration=${integration.slug}&trigger=${triggerId}`
      )
    },
    [integration, router]
  )

  const handleUseAction = React.useCallback(
    (actionId: string) => {
      if (!integration) return
      router.push(
        `/workflow?integration=${integration.slug}&action=${actionId}`
      )
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

  const isAvailable = isIntegrationAvailable(integration)
  const useCases = buildUseCases(integration)

  return (
    <>
      <div className="flex min-h-[calc(100vh-2.5rem)] flex-1 flex-col bg-background">
        <section className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="space-y-5">
            <AppHeader
              integration={integration}
              onConnect={handleConnectClick}
              onDisconnect={handleDisconnect}
              isSubmitting={isMutating}
              isAvailable={isAvailable}
            />

            {errorMessage ? (
              <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {errorMessage}
              </div>
            ) : null}

            {!isAvailable ? (
              <section className="rounded-2xl bg-amber-500/10 px-5 py-4 text-sm text-amber-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] dark:text-amber-300">
                This app is visible for planning, but direct connection is not
                ready yet.
              </section>
            ) : null}

            <Tabs defaultValue="overview" className="gap-5">
              <TabsList className="h-8">
                <TabsTrigger value="overview" className="text-xs">
                  Overview
                </TabsTrigger>
                <TabsTrigger value="tools" className="text-xs">
                  MCP tools
                </TabsTrigger>
                <TabsTrigger value="triggers" className="text-xs">
                  Triggers
                </TabsTrigger>
                <TabsTrigger value="permissions" className="text-xs">
                  Permissions
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                <section className="grid gap-3 sm:grid-cols-3">
                  <CapabilityStat
                    value={integration.actions.length}
                    label="MCP tools"
                  />
                  <CapabilityStat
                    value={integration.triggers.length}
                    label="Triggers"
                  />
                  <CapabilityStat
                    value={integration.scopes.length}
                    label="Permissions"
                  />
                </section>

                {integration.connected && integration.connections?.length ? (
                  <section>
                    <SectionHeading
                      title="Connected accounts"
                      description="Accounts available to this workspace."
                    />
                    <div className="mt-3 divide-y divide-border/50 rounded-2xl bg-sidebar/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                      {integration.connections.map((connection) => (
                        <div
                          key={connection.id}
                          className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">
                              {connection.connection_name ||
                                connection.connected_account ||
                                "Connected account"}
                            </p>
                            {connection.connected_account ? (
                              <p className="truncate text-xs text-muted-foreground">
                                {connection.connected_account}
                              </p>
                            ) : null}
                          </div>
                          <Badge
                            variant={
                              connection.status === "active"
                                ? "green"
                                : "neutral"
                            }
                            size="sm"
                          >
                            {connection.status ?? "active"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </section>
                ) : null}

                <section>
                  <SectionHeading
                    title="Use cases"
                    description="What Atmet can do with this app once it is connected."
                  />
                  <div className="mt-3 grid gap-2">
                    {useCases.map((useCase) => (
                      <CapabilityRow
                        key={useCase.title}
                        title={useCase.title}
                        description={useCase.description}
                      />
                    ))}
                  </div>
                </section>

                <section>
                  <SectionHeading
                    title="How to connect"
                    description={
                      isAvailable
                        ? "Connect once, then use the tools from chat, agents, or workflows."
                        : "Connection will unlock once this app is ready."
                    }
                  />
                  <ol className="mt-3 divide-y divide-border/50 rounded-2xl bg-sidebar/70 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                    {integration.setupInstructions.map((step, index) => (
                      <li
                        key={step}
                        className="flex gap-3 px-4 py-3 text-muted-foreground"
                      >
                        <span className="font-medium text-foreground">
                          {index + 1}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </section>
              </TabsContent>

              <TabsContent value="tools" className="space-y-4">
                <SectionHeading
                  title="MCP tools"
                  description={`${integration.actions.length} app tools available to Atmet agents and workflows.`}
                />
                {integration.actions.length > 0 ? (
                  <div className="max-h-[560px] divide-y divide-border/50 overflow-y-auto rounded-2xl bg-sidebar/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                    {integration.actions.map((action) => (
                      <ToolRow
                        key={action.id}
                        action={action}
                        onUseInWorkflow={() => handleUseAction(action.id)}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyCapability message="No MCP tools are available for this app yet." />
                )}
              </TabsContent>

              <TabsContent value="triggers" className="space-y-4">
                <SectionHeading
                  title="Triggers"
                  description={`${integration.triggers.length} event triggers available for workflow starts.`}
                />
                {integration.triggers.length > 0 ? (
                  <div className="divide-y divide-border/50 rounded-2xl bg-sidebar/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                    {integration.triggers.map((trigger) => (
                      <TriggerRow
                        key={trigger.id}
                        trigger={trigger}
                        onUseInWorkflow={() => handleUseTrigger(trigger.id)}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyCapability message="No event triggers are available for this app yet." />
                )}
              </TabsContent>

              <TabsContent value="permissions" className="space-y-4">
                <SectionHeading
                  title="Permissions"
                  description="Access requested only when the user connects this app."
                />
                <div className="divide-y divide-border/50 rounded-2xl bg-sidebar/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                  {integration.scopes.map((scope) => (
                    <PermissionRow key={scope.name} scope={scope} />
                  ))}
                </div>
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
          {isMutating || isSavingApiKey ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : null}
          {flashMessage.text}
        </div>
      ) : null}
    </>
  )
}

function CapabilityStat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-2xl bg-sidebar/70 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
      <p className="text-2xl font-semibold tracking-tight text-foreground">
        {value}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

function SectionHeading({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        {description}
      </p>
    </div>
  )
}

function CapabilityRow({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="rounded-2xl bg-sidebar/70 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        {description}
      </p>
    </div>
  )
}

function ToolRow({
  action,
  onUseInWorkflow,
}: {
  action: IntegrationAction
  onUseInWorkflow: () => void
}) {
  return (
    <article className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-background/80 text-muted-foreground">
            <ArrowRightCircle className="h-3.5 w-3.5" />
          </span>
          <h3 className="text-sm font-medium text-foreground">{action.name}</h3>
        </div>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          {action.description}
        </p>
        <p className="mt-2 font-mono text-[11px] break-all text-muted-foreground/80">
          {action.id}
        </p>
        {action.inputFields.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {action.inputFields.slice(0, 8).map((field) => (
              <Badge key={field} variant="neutral" size="sm">
                {field}
              </Badge>
            ))}
            {action.inputFields.length > 8 ? (
              <Badge variant="neutral" size="sm">
                +{action.inputFields.length - 8}
              </Badge>
            ) : null}
          </div>
        ) : null}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onUseInWorkflow}
        className="h-10 self-start rounded-lg"
      >
        Use
      </Button>
    </article>
  )
}

function TriggerRow({
  trigger,
  onUseInWorkflow,
}: {
  trigger: IntegrationTrigger
  onUseInWorkflow: () => void
}) {
  return (
    <article className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-background/80 text-muted-foreground">
            <Bolt className="h-3.5 w-3.5" />
          </span>
          <h3 className="text-sm font-medium text-foreground">
            {trigger.name}
          </h3>
        </div>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          {trigger.description}
        </p>
        <p className="mt-2 font-mono text-[11px] break-all text-muted-foreground/80">
          {trigger.id}
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onUseInWorkflow}
        className="h-10 self-start rounded-lg"
      >
        Use
      </Button>
    </article>
  )
}

function PermissionRow({ scope }: { scope: IntegrationPermission }) {
  return (
    <article className="px-4 py-3">
      <Badge variant="neutral" size="sm">
        {scope.name}
      </Badge>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">
        {scope.description}
      </p>
    </article>
  )
}

function EmptyCapability({ message }: { message: string }) {
  return (
    <div className="rounded-2xl bg-sidebar/70 px-4 py-10 text-center text-sm text-muted-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
      {message}
    </div>
  )
}
