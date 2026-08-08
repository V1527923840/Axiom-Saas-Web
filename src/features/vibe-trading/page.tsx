"use client"

import { useCallback, useEffect, useRef, useState } from "react"
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
  const { sessions, loading, error, refresh, addSession, removeSession, updateTitle } =
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

  // 切 session 时精细化：清上一个 session 的 text 流式状态,
  // 但保留 goalSnapshot 与 swarm_status 消息(同 session 多次对话间持续)。
  // 用 ref 锁定"上一个 id"以避免初次挂载就触发 (currentId 仍为 null)。
  const prevIdRef = useRef<string | null>(null)
  useEffect(() => {
    if (!currentId) {
      prevIdRef.current = null
      return
    }
    const prev = prevIdRef.current
    // 第一次出现 currentId —— 不 reset (还没"切")
    prevIdRef.current = currentId
    return () => {
      // 卸载 / currentId 变化时 —— 软重置前一个 session 的 slot
      if (prev) useSessionStore.getState().softReset(prev)
    }
  }, [currentId])

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

  // 无会话时,用户在 Sender 输入并发送 → 自动建一个新会话并把内容作为 pendingMessage
  // 走 ChatDialog 内已有的 pendingMessage 自动发送链路。
  const handleCreateAndSend = useCallback(
    async (content: string) => {
      await handlePromptSelect(content)
    },
    [handlePromptSelect],
  )

  // 仅建空会话（用于"无会话路径下创建研究目标"：ChatDialog 在等 sessionId
  // 到位后自行 POST /goal 并发 kickoff,这里不需要再代发任何 message）。
  // 走 handlePromptSelect("") 触发 addSession + setCurrentId,pendingMessage
  // 收到空串会被 ChatDialog 的 effect 直接 short-circuit 掉。
  const handleCreateSessionOnly = useCallback(async () => {
    await handlePromptSelect("")
  }, [handlePromptSelect])

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
          error={error}
          onRetry={refresh}
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
          onCreateAndSend={handleCreateAndSend}
          onCreateSessionOnly={handleCreateSessionOnly}
        />
      </div>
    </div>
  )
}