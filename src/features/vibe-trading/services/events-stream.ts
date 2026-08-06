// src/features/vibe-trading/services/events-stream.ts
import { API_BASE_URL, ApiRequestError } from "@/lib/api"
import { useSessionStore } from "../stores/session-store"

const controllers = new Map<string, AbortController>()

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
  if (controllers.has(sessionId)) return
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
      if (aid && typeof ev.data?.delta === "string") {
        store.appendDelta(sessionId, aid, ev.data.delta)
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
    // ignored: message.received, attempt.created, attempt.started, thinking_done
  }
}

function parseSseEvent(raw: string): { event: string; data: Record<string, unknown> } | null {
  let event = "message"
  const dataLines: string[] = []
  for (const line of raw.split("\n")) {
    if (line.startsWith(":")) continue
    if (line.startsWith("event:")) event = line.slice(6).trim()
    else if (line.startsWith("data:")) dataLines.push(line.slice(5).replace(/^ /, ""))
  }
  if (dataLines.length === 0) return null
  const text = dataLines.join("\n")
  try {
    const parsed = JSON.parse(text)
    return { event, data: parsed && typeof parsed === "object" ? parsed : { value: parsed } }
  } catch {
    return null
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}