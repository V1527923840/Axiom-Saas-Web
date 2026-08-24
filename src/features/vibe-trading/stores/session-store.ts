import { create } from "zustand"
import {
  TOOL_OPEN,
  TOOL_CLOSE,
  findTrailingOpenToolCall,
} from "../lib/parse-message"
import type { GoalSnapshot, SwarmRunStatus, RagContext } from "../lib/vibe-types"

export type ChatMessage = {
  id: string
  role: "user" | "assistant"
  content: string
  attemptId?: string
  /** ISO timestamp; set when user cancels mid-stream — distinguishes user-cancelled
   *  assistant responses from a normal message that happens to contain
   *  "Execution failed: cancelled by user" copy from upstream. */
  cancelledAt?: string
  createdAt: string
  /**
   * Message discriminator. Undefined = legacy text message (default for existing
   * messages). "swarm_status" = synthetic message rendered by SwarmStatusCard.
   * "text" is the explicit label for text-bearing assistant/user messages; kept
   * optional so old messages without this field still type-check.
   */
  type?: "text" | "swarm_status"
  /**
   * Swarm run status payload — only set when `type === "swarm_status"`.
   * Keyed by SwarmRunStatus.runId at the store level (see upsertSwarmStatus).
   * NOT mixed with attemptId: a swarm_status message never has attemptId, so
   * the streaming mutators (appendDelta / setAttemptContent / appendToolCall /
   * markAttemptComplete) safely ignore it.
   */
  swarmStatus?: SwarmRunStatus
  /**
   * File uploaded alongside this user message. Persisted client-side so the
   * user bubble can render a file card (filename + path) next to the typed
   * text. The actual file_path is also embedded as a text prefix in the
   * `content` sent to the backend at submit-time — see
   * `use-chat-stream.send` for the prefix injection. After a session reload
   * this field is lost (server only stores `content`), which is acceptable:
   * the prefix is gone from the bubble's `content`, but the LLM never
   * re-processes historical messages anyway.
   */
  attachment?: { filename: string; file_path: string }
  /**
   * SSE rag_context payload from upstream vibe service. Carries the formatted
   * markdown digest + metadata (chunk_ids / entities_resolved / latency_ms).
   * Attached to the assistant message that owns the streaming attemptId.
   * See upsertRagContext for the race-safe write path (early-arrival buffering
   * via pendingRagContexts when the assistant message doesn't yet exist).
   */
  ragContext?: RagContext
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
   * 早到的 rag_context 缓冲：与 pendingDeltas 同等地位。SSE rag_context 事件到达时
   * 如果对应 attemptId 的消息还没在 messages 里（占位消息还没拿到 attemptId），先
   * 按 attemptId 缓存；stampAttemptIdOnMessages 回放时再写到目标消息上。
   */
  pendingRagContexts?: Record<string, RagContext>
  /**
   * Per-session goal state from the goal service. Set by setGoalSnapshot when
   * the snapshot is loaded (initial load + refresh); cleared by clearGoalSnapshot
   * on session switch / soft reset. Null = no goal loaded yet (default).
   */
  goalSnapshot: GoalSnapshot | null
  /**
   * 标记 goal 是否已经从服务端拉过一次(或确认没有)。
   * - false:slot 是新创建的/spread from softReset,useGoal 的 effect 应该跑一次
   *   GET /goal 来填 snapshot。
   * - true:setGoalSnapshot / clearGoalSnapshot / 失败的 fetch 都把它置 true,
   *   避免每次挂载或 sessionId 变化都重新拉。
   *
   * 跟 historyLoaded 是同类信号:每次 fetch 不论结果是 GoalSnapshot 还是 null
   * 都置 true,这样 cancel 后回到会话不会再被 server 上的 cancelled goal 状态
   * 覆盖掉本地"无目标"决定。
   */
  goalLoaded: boolean
  /**
   * 标记 swarm runs 是否已经从服务端拉过一次。
   * - false:slot 是新创建的/spread from softReset,useSwarmStatus 的 effect
   *   应当跑一次 GET /swarm/runs 来填 running/pending run 的 SwarmStatusCard。
   * - true:已加载 (不论有没有活跃 run),避免反复拉。
   *
   * 同 goalLoaded / historyLoaded:失败路径也要置 true,否则会因为 dependency
   * 不变而无限重拉。
   */
  swarmLoaded: boolean
}

