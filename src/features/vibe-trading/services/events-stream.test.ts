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
    expect(inferSseEvent(frame({ markdown: "x" }))).not.toBe("rag_context")
  })

  it("classifies a rag_context frame (markdown + attempt_id) as rag_context", () => {
    // Regression: parseSseEvent must reclassify upstream SSE frames shaped as
    // { markdown, attempt_id, chunk_ids, latency_ms, ... } to "rag_context",
    // otherwise routeEvent silently drops them and the assistant bubble never
    // gets a ragContext during live streaming (panel only appears after refresh).
    expect(
      inferSseEvent(
        frame({
          markdown: "- **k**",
          attempt_id: "a",
          chunk_ids: [1],
          latency_ms: 10,
        }),
      ),
    ).toBe("rag_context")
  })

  it("routes a rag_context frame to upsertRagContext (live stream, not silent drop)", () => {
    // End-to-end: parseSseEvent reclassifies the upstream "message" frame to
    // "rag_context", and routeEvent then dispatches to upsertRagContext. This
    // catches the regression where the frame stayed classified as "message"
    // and was silently dropped (panel only appearing after page refresh).
    const upsert = vi.spyOn(useSessionStore.getState(), "upsertRagContext")
    const parsed = parseSseEvent(
      frame({
        markdown: "- **k**",
        attempt_id: "a",
        chunk_ids: [1, 2],
        entities_resolved: {},
        latency_ms: 42,
      }),
    )
    expect(parsed?.event).toBe("rag_context")
    routeEvent(sid, parsed!)
    expect(upsert).toHaveBeenCalledWith(
      sid,
      "a",
      expect.objectContaining({ markdown: "- **k**", latency_ms: 42 }),
    )
  })

  // ─── corpus_sources (2026-08-30 unified data-source event) ──────────────

  it("classifies a corpus_sources frame (sources array + attempt_id) as corpus_sources", () => {
    // 2026-08-30: 后端归一事件,shape = { sources: [...], attempt_id }。
    // 必须从 "message" 兜底分类出来,否则 routeEvent 走不到新 case,
    // RagContextPanel 永远拿不到数据源面板。
    const ev = parseSseEvent(
      frame({
        sources: [
          {
            tool: "prefetch",
            source: "zsxq_posts",
            chunk_id: 101,
            view_type: "summary",
            title: "中芯国际2Q26业绩快评",
            publish_date: "2026-08-13",
            similarity: 0.82,
            content_text: "中芯国际2Q26业绩与产能双兑现",
          },
        ],
        attempt_id: "a",
      }),
    )
    expect(ev?.event).toBe("corpus_sources")
  })

  it("routes a corpus_sources frame to upsertRagContext with sources array", () => {
    const upsert = vi.spyOn(useSessionStore.getState(), "upsertRagContext")
    const sources = [
      {
        tool: "prefetch",
        source: "zsxq_posts",
        chunk_id: 101,
        view_type: "summary",
        title: "中芯国际2Q26业绩快评",
        publish_date: "2026-08-13",
        similarity: 0.82,
        content_text: "中芯国际2Q26业绩与产能双兑现",
      },
      {
        tool: "corpus_search_zhishi",
        source: "zsxq_posts",
        chunk_id: 102,
        view_type: "summary",
        title: "另一篇研报",
        publish_date: "2026-08-14",
        similarity: 0.66,
        content_text: "另一段正文",
      },
    ]
    const parsed = parseSseEvent(
      frame({ sources, attempt_id: "a" }),
    )
    expect(parsed?.event).toBe("corpus_sources")
    routeEvent(sid, parsed!)
    expect(upsert).toHaveBeenCalledWith(
      sid,
      "a",
      expect.objectContaining({ sources: expect.arrayContaining(sources) }),
    )
  })

  it("ignores corpus_sources frames with empty sources array", () => {
    // 空数组 → 视为无命中,不调用 upsertRagContext。
    const upsert = vi.spyOn(useSessionStore.getState(), "upsertRagContext")
    routeEvent(sid, { event: "corpus_sources", data: { sources: [], attempt_id: "a" } })
    expect(upsert).not.toHaveBeenCalled()
  })

  it("ignores corpus_sources frames without attempt_id", () => {
    const upsert = vi.spyOn(useSessionStore.getState(), "upsertRagContext")
    routeEvent(sid, { event: "corpus_sources", data: { sources: [{ tool: "x" }] } })
    expect(upsert).not.toHaveBeenCalled()
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
