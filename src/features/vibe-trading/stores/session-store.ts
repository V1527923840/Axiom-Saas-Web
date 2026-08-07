import { create } from "zustand"

export type ChatMessage = {
  id: string
  role: "user" | "assistant"
  content: string
  attemptId?: string
  createdAt: string
}

export type PerSession = {
  messages: ChatMessage[]
  streaming: boolean
  error: string | null
  activeAttemptId: string | null
  eventsSubscribed: boolean
  historyLoaded: boolean
  /**
   * 缓冲早到的 text_delta:Race — POST /messages 返回 attemptId 之前,
   * /events 已经把第一批 delta 推过来了,此时 placeholder.attemptId 还没设上,
   * 匹配失败会丢。改为把这种 delta 按 attemptId 暂存,等 attemptId 写入占位时一次性回放。
   */
  pendingDeltas?: Record<string, string>
}

type SessionStore = {
  byId: Record<string, PerSession>
  ensure: (sessionId: string) => PerSession
  appendDelta: (sessionId: string, attemptId: string, delta: string) => void
  markAttemptComplete: (sessionId: string, attemptId: string, fullText?: string) => void
  markAttemptError: (sessionId: string, attemptId: string, message: string) => void
  setEventsSubscribed: (sessionId: string, subscribed: boolean) => void
  setHistoryLoaded: (sessionId: string, messages: ChatMessage[]) => void
  reset: () => void
}

const empty = (): PerSession => ({
  messages: [],
  streaming: false,
  error: null,
  activeAttemptId: null,
  eventsSubscribed: false,
  historyLoaded: false,
})

export const useSessionStore = create<SessionStore>((set, get) => ({
  byId: {},
  ensure: (id) => {
    const cur = get().byId[id]
    if (cur) return cur
    const fresh = empty()
    set((s) => ({ byId: { ...s.byId, [id]: fresh } }))
    return fresh
  },
  appendDelta: (sid, aid, delta) =>
    set((s) => {
      const cur = s.byId[sid]
      if (!cur) return s
      const hasMatch = cur.messages.some((m) => m.attemptId === aid)
      if (hasMatch) {
        const messages = cur.messages.map((m) =>
          m.attemptId === aid ? { ...m, content: m.content + delta } : m,
        )
        return { byId: { ...s.byId, [sid]: { ...cur, messages } } }
      }
      // 没有匹配:很可能是 POST /messages 还没返回 attemptId,而 /events 已经把
      // 该 attempt 的首批 delta 推过来了。把 delta 按 attemptId 暂存,
      // send() 拿到 attemptId 回填占位时会一次性回放。
      const pendingDeltas = { ...(cur.pendingDeltas ?? {}) }
      pendingDeltas[aid] = (pendingDeltas[aid] ?? "") + delta
      return { byId: { ...s.byId, [sid]: { ...cur, pendingDeltas } } }
    }),
  markAttemptComplete: (sid, aid, fullText) =>
    set((s) => {
      const cur = s.byId[sid]
      if (!cur) return s
      const messages = cur.messages.map((m) =>
        m.attemptId === aid ? { ...m, content: fullText ?? m.content } : m,
      )
      const stillStreaming = cur.activeAttemptId === aid ? false : cur.streaming
      return {
        byId: {
          ...s.byId,
          [sid]: { ...cur, messages, streaming: stillStreaming, activeAttemptId: null },
        },
      }
    }),
  markAttemptError: (sid, aid, message) =>
    set((s) => {
      const cur = s.byId[sid]
      if (!cur) return s
      return {
        byId: {
          ...s.byId,
          [sid]: {
            ...cur,
            error: message,
            streaming: cur.activeAttemptId === aid ? false : cur.streaming,
            activeAttemptId: null,
          },
        },
      }
    }),
  setEventsSubscribed: (sid, subscribed) =>
    set((s) => {
      const cur = s.byId[sid]
      if (!cur) return s
      return {
        byId: { ...s.byId, [sid]: { ...cur, eventsSubscribed: subscribed } },
      }
    }),
  setHistoryLoaded: (sid, messages) =>
    set((s) => {
      const cur = s.byId[sid]
      if (!cur) return s
      return {
        byId: {
          ...s.byId,
          [sid]: { ...cur, messages, historyLoaded: true },
        },
      }
    }),
  reset: () => set({ byId: {} }),
}))