type SessionStore = {
  byId: Record<string, PerSession>
  ensure: (sessionId: string) => PerSession
  appendDelta: (sessionId: string, attemptId: string, delta: string) => void
  /**
   * 用全量 content 覆盖匹配 attemptId 的消息;用于上游 text_delta 之后
   * 推送的 `{"content":"...", "attempt_id":"..."}` 同步帧。
   * 若无匹配,创建一条 synthetic stream-<aid> 用 fullText 兜底,后续 delta
   * 通过 hasMatch 分支追加。
   */
  setAttemptContent: (sessionId: string, attemptId: string, fullText: string) => void
  markAttemptComplete: (sessionId: string, attemptId: string, fullText?: string) => void
  markAttemptError: (sessionId: string, attemptId: string, message: string) => void
  /**
   * 把上游 vibe service 的 tool 事件(独立 SSE 事件,非 inline <tool_call> 标签)
   * 合成成 message content 里的 <tool_call>{...}</tool_call> 块,使 ToolCallBlock 能渲染。
   *
   * 上游事件形状:
   *   in-progress: {"tool":"get_market_data","elapsed_s":12,"attempt_id":"..."}
   *   done:        {"tool":"get_market_data","status":"ok","elapsed_ms":9828,"preview":"...","attempt_id":"..."}
   *
   * 如果 message 已存在(流式期间已通过 appendDelta 创建 stream-<aid>),append block;
   * 否则创建 synthetic stream-<aid> 消息并把 block 作为初始 content。
   */
  appendToolCall: (
    sessionId: string,
    attemptId: string,
    toolName: string,
    elapsedS?: number,
    elapsedMs?: number,
    preview?: string,
    status?: string,
  ) => void
  setEventsSubscribed: (sessionId: string, subscribed: boolean) => void
  setHistoryLoaded: (sessionId: string, messages: ChatMessage[]) => void
  reset: () => void
  /**
   * Session-switch reset: drop everything in the slot that pertains to the chat
   * stream, but KEEP the goal/swarm state so we don't refetch on every chat swap.
   *
   * - filters `messages` → only `swarm_status` messages survive (text and user
   *   messages are wiped, since they belong to the previous chat conversation)
   * - clears streaming/error/activeAttemptId/pending buffers/historyLoaded
   * - PRESERVES `goalSnapshot` (per-session goal is persistent across chat
   *   switches — same session may have both a goal and many chats)
   * - PRESERVES all `swarm_status` messages (run cards persist across chat
   *   switches)
   *
   * No-op if the session slot doesn't exist (matches other mutators).
   */
  softReset: (sessionId: string) => void
  /**
   * Goal service state — goal/swarm feature. See PerSession.goalSnapshot.
   */
  setGoalSnapshot: (sessionId: string, snapshot: GoalSnapshot) => void
  clearGoalSnapshot: (sessionId: string) => void
  /**
   * Insert a swarm_status message keyed by SwarmRunStatus.runId, OR update the
   * matching message's swarmStatus field in place if a message with the same
   * runId already exists. This is the canonical mutator for SSE swarm_status
   * events: each new event either creates a new run card or refreshes the
   * existing one.
   */
  upsertSwarmStatus: (sessionId: string, status: SwarmRunStatus) => void
  /**
   * Apply a functional updater to the swarm_status message keyed by runId.
   * No-op if no matching message exists.
   */
  updateSwarmStatus: (
    sessionId: string,
    runId: string,
    updater: (cur: SwarmRunStatus) => SwarmRunStatus,
  ) => void
  /** Delete the swarm_status message keyed by runId. No-op if not found. */
  removeSwarmStatus: (sessionId: string, runId: string) => void
  /**
   * SSE rag_context 事件入口。
   * 1. 若 messages 里已有 stream-<aid> synthetic → 直接写 ragContext
   * 2. 否则存入 pendingRagContexts[aid]
   */
  upsertRagContext: (sessionId: string, attemptId: string, rag: RagContext) => void
}

