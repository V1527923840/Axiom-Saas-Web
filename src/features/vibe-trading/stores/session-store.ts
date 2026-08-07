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
  /** 最近一次收到 SSE 事件的 epoch ms。0 表示从未收到。 */
  lastEventAt: number
  /**
   * 缓冲早到的 text_delta:Race — POST /messages 返回 attemptId 之前,
   * /events 已经把第一批 delta 推过来了,此时 placeholder.attemptId 还没设上,
   * 匹配失败会丢。改为把这种 delta 按 attemptId 暂存,等 attemptId 写入占位时一次性回放。
   */
  pendingDeltas?: Record<string, string>
  /**
   * 缓冲早到的全量快照 content:上游在 text_delta 之后还会推一帧
   * `{"content":"<完整文本>", "attempt_id":"..."}` 用于重连恢复/对齐。
   * 同上 Race,先按 attemptId 暂存,attemptId 回填占位时直接覆盖 delta。
   */
  pendingSnapshot?: Record<string, string>
}

type SessionStore = {
  byId: Record<string, PerSession>
  ensure: (sessionId: string) => PerSession
  appendDelta: (sessionId: string, attemptId: string, delta: string) => void
  /**
   * 用全量 content 覆盖匹配 attemptId 的消息;用于上游 text_delta 之后
   * 推送的 `{"content":"...", "attempt_id":"..."}` 同步帧。
   * 若无匹配,按 attemptId 暂存到 pendingSnapshot,由 send() 回填。
   */
  setAttemptContent: (sessionId: string, attemptId: string, fullText: string) => void
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
  lastEventAt: 0,
})

const touchEvent = (cur: PerSession): PerSession => ({
  ...cur,
  lastEventAt: Date.now(),
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
      // 全量快照已存在 → 后续 delta 全部丢弃,避免和快照内容叠加
      if (cur.pendingSnapshot?.[aid] !== undefined) return s
      const hasMatch = cur.messages.some((m) => m.attemptId === aid)
      if (hasMatch) {
        const messages = cur.messages.map((m) =>
          m.attemptId === aid ? { ...m, content: m.content + delta } : m,
        )
        return { byId: { ...s.byId, [sid]: touchEvent({ ...cur, messages }) } }
      }
      // 没有匹配:很可能是 POST /messages 还没返回 attemptId,而 /events 已经把
      // 该 attempt 的首批 delta 推过来了。先创建一个 synthetic 消息使 UI 能即时渲染,
      // 后续 delta 通过 hasMatch 分支自然 append 到该消息上。
      const pendingDeltas = { ...(cur.pendingDeltas ?? {}) }
      pendingDeltas[aid] = (pendingDeltas[aid] ?? "") + delta
      const synthetic: ChatMessage = {
        id: `stream-${aid}`,
        role: "assistant",
        attemptId: aid,
        content: delta,
        createdAt: new Date().toISOString(),
      }
      return {
        byId: {
          ...s.byId,
          [sid]: touchEvent({
            ...cur,
            messages: [...cur.messages, synthetic],
            pendingDeltas,
          }),
        },
      }
    }),
  setAttemptContent: (sid, aid, fullText) =>
    set((s) => {
      const cur = s.byId[sid]
      if (!cur) return s
      // 清理该 aid 在 pendingDeltas / pendingSnapshot 中的残留:
      // 1. 匹配消息路径下,已有 delta 全部作废,被 fullText 覆盖
      // 2. 暂存路径下,snapshot 直接替换 buffered delta
      const restDeltas = cur.pendingDeltas
        ? Object.fromEntries(
            Object.entries(cur.pendingDeltas).filter(([k]) => k !== aid),
          )
        : undefined
      const hasMatch = cur.messages.some((m) => m.attemptId === aid)
      if (hasMatch) {
        const messages = cur.messages.map((m) =>
          m.attemptId === aid ? { ...m, content: fullText } : m,
        )
        return {
          byId: {
            ...s.byId,
            [sid]: touchEvent({
              ...cur,
              messages,
              pendingDeltas:
                restDeltas && Object.keys(restDeltas).length > 0
                  ? restDeltas
                  : undefined,
            }),
          },
        }
      }
      // 没有匹配 → 创建一个 synthetic 消息用 fullText 兜底,后续该 aid 的 delta 仍可通过 hasMatch 路径更新
      const pendingSnapshot = { ...(cur.pendingSnapshot ?? {}) }
      pendingSnapshot[aid] = fullText
      const synthetic: ChatMessage = {
        id: `stream-${aid}`,
        role: "assistant",
        attemptId: aid,
        content: fullText,
        createdAt: new Date().toISOString(),
      }
      return {
        byId: {
          ...s.byId,
          [sid]: touchEvent({
            ...cur,
            messages: [...cur.messages, synthetic],
            pendingSnapshot,
            pendingDeltas:
              restDeltas && Object.keys(restDeltas).length > 0
                ? restDeltas
                : undefined,
          }),
        },
      }
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
          [sid]: touchEvent({ ...cur, messages, streaming: stillStreaming, activeAttemptId: null }),
        },
      }
    }),
  markAttemptError: (sid, aid, message) =>
    set((s) => {
      const cur = s.byId[sid]
      if (!cur) return s
      // 只处理当前 active attempt 的 error,过时的 attempt_id (e.g. 上一次 cancel 后的滞后事件) 忽略。
      // 否则会把旧 attempt 的错误显示到当前正在流式的新 attempt 上,造成"events 还在流但 UI 报 Stream Error"。
      const isCurrent = cur.activeAttemptId === aid
      if (!isCurrent) return s
      return {
        byId: {
          ...s.byId,
          [sid]: touchEvent({
            ...cur,
            error: message,
            streaming: false,
            activeAttemptId: null,
          }),
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
      // history 加载:每条 incoming 消息权威。如果 incoming 带有 attemptId 且与 cur 里
      // 某条 synthetic stream-<aid> 同 attemptId,则移除那条 synthetic(避免 React 同时
      // 渲染两条气泡)。synthetic 的 attemptId 仍保留在 history message 上,
      // 后续 SSE delta 继续路由过去。
      const incomingAttemptIds = new Set(
        messages.filter((m) => m.attemptId).map((m) => m.attemptId as string),
      )
      const cleanedCur = cur.messages.filter(
        (m) => !(m.id.startsWith("stream-") && m.attemptId && incomingAttemptIds.has(m.attemptId)),
      )
      return {
        byId: {
          ...s.byId,
          [sid]: { ...cur, messages: [...cleanedCur, ...messages], historyLoaded: true },
        },
      }
    }),
  reset: () => set({ byId: {} }),
}))