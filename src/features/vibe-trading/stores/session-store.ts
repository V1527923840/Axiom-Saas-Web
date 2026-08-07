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

/**
 * 把 attemptId 写回占位消息 —— send() 在拿到 submitMessage 返回值后调用。
 *
 * 处理两种状态:
 * 1. messages 里已经有 stream-<aid> synthetic (POST 还没返回,/events 已推了首批 delta):
 *    synthetic 是权威版本,丢弃 placeholder,把 attemptId 写回 synthetic (synthetic.content
 *    已含流式内容,不再叠加 buffered/snapshot)。
 * 2. 没有 synthetic:在 placeholder 上写 attemptId + 用 snapshot/buffered 作为初始 content。
 *
 * 纯函数 —— 抽出来便于在 store 里直接单测,use-chat-stream 的 send() 也调它。
 */
export function stampAttemptIdOnMessages(
  messages: ChatMessage[],
  placeholderId: string,
  attemptId: string,
  snapshot: string | undefined,
  buffered: string,
): ChatMessage[] {
  const synthetic = messages.find((m) => m.attemptId === attemptId)
  if (synthetic) {
    return messages
      .filter((m) => m.id !== placeholderId)
      .map((m) => (m.attemptId === attemptId ? { ...m, attemptId } : m))
  }
  return messages.map((m) =>
    m.id === placeholderId
      ? { ...m, attemptId, content: snapshot ?? (buffered || m.content) }
      : m,
  )
}

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
      // 1. 匹配消息路径下,已有 delta 全部作废,被 fullText 覆盖;同时必须清掉 pendingSnapshot,
      //    否则 appendDelta 在 hasMatch=true 时会被 pendingSnapshot 守卫拦截,导致后续 delta 永久丢失
      //    —— 这是 C2 bug 的根因。
      // 2. 暂存路径下,synthetic 消息用 fullText 兜底,不再写 pendingSnapshot:
      //    synthetic 已经承载了 fullText,后续 delta 通过 hasMatch 分支追加即可;
      //    写 pendingSnapshot 会反过来拦截后续的 delta。
      const restDeltas = cur.pendingDeltas
        ? Object.fromEntries(
            Object.entries(cur.pendingDeltas).filter(([k]) => k !== aid),
          )
        : undefined
      const restSnapshots = cur.pendingSnapshot
        ? Object.fromEntries(
            Object.entries(cur.pendingSnapshot).filter(([k]) => k !== aid),
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
              pendingSnapshot:
                restSnapshots && Object.keys(restSnapshots).length > 0
                  ? restSnapshots
                  : undefined,
            }),
          },
        }
      }
      // 没有匹配 → 创建一个 synthetic 消息用 fullText 兜底,后续该 aid 的 delta 仍可通过 hasMatch 路径更新。
      // 注意:此处不写 pendingSnapshot —— synthetic 已经持有 fullText,写入会让 appendDelta 永久拒绝后续 delta。
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
            pendingDeltas:
              restDeltas && Object.keys(restDeltas).length > 0
                ? restDeltas
                : undefined,
            pendingSnapshot:
              restSnapshots && Object.keys(restSnapshots).length > 0
                ? restSnapshots
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
      // 错误归属判定 —— 不能只看 activeAttemptId:
      // - activeAttemptId === aid:本地 send() 启的 attempt,正常情况
      // - activeAttemptId === null 但 cur.messages 里有 stream-<aid> synthetic:
      //   refresh 后接续旧 attempt 的情况,slot.activeAttemptId 还没填,但 synthetic 已存在,
      //   此时必须接收错误,否则用户看到 events 还在流但 UI 永远不报错 (I4 bug)
      // - 都没有:过时的 attempt_id (e.g. 上一次 cancel 后的滞后事件),忽略。
      const matchesActive = cur.activeAttemptId === aid
      const matchesMessage = cur.messages.some((m) => m.attemptId === aid)
      if (!matchesActive && !matchesMessage) return s
      return {
        byId: {
          ...s.byId,
          [sid]: touchEvent({
            ...cur,
            error: message,
            streaming: false,
            activeAttemptId: matchesActive ? null : cur.activeAttemptId,
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
      // history 加载:每条 incoming 消息权威。cur 里所有"可被 incoming 替代"的条目都需要去重:
      // 1. attemptId 匹配 (synthetic stream-<aid> 或任何已有 attemptId 的条目) —— SSE 期间可能
      //    已经创建了 stream-<aid> 合成消息,history 拉回来时同 attemptId 的条目权威。
      // 2. id 匹配 —— 防御同 id 重复渲染 (虽然 u-${ts}/a-${ts} 乐观 id 与服务端 id 通常不撞,
      //    但保留这条防御更稳)。
      // 乐观插入但还没 attemptId 的 user / placeholder (u-${ts} / a-${ts}) 与服务端 id 不撞,
      // 不会被这条去重吞掉,会作为后续 delta 的真实目标保留。
      const incomingAttemptIds = new Set(
        messages.filter((m) => m.attemptId).map((m) => m.attemptId as string),
      )
      const incomingIds = new Set(messages.map((m) => m.id))
      const cleanedCur = cur.messages.filter((m) => {
        if (m.attemptId && incomingAttemptIds.has(m.attemptId)) return false
        if (incomingIds.has(m.id)) return false
        return true
      })
      return {
        byId: {
          ...s.byId,
          [sid]: { ...cur, messages: [...cleanedCur, ...messages], historyLoaded: true },
        },
      }
    }),
  reset: () => set({ byId: {} }),
}))