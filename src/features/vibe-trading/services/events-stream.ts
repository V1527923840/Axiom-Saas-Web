// src/features/vibe-trading/services/events-stream.ts
import { API_BASE_URL, ApiRequestError } from "@/lib/api"
import { useSessionStore } from "../stores/session-store"
import { buildSwarmStatusFromStarted, applySwarmEvent } from "../lib/swarm-status"
import { vibeApi } from "./vibe-api"
import type { GoalSnapshot } from "../lib/vibe-types"

const TERMINAL_GOAL_STATUSES = new Set([
  "complete", "cancelled", "blocked", "superseded", "usage_limited",
])

const controllers = new Map<string, AbortController>()

/** 超过这个时长(in-flight streaming)没收到事件就认为控制器可能已死,触发强制重连。 */
export const STREAMING_STALE_THRESHOLD_MS = 5_000
/**
 * Legacy single-threshold. Kept for backward compatibility; idle sessions
 * never reconnect (only streaming ones do), so the idle branch is a no-op
 * and this constant is effectively unused outside tests. Prefer
 * ``STREAMING_STALE_THRESHOLD_MS`` for new code.
 */
export const STALE_THRESHOLD_MS = 30_000

/**
 * Pure decision: should the SSE controller for `sessionId` be torn down
 * and reconnected? Extracted so the policy is unit-testable without
 * spinning up a real fetch loop.
 */
export function shouldReconnectSession(
  isStreaming: boolean,
  lastEventAt: number,
  now: number = Date.now(),
): boolean {
  if (!isStreaming) return false
  return now - lastEventAt >= STREAMING_STALE_THRESHOLD_MS
}

function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("auth_token") : null
  return token ? { Authorization: `Bearer ${token}`, ...extra } : extra
}

/**
 * 打开（或保持）指定 session 的 GET /events 长连接。
 * 事件路由到 session-store（按 attempt_id）。
 * 断线指数退避重连（1s → 30s 上限）。
 */
export function subscribeSession(sessionId: string): void {
  const existing = controllers.get(sessionId)
  if (existing) {
    // 控制器存在但太久没收到事件 → 仅当"我们正期望收到事件" (streaming === true) 才视为死链。
    // lastEventAt 跟踪的是 AI 事件活跃度,空闲会话 (idle, 没有 in-flight attempt) 30s+ 没事件完全正常,
    // 不应主动 abort + 重建一个本来就健康的 SSE 连接 (I5 bug)。
    // ★ 2026-08-20 fix: streaming sessions now reconnect after
    // STREAMING_STALE_THRESHOLD_MS (5s) of silence instead of the legacy
    // 30s — otherwise a broken SSE silently freezes the UI's tool-call
    // timer at the last heartbeat value (the "load_skill_file 10s" hang).
    const slot = useSessionStore.getState().byId[sessionId]
    const isStreaming = slot?.streaming ?? false
    const lastEvent = slot?.lastEventAt ?? 0
    if (!shouldReconnectSession(isStreaming, lastEvent)) return
    existing.abort()
    controllers.delete(sessionId)
    useSessionStore.getState().setEventsSubscribed(sessionId, false)
  }
  const ctrl = new AbortController()
  controllers.set(sessionId, ctrl)
  useSessionStore.getState().setEventsSubscribed(sessionId, true)
  void runStream(sessionId, ctrl)
}

export function unsubscribeAll(): void {
  controllers.forEach((c) => c.abort())
  const ids = [...controllers.keys()]
  controllers.clear()
  ids.forEach((id) =>
    useSessionStore.getState().setEventsSubscribed(id, false),
  )
}

async function runStream(sessionId: string, ctrl: AbortController): Promise<void> {
  let backoff = 1000
  while (!ctrl.signal.aborted) {
    try {
      const res = await fetch(
        `${API_BASE_URL}/v1/ai-agent/sessions/${encodeURIComponent(sessionId)}/events`,
        {
          headers: authHeaders({ Accept: "text/event-stream" }),
          signal: ctrl.signal,
        },
      )
      if (!res.ok || !res.body) {
        throw new ApiRequestError(`events: ${res.status}`, res.status, "EVENTS_FAILED")
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ""
      while (!ctrl.signal.aborted) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const frames = buf.split("\n\n")
        buf = frames.pop() ?? ""
        for (const raw of frames) {
          const ev = parseSseEvent(raw)
          if (ev) routeEvent(sessionId, ev)
        }
      }
      backoff = 1000   // 干净断开重置
    } catch (e) {
      if (ctrl.signal.aborted) return
      if (e instanceof ApiRequestError && e.statusCode === 401) return   // api.ts 已处理跳转
      await sleep(backoff)
      backoff = Math.min(backoff * 2, 30_000)
    }
  }
}

