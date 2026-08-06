"use client"

import { useState } from "react"
import { BaseLayout } from "@/components/layouts/base-layout"
import { ChatDialog } from "./components/chat-dialog"
import { SessionList } from "./components/session-list"
import { XThemeProvider } from "./components/x-theme-provider"
import { useAiSessions } from "./hooks/use-ai-sessions"

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
  const { sessions, loading, addSession, removeSession } = useAiSessions("vibe-trading")
  const [currentId, setCurrentId] = useState<string | null>(null)

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
        />
        <ChatDialog sessionId={currentId} />
      </div>
    </div>
  )
}