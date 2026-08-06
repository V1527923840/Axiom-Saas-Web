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
      const messages = cur.messages.map((m) =>
        m.attemptId === aid ? { ...m, content: m.content + delta } : m,
      )
      return { byId: { ...s.byId, [sid]: { ...cur, messages } } }
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