"use client"

import { useState } from "react"
import { BaseLayout } from "@/components/layouts/base-layout"
import { ChatDialog } from "./components/chat-dialog"
import { SessionList } from "./components/session-list"
import { useAiSessions } from "./hooks/use-ai-sessions"

export default function VibeTradingPage() {
  return (
    <BaseLayout
      title="AI Vibe Trading"
      description="Chat with the Vibe Trading AI agent for natural-language finance research"
    >
      <VibeTradingContent />
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