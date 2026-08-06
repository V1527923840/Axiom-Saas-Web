"use client"

import { useCallback, useEffect, useState } from "react"
import { BaseLayout } from "@/components/layouts/base-layout"
import { ChatDialog } from "./components/chat-dialog"
import { SessionList } from "./components/session-list"
import { XThemeProvider } from "./components/x-theme-provider"
import { useAiSessions } from "./hooks/use-ai-sessions"
import { unsubscribeAll } from "./services/events-stream"
import { useSessionStore } from "./stores/session-store"

export default function VibeTradingPage() {
  return (
    <BaseLayout
      title="AI 智能体"
      description="用自然语言与 Vibe Trading AI 智能体对话,获取金融市场研究与交易思路"
    >
      <XThemeProvider>
        <VibeTradingContent />
      </XThemeProvider>
    </BaseLayout>
  )
}

function VibeTradingContent() {
  const { sessions, loading, addSession, removeSession, updateTitle } =
    useAiSessions("vibe-trading")
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [pendingMessage, setPendingMessage] = useState<string | null>(null)

  // 离开页面：关闭所有 /events 长连接 + 清 store
  useEffect(() => {
    return () => {
      unsubscribeAll()
      useSessionStore.getState().reset()
    }
  }, [])

  const handlePromptSelect = useCallback(
    async (text: string) => {
      try {
        const s = await addSession()
        setCurrentId(s.id)
        setPendingMessage(text)
      } catch (e) {
        console.error("failed to create session for prompt", e)
      }
    },
    [addSession],
  )

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ text: string }>).detail
      if (detail?.text) void handlePromptSelect(detail.text)
    }
    window.addEventListener("vibe-trading:prompt-select", handler)
    return () => window.removeEventListener("vibe-trading:prompt-select", handler)
  }, [handlePromptSelect])

  const currentSession = sessions.find((s) => s.id === currentId) ?? null
  const currentTitle = currentSession?.title ?? null

  return (
    <div className="@container/main px-4 lg:px-6">
      <div className="h-[calc(100vh-220px)] min-h-[520px] flex rounded-lg border overflow-hidden bg-background">
        <SessionList
          sessions={sessions}
          currentId={currentId}
          loading={loading}
          onSelect={setCurrentId}
          onNew={async () => {
            const s = await addSession()
            setCurrentId(s.id)
          }}
          onDelete={async (id) => {
            await removeSession(id)
            if (currentId === id) setCurrentId(null)
          }}
          onRename={async (id, title) => {
            await updateTitle(id, title)
          }}
        />
        <ChatDialog
          sessionId={currentId}
          title={currentTitle}
          pendingMessage={pendingMessage}
          onPendingMessageConsumed={() => setPendingMessage(null)}
        />
      </div>
    </div>
  )
}