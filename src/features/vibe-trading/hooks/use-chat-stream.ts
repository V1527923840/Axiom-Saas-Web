import { useCallback, useEffect } from "react"
import {
  cancelSession,
  getMessages,
  patchSession,
  submitMessage,
} from "@/services/vibe-trading"
import {
  type ChatMessage,
  type PerSession,
  useSessionStore,
} from "../stores/session-store"
import { subscribeSession } from "../services/events-stream"

type Slice = Pick<PerSession, "messages" | "streaming" | "error" | "historyLoaded">

export type { ChatMessage }

export function useChatStream(
  sessionId: string | null,
  title?: string | null,
) {
  // 响应式订阅 store 切片（避免重渲染整个 store）
  const slice = useSessionStore((s): Slice | undefined =>
    sessionId ? s.byId[sessionId] : undefined,
  )
  const ensure = useSessionStore((s) => s.ensure)
  const setHistoryLoaded = useSessionStore((s) => s.setHistoryLoaded)

  const loadingHistory =
    !!sessionId && (!slice || !slice.historyLoaded) && (slice?.messages.length ?? 0) === 0

  // 进入会话：确保 store 槽存在 + 拉历史 + 开 /events 订阅
  useEffect(() => {
    if (!sessionId) return
    ensure(sessionId)
    const cur = useSessionStore.getState().byId[sessionId]
    if (cur && !cur.historyLoaded) {
      void getMessages(sessionId)
        .then((msgs) => setHistoryLoaded(sessionId, msgs.map(toChatMessage)))
        .catch((e) =>
          useSessionStore.setState((s) => {
            const c = s.byId[sessionId]
            if (!c) return s
            return {
              byId: {
                ...s.byId,
                [sessionId]: {
                  ...c,
                  error: e instanceof Error ? e.message : "Failed to load history",
                },
              },
            }
          }),
        )
    }
    subscribeSession(sessionId)
    // 不在 effect cleanup 中 unsubscribe —— 后台继续收 events
  }, [sessionId, ensure, setHistoryLoaded])

  const send = useCallback(
    async (content: string) => {
      if (!sessionId) return
      const cur = useSessionStore.getState().byId[sessionId]
      if (!cur || cur.streaming) return   // per-session 串行保护

      const userMsg: ChatMessage = {
        id: `u-${Date.now()}`,
        role: "user",
        content,
        createdAt: new Date().toISOString(),
      }
      const placeholder: ChatMessage = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: "",
        createdAt: new Date().toISOString(),
      }

      // 乐观插入 + 锁 streaming
      useSessionStore.setState((s) => ({
        byId: {
          ...s.byId,
          [sessionId]: {
            ...cur,
            messages: [...cur.messages, userMsg, placeholder],
            streaming: true,
            error: null,
          },
        },
      }))

      // 自动标题判断（cur 是 send 入口快照,length===0 表示首条 user 消息）
      const isFirstUserMessage = cur.messages.length === 0
      const currentSessionTitle = typeof title === "string" ? title : null

      try {
        const { attemptId } = await submitMessage(sessionId, content)

        // 把 attemptId 写回占位
        useSessionStore.setState((s) => {
          const c = s.byId[sessionId]
          if (!c) return s
          return {
            byId: {
              ...s.byId,
              [sessionId]: {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === placeholder.id ? { ...m, attemptId } : m,
                ),
                activeAttemptId: attemptId,
              },
            },
          }
        })

        // 自动标题 PATCH（fire-and-forget，失败不影响 UI）
        if (isFirstUserMessage && !currentSessionTitle) {
          const t = content.slice(0, 30).trim()
          if (t) {
            void patchSession(sessionId, { title: t }).catch(() => undefined)
          }
        }
        // attempt 完成由 events 流触发 markAttemptComplete
      } catch (e) {
        useSessionStore.setState((s) => {
          const c = s.byId[sessionId]
          if (!c) return s
          return {
            byId: {
              ...s.byId,
              [sessionId]: {
                ...c,
                messages: c.messages.filter((m) => m.id !== placeholder.id),
                streaming: false,
                error: e instanceof Error ? e.message : "Submit failed",
              },
            },
          }
        })
      }
    },
    [sessionId, title],
  )

  const cancel = useCallback(async () => {
    if (!sessionId) return
    const cur = useSessionStore.getState().byId[sessionId]
    if (!cur?.streaming) return
    // 立即本地标记 —— UI 立刻反映
    useSessionStore.setState((s) => ({
      byId: {
        ...s.byId,
        [sessionId]: {
          ...(s.byId[sessionId] ?? cur),
          streaming: false,
          activeAttemptId: null,
        },
      },
    }))
    // fire-and-forget 调后端 cancel
    void cancelSession(sessionId).catch(() => undefined)
  }, [sessionId])

  return {
    messages: slice?.messages ?? [],
    streaming: slice?.streaming ?? false,
    error: slice?.error ?? null,
    loadingHistory,
    send,
    cancel,
  }
}

function toChatMessage(m: { id: string; role: string; content: string; createdAt: string | Date }): ChatMessage {
  return {
    id: m.id,
    role: m.role === "user" ? "user" : "assistant",
    content: m.content,
    createdAt: typeof m.createdAt === "string" ? m.createdAt : m.createdAt.toISOString(),
  }
}
