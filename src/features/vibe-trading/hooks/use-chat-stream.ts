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

  // 进入会话：确保 store 槽存在 + 拉历史 + 开 /events 订阅
  useEffect(() => {
    if (!sessionId) return
    ensure(sessionId)
    const cur = useSessionStore.getState().byId[sessionId]
    if (cur && !cur.historyLoaded) {
      void getMessages(sessionId)
        .then((msgs) => {
          const history = msgs.map(toChatMessage)
          // 拉历史期间可能已乐观插入了消息（pendingMessage 自动发送场景）;
          // setHistoryLoaded 会整体替换 messages,这里把乐观消息接在历史之后,避免被冲掉。
          // 此刻 historyLoaded 仍为 false 且槽位初始为空,所以现存消息必为乐观插入,无需去重。
          const optimistic = useSessionStore.getState().byId[sessionId]?.messages ?? []
          setHistoryLoaded(
            sessionId,
            optimistic.length > 0 ? [...history, ...optimistic] : history,
          )
        })
        .catch((e) =>
          useSessionStore.setState((s) => {
            const c = s.byId[sessionId]
            if (!c) return s
            return {
              byId: {
                ...s.byId,
                [sessionId]: {
                  ...c,
                  // 同时置 historyLoaded,否则 loadingHistory 永远为 true:
                  // effect 依赖不变不会重跑,UI 会卡在"加载历史消息…"且 Sender 一直 disabled。
                  // 置为 true 后至少能解锁输入框并展示错误提示。
                  historyLoaded: true,
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

        // 把 attemptId 写回占位;同时回放 POST 期间积压在 pendingDeltas / pendingSnapshot 里的早批数据。
        // 优先级:pendingSnapshot(全量快照,来自上游 content 帧) > pendingDeltas(累积 delta) > 占位原 content。
        // 同时清掉上一次 attempt 残留的 error 状态,防止 cancel 旧 attempt 的滞后 attempt.error 事件污染当前会话。
        useSessionStore.setState((s) => {
          const c = s.byId[sessionId]
          if (!c) return s
          const snapshot = c.pendingSnapshot?.[attemptId]
          const buffered = c.pendingDeltas?.[attemptId] ?? ""
          const initialContent = snapshot ?? (buffered || "")
          const restDeltas = c.pendingDeltas
            ? Object.fromEntries(
                Object.entries(c.pendingDeltas).filter(([k]) => k !== attemptId),
              )
            : undefined
          const restSnapshots = c.pendingSnapshot
            ? Object.fromEntries(
                Object.entries(c.pendingSnapshot).filter(([k]) => k !== attemptId),
              )
            : undefined
          return {
            byId: {
              ...s.byId,
              [sessionId]: {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === placeholder.id
                    ? { ...m, attemptId, content: initialContent || m.content }
                    : m,
                ),
                activeAttemptId: attemptId,
                error: null,
                pendingDeltas:
                  restDeltas && Object.keys(restDeltas).length > 0
                    ? restDeltas
                    : undefined,
                pendingSnapshot:
                  restSnapshots && Object.keys(restSnapshots).length > 0
                    ? restSnapshots
                    : undefined,
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