export function routeEvent(
  sessionId: string,
  ev: { event: string; data: Record<string, unknown> },
): void {
  const store = useSessionStore.getState()
  const aid = ev.data?.attempt_id as string | undefined
  switch (ev.event) {
    case "text_delta":
      if (!aid) break
      // 上游单 attempt 流中,可能既有 delta 增量帧也有 content 全量快照帧。
      // 增量帧走 appendDelta 拼接;全量帧走 setAttemptContent 直接覆盖。
      if (typeof ev.data?.delta === "string") {
        store.appendDelta(sessionId, aid, ev.data.delta)
      } else if (typeof ev.data?.content === "string") {
        store.setAttemptContent(sessionId, aid, ev.data.content)
      }
      break
    case "attempt.completed":
      if (aid) {
        const summary = typeof ev.data?.summary === "string" ? ev.data.summary : undefined
        store.markAttemptComplete(sessionId, aid, summary)
      }
      break
    case "attempt.error":
      if (aid) {
        const msg = typeof ev.data?.error === "string" ? ev.data.error : "Stream error"
        store.markAttemptError(sessionId, aid, msg)
      }
      break
    case "tool_event":
      // 上游把 tool 调用发成独立事件(非 inline 标签),由 store 合成为 <tool_call> 块。
      if (aid && typeof ev.data?.tool === "string") {
        store.appendToolCall(
          sessionId,
          aid,
          ev.data.tool,
          typeof ev.data.elapsed_s === "number" ? ev.data.elapsed_s : undefined,
          typeof ev.data.elapsed_ms === "number" ? ev.data.elapsed_ms : undefined,
          typeof ev.data.preview === "string" ? ev.data.preview : undefined,
          typeof ev.data.status === "string" ? ev.data.status : undefined,
        )
      }
      break
    case "rag_context": {
      // Legacy path (pre-2026-08-30): 后端 agent loop 在 pre-loop 阶段 emit
      // `rag_context` 事件,载荷是已格式化的 markdown。store 负责 race-safe
      // 缓冲(写到 stream-<aid> synthetic 或 pendingRagContexts[aid])。
      // 2026-08-30 起后端归一到 `corpus_sources`,本分支仅作为回放历史会话
      // 的兜底 —— 新部署后端不再发 rag_context。
      const aid = ev.data?.attempt_id as string | undefined;
      if (!aid) break;
      const md = typeof ev.data?.markdown === "string" ? ev.data.markdown : "";
      if (!md) break; // 空 markdown 视为无命中,不渲染面板
      const chunkIds = Array.isArray(ev.data?.chunk_ids) ? ev.data.chunk_ids : [];
      const entities =
        ev.data?.entities_resolved && typeof ev.data.entities_resolved === "object"
          ? (ev.data.entities_resolved as Record<string, string>)
          : {};
      const latency =
        typeof ev.data?.latency_ms === "number" ? ev.data.latency_ms : 0;
      store.upsertRagContext(sessionId, aid, {
        markdown: md,
        chunk_ids: chunkIds,
        entities_resolved: entities,
        latency_ms: latency,
      });
      break;
    }

    case "corpus_sources": {
      // 2026-08-30 unified data-source path: 后端把 prefetch chunks 和
      // corpus_search_* 工具结果合并成 Array<CorpusSourceItem> 一并发出,
      // 由 attempt.completed 前一次性送完。挂到当前 attempt 对应的
      // assistant 消息 metadata 上,RagContextPanel 渲染。
      const aid = ev.data?.attempt_id as string | undefined;
      if (!aid) break;
      const sources = Array.isArray(ev.data?.sources)
        ? (ev.data.sources as unknown[]).filter(
            (s): s is NonNullable<unknown> => s !== null && typeof s === "object",
          )
        : [];
      if (sources.length === 0) break; // 空数组视为无命中,不渲染面板
      store.upsertRagContext(sessionId, aid, {
        sources: sources as never,
      });
      break;
    }
    case "goal.created":
      // 事件载荷不带 snapshot,需 fetch
      void (async () => {
        try {
          const snapshot = await vibeApi.getGoal(sessionId)
          if (snapshot) store.setGoalSnapshot(sessionId, snapshot)
        } catch (e) {
          if (import.meta.env.DEV) console.warn("[SSE] goal.created fetch failed:", e)
        }
      })()
      break

    case "goal.evidence":
      void (async () => {
        try {
          const snapshot = await vibeApi.getGoal(sessionId)
          if (snapshot) store.setGoalSnapshot(sessionId, snapshot)
          else store.clearGoalSnapshot(sessionId)
        } catch (e) {
          if (import.meta.env.DEV) console.warn("[SSE] goal.evidence fetch failed:", e)
        }
      })()
      break

    case "goal.updated": {
      const goal = ev.data?.goal as { status?: string } | undefined
      const snapshot = ev.data?.snapshot as GoalSnapshot | undefined
      if (goal && TERMINAL_GOAL_STATUSES.has(goal.status ?? "")) {
        store.clearGoalSnapshot(sessionId)
      } else if (snapshot) {
        store.setGoalSnapshot(sessionId, snapshot)
      } else {
        // 没有 snapshot 时降级为 fetch
        void (async () => {
          try {
            const fresh = await vibeApi.getGoal(sessionId)
            if (fresh) store.setGoalSnapshot(sessionId, fresh)
          } catch {}
        })()
      }
      break
    }

    case "swarm.started": {
      const status = buildSwarmStatusFromStarted(ev.data as Record<string, unknown>)
      if (status) {
        // 占位卡片 (chat-dialog 在用户选 "启动智能体蜂群" 时立刻注入的 sentinel
        // runId="__pending_swarm__") 用真实 runId 替换前先清掉,否则会同时
        // 显示 placeholder + 真实 run 两张卡。
        store.removeSwarmStatus(sessionId, "__pending_swarm__")
        store.upsertSwarmStatus(sessionId, status)
      }
      break
    }

    case "swarm.event": {
      const runId = typeof ev.data?.run_id === "string" ? ev.data.run_id : null
      const innerEvent = ev.data?.event
      if (!runId || !innerEvent) break
      store.updateSwarmStatus(sessionId, runId, (cur) => applySwarmEvent(cur, innerEvent))
      break
    }

    // mandate / live.* 预留扩展点 — 当前不渲染 UI,但保留事件 trace
    case "mandate.proposal":
    case "mandate.committed":
    case "live.action":
    case "live.halted":
    case "live.resumed":
      if (import.meta.env.DEV) console.warn(`[SSE] unhandled ${ev.event}:`, ev.data)
      break
    // 兜底:default 分支本应永远不会命中(parseSseEvent 已把所有已知形状
    // 分类到具体 case)。命中说明出现了一个新形状,前端没识别,事件被静默
    // 丢弃 —— 在 dev 环境打 warn,提醒排查是否有未挂载的事件类型
    // (例如 2026-08-27 的 rag_context 漏分类就靠这条 warning 暴露)。
    default:
      if (import.meta.env.DEV && ev.event !== "message") {
        console.warn(`[SSE] unhandled ${ev.event}:`, ev.data)
      }
      break
    // ignored: message.received, attempt.created, attempt.started, thinking_done
  }
}