const empty = (): PerSession => ({
  messages: [],
  streaming: false,
  error: null,
  activeAttemptId: null,
  eventsSubscribed: false,
  historyLoaded: false,
  lastEventAt: 0,
  pendingRagContexts: {},
  goalSnapshot: null,
  goalLoaded: false,
  swarmLoaded: false,
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
 *    已含流式内容,不再叠加 buffered)。
 * 2. 没有 synthetic:在 placeholder 上写 attemptId + 用 buffered 作为初始 content。
 *
 * 纯函数 —— 抽出来便于在 store 里直接单测,use-chat-stream 的 send() 也调它。
 */
export function stampAttemptIdOnMessages(
  messages: ChatMessage[],
  placeholderId: string,
  attemptId: string,
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
      ? { ...m, attemptId, content: buffered || m.content }
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
      // Drain pendingRagContexts for this attemptId onto whichever message owns it.
      // Used when rag_context SSE event arrives before the assistant message is
      // created / before the attemptId is stamped — buffered via upsertRagContext.
      const pendingRag = cur.pendingRagContexts?.[aid]
      const drainedRag = (() => {
        if (!pendingRag) return undefined
        const next = { ...(cur.pendingRagContexts ?? {}) }
        delete next[aid]
        return next
      })()
      const attachRag = (m: ChatMessage): ChatMessage =>
        pendingRag && m.attemptId === aid ? { ...m, ragContext: pendingRag } : m
      const stripRagEmpty = (buf: Record<string, RagContext> | undefined) =>
        buf && Object.keys(buf).length > 0 ? buf : undefined
      const hasMatch = cur.messages.some((m) => m.attemptId === aid)
      if (hasMatch) {
        const messages = cur.messages.map((m) =>
          m.attemptId === aid
            ? { ...attachRag(m), content: m.content + delta }
            : m,
        )
        return {
          byId: {
            ...s.byId,
            [sid]: touchEvent({
              ...cur,
              messages,
              pendingRagContexts: stripRagEmpty(drainedRag),
            }),
          },
        }
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
            messages: [...cur.messages, attachRag(synthetic)],
            pendingDeltas,
            pendingRagContexts: stripRagEmpty(drainedRag),
          }),
        },
      }
    }),
  upsertRagContext: (sid, aid, rag) =>
    set((s) => {
      const cur = s.byId[sid]
      if (!cur) return s
      const existing = cur.messages.find((m) => m.attemptId === aid)
      if (existing) {
        return {
          ...s,
          byId: {
            ...s.byId,
            [sid]: touchEvent({
              ...cur,
              messages: cur.messages.map((m) =>
                m.attemptId === aid ? { ...m, ragContext: rag } : m,
              ),
            }),
          },
        }
      }
      return {
        ...s,
        byId: {
          ...s.byId,
          [sid]: touchEvent({
            ...cur,
            pendingRagContexts: { ...(cur.pendingRagContexts ?? {}), [aid]: rag },
          }),
        },
      }
    }),
  setAttemptContent: (sid, aid, fullText) =>
    set((s) => {
      const cur = s.byId[sid]
      if (!cur) return s
      // 清理该 aid 在 pendingDeltas 中的残留:已被 fullText 覆盖,后续 delta 不再追加旧的拼接内容。
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
      // 没有匹配 → 创建一个 synthetic 消息用 fullText 兜底,后续该 aid 的 delta 仍可通过 hasMatch 路径更新。
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
  appendToolCall: (sid, aid, toolName, elapsedS, elapsedMs, preview, status) =>
    set((s) => {
      const cur = s.byId[sid]
      if (!cur) return s
      // 区分 in-progress (status 未定义) vs done (status 有值)。
      // in-progress 写 OPEN 块 → parser 标 closed:false → findOpenToolCalls
      // 才能返回它,ToolCallIndicator 才会在输入框上方显示;done 关闭与之配对的
      // OPEN 块(close-in-place),让 inline ToolCallBlock 渲染 checkmark,
      // 且不再计入上方指示器。
      const isDone = status !== undefined
      const toolData: Record<string, unknown> = { name: toolName }
      if (isDone) {
        toolData.status = status
        if (elapsedMs !== undefined) toolData.elapsed_ms = elapsedMs
        else if (elapsedS !== undefined) toolData.elapsed_s = elapsedS
        if (preview !== undefined) toolData.preview = preview
      } else if (elapsedS !== undefined) {
        toolData.elapsed_s = elapsedS
      }

      const matched = cur.messages.find((m) => m.attemptId === aid)
      if (!matched) {
        // 没有匹配 → 创建 synthetic stream-<aid> 并把 block 作为初始 content。
        // done 事件在 no-match 时直接写成自闭合块(synthetic 还没有 prior OPEN
        // 可关联),代价是上游 done 早于 in-progress 到达时丢掉 elapsed_s;可接受。
        const block = isDone
          ? `${TOOL_OPEN}${JSON.stringify(toolData)}${TOOL_CLOSE}`
          : `${TOOL_OPEN}${JSON.stringify(toolData)}`
        const synthetic: ChatMessage = {
          id: `stream-${aid}`,
          role: "assistant",
          attemptId: aid,
          content: block,
          createdAt: new Date().toISOString(),
        }
        return {
          byId: {
            ...s.byId,
            [sid]: touchEvent({ ...cur, messages: [...cur.messages, synthetic] }),
          },
        }
      }

      // 已存在匹配的 assistant 消息。
      if (isDone) {
        // ★ Done 事件:close-in-place。如果 matched.content 末尾有一个 name
        // 匹配的未闭合 <tool_call> 块,把它替换成新的 closed 块(用本次的
        // status/elapsed_ms/preview 数据)。
        //
        // 为什么:appendToolCall 之前的设计是 done 时再 append 一个新的 closed
        // 块,与 prior OPEN 并存。结果 parser 从 OPEN 一直扫到下一个 CLOSE,
        // 把 OPEN 和 CLOSED 合并成同一个 closed:true segment,内含嵌套字面
        // <tool_call> 文本 → JSON.parse 失败 → ToolCallBlock 显示"工具"
        // 而不是真实 tool name。
        //
        // close-in-place 让每个 tool 永远是单独的 closed 块(JSON 合法,
        // name 可读),同时把 N 个 tool 调用占用的视觉空间减半(本来是
        // N*2 段,现在是 N 段)。
        const content = matched.content
        const trailing = findTrailingOpenToolCall(content, toolName)
        if (trailing && trailing.name === toolName) {
          const openStart = trailing.startIdx
          const afterOpen = openStart + TOOL_OPEN.length
          const nextOpen = content.indexOf(TOOL_OPEN, afterOpen)
          const blockEnd = nextOpen === -1 ? content.length : nextOpen
          const replacement = `${TOOL_OPEN}${JSON.stringify(toolData)}${TOOL_CLOSE}`
          const newContent =
            content.slice(0, openStart) + replacement + content.slice(blockEnd)
          const messages = cur.messages.map((m) =>
            m.attemptId === aid ? { ...m, content: newContent } : m,
          )
          return {
            byId: { ...s.byId, [sid]: touchEvent({ ...cur, messages }) },
          }
        }
        // ★ Defensive fallback:找不到同名未闭合 OPEN(done 早于 in-progress,
        // 或 done 跨同名 tool 误关联)。保持旧行为 append 一个 fresh CLOSED
        // 块,避免数据丢失。
        const block = `${TOOL_OPEN}${JSON.stringify(toolData)}${TOOL_CLOSE}`
        const messages = cur.messages.map((m) =>
          m.attemptId === aid ? { ...m, content: m.content + block } : m,
        )
        return { byId: { ...s.byId, [sid]: touchEvent({ ...cur, messages }) } }
      }

      // In-progress: append OPEN 块(无 CLOSE),UI 显示 spinner。
      const block = `${TOOL_OPEN}${JSON.stringify(toolData)}`
      const messages = cur.messages.map((m) =>
        m.attemptId === aid ? { ...m, content: m.content + block } : m,
      )
      return { byId: { ...s.byId, [sid]: touchEvent({ ...cur, messages }) } }
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
  softReset: (sid) =>
    set((s) => {
      const cur = s.byId[sid]
      if (!cur) return s
      return {
        byId: {
          ...s.byId,
          [sid]: {
            ...cur,
            messages: cur.messages.filter((m) => m.type === "swarm_status"),
            streaming: false,
            error: null,
            activeAttemptId: null,
            pendingDeltas: undefined,
            pendingRagContexts: undefined,
            historyLoaded: false,
          },
        },
      }
    }),
  setGoalSnapshot: (sid, snapshot) =>
    set((s) => {
      const cur = s.byId[sid]
      if (!cur) return s
      // 任何写 snapshot 的路径(create / refresh / 编辑 / 取消结果)都该标记已加载,
      // 否则下次进入同一 session 还会再发一次 GET /goal,既浪费也可能在 cancel 后
      // 把"本地无目标"决定覆盖成 server 上的 cancelled goal 状态。
      return {
        byId: {
          ...s.byId,
          [sid]: touchEvent({ ...cur, goalSnapshot: snapshot, goalLoaded: true }),
        },
      }
    }),
  clearGoalSnapshot: (sid) =>
    set((s) => {
      const cur = s.byId[sid]
      if (!cur) return s
      // 同上:清空也要视作"已经向 server 确认过该 session 没有目标",避免无限重拉。
      return {
        byId: {
          ...s.byId,
          [sid]: touchEvent({ ...cur, goalSnapshot: null, goalLoaded: true }),
        },
      }
    }),
  upsertSwarmStatus: (sid, status) =>
    set((s) => {
      const cur = s.byId[sid]
      if (!cur) return s
      // Keyed by runId, NOT attemptId — see ChatMessage.swarmStatus doc.
      // A text-bearing message with attemptId === status.runId would not match
      // here (m.type !== "swarm_status"); conversely a swarm_status message has
      // no attemptId, so appendDelta's `m.attemptId === aid` check skips it.
      const idx = cur.messages.findIndex(
        (m) => m.type === "swarm_status" && m.swarmStatus?.runId === status.runId,
      )
      if (idx >= 0) {
        const messages = cur.messages.map((m, i) =>
          i === idx ? { ...m, swarmStatus: status } : m,
        )
        return {
          byId: { ...s.byId, [sid]: touchEvent({ ...cur, messages }) },
        }
      }
      const message: ChatMessage = {
        id: `swarm-${status.runId}`,
        role: "assistant",
        type: "swarm_status",
        swarmStatus: status,
        content: "",
        createdAt: new Date().toISOString(),
      }
      return {
        byId: {
          ...s.byId,
          [sid]: touchEvent({ ...cur, messages: [...cur.messages, message] }),
        },
      }
    }),
  updateSwarmStatus: (sid, runId, updater) =>
    set((s) => {
      const cur = s.byId[sid]
      if (!cur) return s
      const messages = cur.messages.map((m) =>
        m.type === "swarm_status" && m.swarmStatus?.runId === runId && m.swarmStatus
          ? { ...m, swarmStatus: updater(m.swarmStatus) }
          : m,
      )
      return {
        byId: { ...s.byId, [sid]: touchEvent({ ...cur, messages }) },
      }
    }),
  removeSwarmStatus: (sid, runId) =>
    set((s) => {
      const cur = s.byId[sid]
      if (!cur) return s
      const messages = cur.messages.filter(
        (m) => !(m.type === "swarm_status" && m.swarmStatus?.runId === runId),
      )
      return {
        byId: { ...s.byId, [sid]: touchEvent({ ...cur, messages }) },
      }
    }),
}))