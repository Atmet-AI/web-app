"use client"

import { useCallback, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"

import AIPrompt from "@/components/kokonutui/ai-prompt"
import { cn } from "@/lib/utils"

const OPEN_MANAGE_CHAT_USERS_EVENT = "open-manage-chat-users"
const AUTOMATION_CHAT_STARTED_EVENT = "automation-chat-started"

type AiCorePageContentProps = {
  activeChatId: string | null
}

function AiCorePageContent({ activeChatId }: AiCorePageContentProps) {
  const [hasConversationActivity, setHasConversationActivity] = useState(false)
  const [currentUserFullName, setCurrentUserFullName] = useState("there")

  const openUserPicker = useCallback(() => {
    window.dispatchEvent(new CustomEvent(OPEN_MANAGE_CHAT_USERS_EVENT))
  }, [])

  const notifyAutomationStarted = useCallback(() => {
    window.dispatchEvent(new CustomEvent(AUTOMATION_CHAT_STARTED_EVENT))
  }, [])

  const shouldDockToBottom = hasConversationActivity

  useEffect(() => {
    let isMounted = true

    fetch("/api/users/me")
      .then((response) => response.json())
      .then(
        (payload: {
          data?: { user?: { full_name?: string | null; email?: string | null } }
        }) => {
          if (!isMounted) return
          const user = payload.data?.user
          const fallbackName = user?.email?.split("@")[0]
          const displayName = user?.full_name?.trim() || fallbackName || "there"
          setCurrentUserFullName(displayName)
        }
      )
      .catch(() => undefined)

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <div
      className={cn(
        "relative flex h-[calc(100svh-2.5rem)] min-h-0 flex-1 px-3 py-4",
        shouldDockToBottom
          ? "items-stretch justify-center overflow-hidden"
          : "items-center justify-center"
      )}
    >
      <div
        className={cn(
          "flex w-full justify-center transition-[height] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
          shouldDockToBottom && "h-full min-h-0"
        )}
      >
        <AIPrompt
          key={activeChatId ?? "chat-default"}
          chatId={activeChatId}
          onConversationStart={() => undefined}
          onAutomationConversationStart={notifyAutomationStarted}
          onConversationActivityChange={setHasConversationActivity}
          onAddUserToChat={openUserPicker}
          userFullName={currentUserFullName}
          dockComposerToBottom={shouldDockToBottom}
        />
      </div>
    </div>
  )
}

export default function AiCoreClientPage() {
  const searchParams = useSearchParams()
  const activeChatId = searchParams.get("chat")

  return (
    <AiCorePageContent
      key={activeChatId ?? "chat-default"}
      activeChatId={activeChatId}
    />
  )
}
