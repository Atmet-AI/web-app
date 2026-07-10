"use client"

import { Eye, EyeOff, ExternalLink } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import type { Integration } from "@/lib/integrations-store"

type ConnectApiKeyDrawerProps = {
  integration: Integration
  open: boolean
  onOpenChange: (open: boolean) => void
  apiKey: string
  keyName: string
  showApiKey: boolean
  testMessage: string | null
  testSucceeded: boolean
  isTesting: boolean
  isSaving: boolean
  manualConfirm: boolean
  onApiKeyChange: (value: string) => void
  onKeyNameChange: (value: string) => void
  onShowApiKeyChange: (value: boolean) => void
  onManualConfirmChange: (value: boolean) => void
  onTestConnection: () => void
  onSave: () => void
}

export function ConnectApiKeyDrawer({
  integration,
  open,
  onOpenChange,
  apiKey,
  keyName,
  showApiKey,
  testMessage,
  testSucceeded,
  isTesting,
  isSaving,
  manualConfirm,
  onApiKeyChange,
  onKeyNameChange,
  onShowApiKeyChange,
  onManualConfirmChange,
  onTestConnection,
  onSave,
}: ConnectApiKeyDrawerProps) {
  const canSave = Boolean(apiKey.trim()) && (testSucceeded || manualConfirm)
  const isTelegram = integration.slug === "telegram"
  const isChatGpt = integration.slug === "chatgpt"
  const secretLabel = isTelegram
    ? "Bot token"
    : isChatGpt
      ? "OpenAI API key"
      : "API Key"
  const secretPlaceholder = isTelegram
    ? "Paste the token from BotFather"
    : isChatGpt
      ? "Paste your sk-... OpenAI key"
      : "Paste your API key"
  const nameLabel = "Key name (optional)"
  const namePlaceholder = isTelegram ? "Telegram connection" : "Production key"
  const instructionsTitle = isTelegram
    ? "How to find your bot token"
    : "How to find your API key"
  const apiPageLabel = isTelegram ? "Open BotFather" : "Open API key page"
  const description = isTelegram
    ? "Connect a Telegram Bot API token so Atmet can use Telegram actions in chats, agents, and workflows."
    : isChatGpt
      ? "Connect your OpenAI API key so Atmet can use ChatGPT/OpenAI tools."
      : "Provide your API key to connect this integration."
  const confirmationText = isTelegram
    ? "I confirm this Telegram Bot API token is valid and ready to save."
    : "I confirm this API key is valid and ready to save."

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] w-full max-w-[calc(100%-1rem)] overflow-hidden rounded-xl! p-0 sm:max-w-xl">
        <DialogHeader className="border-b border-border px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg border border-border bg-background">
              <img
                src={integration.logo}
                alt={`${integration.name} logo`}
                className="h-6 w-6 object-contain"
                onError={(event) => {
                  event.currentTarget.style.display = "none"
                }}
              />
            </span>
            <div>
              <DialogTitle>Connect {integration.name}</DialogTitle>
              <DialogDescription>{description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto px-5 py-4">
          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">
              {instructionsTitle}
            </h3>
            <ol className="space-y-2 text-sm text-muted-foreground">
              {integration.setupInstructions.map((instruction, index) => (
                <li key={instruction} className="flex gap-2">
                  <span className="mt-0.5 text-foreground">{index + 1}.</span>
                  <span>{instruction}</span>
                </li>
              ))}
            </ol>
            {integration.apiKeyUrl ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                render={
                  <a
                    href={integration.apiKeyUrl}
                    target="_blank"
                    rel="noreferrer"
                  />
                }
                className="h-7"
              >
                {apiPageLabel}
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            ) : null}
          </section>

          <section className="space-y-3">
            <div className="space-y-1.5">
              <label
                htmlFor="api-key"
                className="text-xs font-medium text-foreground"
              >
                {secretLabel}
              </label>
              <div className="flex gap-2">
                <Input
                  id="api-key"
                  value={apiKey}
                  onChange={(event) => onApiKeyChange(event.target.value)}
                  type={showApiKey ? "text" : "password"}
                  placeholder={secretPlaceholder}
                  className="h-8"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onShowApiKeyChange(!showApiKey)}
                  aria-label={showApiKey ? "Hide API key" : "Show API key"}
                >
                  {showApiKey ? (
                    <EyeOff className="h-3.5 w-3.5" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="key-name"
                className="text-xs font-medium text-foreground"
              >
                {nameLabel}
              </label>
              <Input
                id="key-name"
                value={keyName}
                onChange={(event) => onKeyNameChange(event.target.value)}
                placeholder={namePlaceholder}
                className="h-8"
              />
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onTestConnection}
                disabled={isTesting || !apiKey.trim()}
                className="h-8"
              >
                {isTesting ? "Testing..." : "Test connection"}
              </Button>
              {testMessage ? (
                <p
                  className={`text-xs ${testSucceeded ? "text-emerald-600" : "text-destructive"}`}
                >
                  {testMessage}
                </p>
              ) : null}
            </div>

            <label className="flex items-start gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={manualConfirm}
                onChange={(event) =>
                  onManualConfirmChange(event.target.checked)
                }
                className="mt-0.5"
              />
              <span>{confirmationText}</span>
            </label>
          </section>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-border bg-background px-5 py-4 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onSave}
            disabled={!canSave || isSaving}
          >
            {isSaving ? "Saving..." : "Save & Connect"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
