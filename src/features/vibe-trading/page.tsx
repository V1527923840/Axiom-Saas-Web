"use client"

import { useState } from "react"
import { ProtectedRoute } from "@/components/protected-route"
import { ChatDialog } from "./components/chat-dialog"
import { SessionList } from "./components/session-list"
import { useAiSessions } from "./hooks/use-ai-sessions"

export default function VibeTradingPage() {
  return (
    <ProtectedRoute>
      <VibeTradingContent />
    </ProtectedRoute>
  )
}

function VibeTradingContent() {
  const { sessions, loading, addSession, removeSession } = useAiSessions("vibe-trading")
  const [currentId, setCurrentId] = useState<string | null>(null)

  return (
    <div className="grid h-[calc(100vh-4rem)] grid-cols-[280px_1fr]">
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
  )
}