export function parseSseEvent(raw: string): { event: string; data: Record<string, unknown> } | null {
  let event = "message"
  const dataLines: string[] = []
  // 与后端 vibe-client.service.ts 的 parseSseFrame 保持一致:
  // 用 indexOf(":") 切 field/value,而不是 startsWith,避免行内有额外字符。
  for (const line of raw.split("\n")) {
    if (!line || line.startsWith(":")) continue
    const colon = line.indexOf(":")
    const field = colon === -1 ? line : line.slice(0, colon)
    let value = colon === -1 ? "" : line.slice(colon + 1)
    if (value.startsWith(" ")) value = value.slice(1)
    if (field === "event") event = value.trim()
    else if (field === "data") dataLines.push(value)
  }
  if (dataLines.length === 0) return null
  const text = dataLines.join("\n")
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch (e) {
    // 之前静默吞掉 → 排查 SSE 不渲染问题时根本看不到原因。dev 环境打 console.warn。
    if (import.meta.env.DEV) {
      console.warn("[SSE] JSON parse failed:", text, e)
    }
    return null
  }
  const obj = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : { value: parsed }
  // 上游 vibe SSE 不发 `event:` 字段,所有帧默认归到 "message"。
  // 这里按 data 形状推断真实事件类型,匹配 routeEvent 的 switch 分支。
  if (event === "message") {
    // 工具事件优先判定 —— 上游 vibe service 把 tool 调用发为独立事件
    // {"tool":"name","elapsed_s":12,"attempt_id":"..."} 或
    // {"tool":"name","status":"error","elapsed_ms":N,"attempt_id":"..."} (工具失败)
    // 工具事件可能带 status:"ok"/"error",但那是工具的成败,不是整个 attempt 的成败
    if (typeof obj.tool === "string" && obj.attempt_id) event = "tool_event"
    else if (typeof obj.delta === "string" && obj.attempt_id) event = "text_delta"
    else if (typeof obj.content === "string" && obj.attempt_id) event = "text_delta"
    else if (obj.status === "completed" && obj.attempt_id) event = "attempt.completed"
    else if (obj.status === "error" && obj.attempt_id) event = "attempt.error"
    // rag_context 帧:上游 vibe SSE 在 pre-loop 阶段 emit,shape = { markdown, attempt_id, ... }。
    // 必须从 "message" 兜底分类出来,否则 routeEvent 的 switch 没 case 匹配,
    // 静默丢弃 → 助手气泡拿不到 ragContext → RagContextPanel 不渲染,只有刷新页面从
    // getMessages 拉服务端持久化的 metadata.rag_context 才会出现 (2026-08-27 回归)。
    else if (typeof obj.markdown === "string" && obj.attempt_id) event = "rag_context"
    // 2026-08-30: corpus_sources 帧 — 后端归一事件,shape = { sources: [...], attempt_id }。
    // 优先于 rag_context 判断(sources 字段是数组,不会与 markdown 字符串冲突),
    // 保证新事件路径优先路由到 corpus_sources 分支。
    else if (Array.isArray(obj.sources) && obj.attempt_id) event = "corpus_sources"
  }
  return { event, data: obj }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}