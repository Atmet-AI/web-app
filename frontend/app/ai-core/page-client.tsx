"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"

import AIPrompt from "@/components/kokonutui/ai-prompt"

const OPEN_MANAGE_CHAT_USERS_EVENT = "open-manage-chat-users"
const AUTOMATION_CHAT_STARTED_EVENT = "automation-chat-started"

type AiCorePageContentProps = {
  activeChatId: string | null
}

function AiCorePageContent({ activeChatId }: AiCorePageContentProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const promptRef = useRef<HTMLDivElement>(null)
  const [hasStartedConversation, setHasStartedConversation] = useState(false)
  const [hasConversationActivity, setHasConversationActivity] = useState(false)
  const [bottomShift, setBottomShift] = useState(0)
  const currentUserFullName = "Amir Haddad"

  const openUserPicker = useCallback(() => {
    window.dispatchEvent(new CustomEvent(OPEN_MANAGE_CHAT_USERS_EVENT))
  }, [])

  const notifyAutomationStarted = useCallback(() => {
    window.dispatchEvent(new CustomEvent(AUTOMATION_CHAT_STARTED_EVENT))
  }, [])

  const recalculateBottomShift = useCallback(() => {
    if (!containerRef.current || !promptRef.current) return

    const containerHeight = containerRef.current.clientHeight
    const promptHeight = promptRef.current.clientHeight
    const bottomPadding = 16
    const centerToBottom =
      containerHeight / 2 - promptHeight / 2 - bottomPadding

    setBottomShift(Math.min(320, Math.max(0, centerToBottom)))
  }, [])

  const shouldDockToBottom = hasStartedConversation && hasConversationActivity

  useEffect(() => {
    recalculateBottomShift()

    const observer = new ResizeObserver(recalculateBottomShift)
    if (containerRef.current) observer.observe(containerRef.current)
    if (promptRef.current) observer.observe(promptRef.current)

    return () => observer.disconnect()
  }, [recalculateBottomShift])

  return (
    <div
      ref={containerRef}
      className="relative flex min-h-[calc(100svh-2.5rem)] flex-1 items-center justify-center px-3 py-4"
    >
      <div
        ref={promptRef}
        className="flex w-full justify-center transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform"
        style={{
          transform: `translateY(${
            shouldDockToBottom && Number.isFinite(bottomShift) ? bottomShift : 0
          }px)`,
        }}
      >
        <AIPrompt
          key={activeChatId ?? "chat-default"}
          chatId={activeChatId}
          onConversationStart={() => setHasStartedConversation(true)}
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
