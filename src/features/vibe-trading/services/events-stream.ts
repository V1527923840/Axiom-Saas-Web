// src/features/vibe-trading/services/events-stream.ts
import { API_BASE_URL, ApiRequestError } from "@/lib/api"
import { useSessionStore } from "../stores/session-store"

const controllers = new Map<string, AbortController>()

/** 超过这个时长没收到事件就认为控制器可能已死,触发强制重连。 */
export const STALE_THRESHOLD_MS = 30_000

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
    const slot = useSessionStore.getState().byId[sessionId]
    const lastEvent = slot?.lastEventAt ?? 0
    const isIdle = !(slot?.streaming ?? false)
    if (isIdle || Date.now() - lastEvent < STALE_THRESHOLD_MS) return
    existing.abort()
    controllers.delete(sessionId)
    useSessionStore.getState().setEventsSubscribed(sessionId, false)
  }
  const ctrl = new AbortController()
  controllers.set(sessionId, ctrl)
  useSessionStore.getState().setEventsSubscribed(sessionId, true)
  void runStream(sessionId, ctrl)
}

export function unsubscribeSession(sessionId: string): void {
  const ctrl = controllers.get(sessionId)
  if (ctrl) {
    ctrl.abort()
    controllers.delete(sessionId)
    useSessionStore.getState().setEventsSubscribed(sessionId, false)
  }
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

function routeEvent(
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
    // ignored: message.received, attempt.created, attempt.started, thinking_done
  }
}

function parseSseEvent(raw: string): { event: string; data: Record<string, unknown> } | null {
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
    if (typeof obj.delta === "string" && obj.attempt_id) event = "text_delta"
    else if (typeof obj.content === "string" && obj.attempt_id) event = "text_delta"
    else if (obj.status === "completed" && obj.attempt_id) event = "attempt.completed"
    else if (obj.status === "error" && obj.attempt_id) event = "attempt.error"
    // 上游 vibe service 把 tool 调用作为独立事件发出(非 inline <tool_call> 标签)。
    // 形状: {"tool":"name","elapsed_s":12,"attempt_id":"..."}  (in progress)
    // 或:   {"tool":"name","status":"ok","elapsed_ms":9828,"preview":"...","attempt_id":"..."}
    else if (typeof obj.tool === "string" && obj.attempt_id) event = "tool_event"
  }
  return { event, data: obj }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}