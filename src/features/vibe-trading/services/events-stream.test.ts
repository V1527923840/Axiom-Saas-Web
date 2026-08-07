import { describe, it, expect } from "vitest"
import { inferSseEvent } from "./events-stream"

function frame(data: Record<string, unknown>): string {
  return `data: ${JSON.stringify(data)}\n\n`
}

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
    expect(
      inferSseEvent(frame({ tool: "web_search", elapsed_s: 12, attempt_id: "a" })),
    ).toBe("tool_event")
  })

  it("classifies a tool succeeded frame (status=ok) as tool_event, not as completed", () => {
    // 工具事件的 status 字段描述工具本身的成败,不是整个 attempt 的完成。
    // 早期的工具事件按 attempt 事件路由,会误标 attempt 完成/失败。
    expect(
      inferSseEvent(
        frame({ tool: "web_search", status: "ok", elapsed_ms: 9828, attempt_id: "a" }),
      ),
    ).toBe("tool_event")
  })

  it("classifies a tool failed frame (status=error) as tool_event, not as attempt.error", () => {
    // 回归 bug:以前 obj.status === "error" 分支先于 obj.tool 分支,导致
    // 工具失败把整个 attempt 标记为 error,聊天底部冒出"Stream error",
    // 但 AI 仍在继续。
    expect(
      inferSseEvent(
        frame({ tool: "web_search", status: "error", elapsed_ms: 5000, attempt_id: "abc" }),
      ),
    ).toBe("tool_event")
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
