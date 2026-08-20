import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  parseSseEvent,
  routeEvent,
  shouldReconnectSession,
  STREAMING_STALE_THRESHOLD_MS,
} from "./events-stream"
import { useSessionStore } from "../stores/session-store"
import { vibeApi } from "./vibe-api"

function frame(data: Record<string, unknown>): string {
  return `data: ${JSON.stringify(data)}\n\n`
}

// 仅供单测使用:从原始 SSE 帧推断事件类型,不分发副作用。
// 真实流式消费请走 subscribeSession()。原来的 export 助手 inferSseEvent
// 仅被这个测试文件使用,所以把映射逻辑放在这里,避免把内部 parser 推到 public api。
function inferSseEvent(raw: string): string | null {
  const ev = parseSseEvent(raw)
  return ev ? ev.event : null
}

const sid = "session-1"

beforeEach(() => {
  useSessionStore.getState().reset()
  useSessionStore.getState().ensure(sid)
  vi.restoreAllMocks()
})

describe("inferSseEvent", () => {
  it("classifies a text delta frame as text_delta", () => {
    expect(inferSseEvent(frame({ delta: "hi", attempt_id: "a" }))).toBe("text_delta")
  })

  it("classifies a text snapshot frame as text_delta", () => {
    expect(inferSseEvent(frame({ content: "full", attempt_id: "a" }))).toBe("text_delta")
  })

  it("classifies a completed-status frame as attempt.completed", () => {
    expect(inferSseEvent(frame({ status: "completed", attempt_id: "a" }))).toBe("attempt.completed")
  })

  it("classifies an error-status frame as attempt.error", () => {
    expect(inferSseEvent(frame({ status: "error", attempt_id: "a", error: "boom" }))).toBe("attempt.error")
  })

  it("classifies a plain tool-in-progress frame as tool_event", () => {
    expect(inferSseEvent(frame({ tool: "web_search", elapsed_s: 12, attempt_id: "a" }))).toBe("tool_event")
  })

  it("classifies a tool succeeded frame (status=ok) as tool_event, not as completed", () => {
    expect(inferSseEvent(frame({ tool: "web_search", status: "ok", elapsed_ms: 9828, attempt_id: "a" }))).toBe("tool_event")
  })

  it("classifies a tool failed frame (status=error) as tool_event, not as attempt.error", () => {
    expect(inferSseEvent(frame({ tool: "web_search", status: "error", elapsed_ms: 5000, attempt_id: "abc" }))).toBe("tool_event")
  })

  it("ignores frames without attempt_id", () => {
    expect(inferSseEvent(frame({ delta: "hi" }))).not.toBe("text_delta")
    expect(inferSseEvent(frame({ status: "completed" }))).not.toBe("attempt.completed")
    expect(inferSseEvent(frame({ status: "error" }))).not.toBe("attempt.error")
    expect(inferSseEvent(frame({ tool: "x" }))).not.toBe("tool_event")
  })

  it("returns null for malformed JSON", () => {
    expect(inferSseEvent("data: not json {\n\n")).toBeNull()
  })

  it("returns null for frame without data", () => {
    expect(inferSseEvent("event: ping\n\n")).toBeNull()
  })

  it("respects explicit event field", () => {
    expect(inferSseEvent("event: pong\n\ndata: {}\n\n")).toBe("pong")
  })
})

describe("goal/swarm/mandate routing", () => {
  it("clears terminal goal snapshots", () => {
    const clear = vi.spyOn(useSessionStore.getState(), "clearGoalSnapshot")
    routeEvent(sid, { event: "goal.updated", data: { goal: { status: "complete" }, snapshot: { id: "g" } } })
    expect(clear).toHaveBeenCalledWith(sid)
  })

  it("sets goal snapshot on non-terminal update", () => {
    const snapshot = { id: "g", goal: { status: "active" } }
    const set = vi.spyOn(useSessionStore.getState(), "setGoalSnapshot")
    routeEvent(sid, { event: "goal.updated", data: { snapshot } })
    expect(set).toHaveBeenCalledWith(sid, snapshot)
  })

  it("upserts swarm status when swarm starts", () => {
    const upsert = vi.spyOn(useSessionStore.getState(), "upsertSwarmStatus")
    routeEvent(sid, { event: "swarm.started", data: { run_id: "r", preset: "p", agents: [], tasks: [] } })
    expect(upsert).toHaveBeenCalledWith(sid, expect.objectContaining({ runId: "r" }))
  })

  it("updates swarm status for nested swarm events", () => {
    const update = vi.spyOn(useSessionStore.getState(), "updateSwarmStatus")
    const inner = { type: "layer_started", layer: 1 }
    routeEvent(sid, { event: "swarm.event", data: { run_id: "r", event: inner } })
    expect(update).toHaveBeenCalledWith(sid, "r", expect.any(Function))
  })

  it("ignores mandate proposals without throwing", () => {
    expect(() => routeEvent(sid, { event: "mandate.proposal", data: {} })).not.toThrow()
  })

  it("fetches a fresh goal snapshot when goal is created", async () => {
    const getGoal = vi.spyOn(vibeApi, "getGoal").mockResolvedValue({ id: "g" } as never)
    routeEvent(sid, { event: "goal.created", data: { goal: { id: "g" } } })
    await vi.waitFor(() => expect(getGoal).toHaveBeenCalledWith(sid))
  })
})

describe("shouldReconnectSession (2026-08-20 SSE STALE fix)", () => {
  it("exports STREAMING_STALE_THRESHOLD_MS = 5000", () => {
    expect(STREAMING_STALE_THRESHOLD_MS).toBe(5_000)
  })

  it("returns false when session is idle (not streaming)", () => {
    // Idle sessions never reconnect — silence is normal when no attempt is in flight.
    expect(shouldReconnectSession(false, 0, Date.now())).toBe(false)
    expect(shouldReconnectSession(false, Date.now() - 60_000, Date.now())).toBe(false)
  })

  it("returns false for streaming session within threshold", () => {
    const now = 1_000_000
    expect(shouldReconnectSession(true, now - 1_000, now)).toBe(false)
    expect(shouldReconnectSession(true, now - (5_000 - 1), now)).toBe(false)
  })

  it("returns true for streaming session beyond threshold", () => {
    const now = 1_000_000
    expect(shouldReconnectSession(true, now - 5_000, now)).toBe(true)
    expect(shouldReconnectSession(true, now - 10_000, now)).toBe(true)
    // The 10s "load_skill_file" frozen timer case from the bug report.
    expect(shouldReconnectSession(true, now - 10_000, now)).toBe(true)
  })

  it("returns true for streaming session with no events at all (lastEventAt=0)", () => {
    expect(shouldReconnectSession(true, 0, Date.now())).toBe(true)
  })
})
