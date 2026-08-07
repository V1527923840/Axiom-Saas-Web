import { describe, it, expect } from "vitest"
import { parseMessageSegments } from "./parse-message"

describe("parseMessageSegments — closed flag", () => {
  it("marks a fully-closed think segment as closed=true", () => {
    const segs = parseMessageSegments("before<think>thinking</think>after")
    const think = segs.find((s) => s.type === "thinking")
    expect(think).toMatchObject({ type: "thinking", content: "thinking", closed: true })
  })

  it("marks an unclosed think segment as closed=false", () => {
    const segs = parseMessageSegments("<think>still going")
    const think = segs.find((s) => s.type === "thinking")
    expect(think).toMatchObject({ type: "thinking", content: "still going", closed: false })
  })

  it("marks a closed tool_call segment as closed=true", () => {
    const segs = parseMessageSegments('<tool_call>{"name":"x"}</tool_call>')
    const tool = segs.find((s) => s.type === "tool")
    expect(tool).toMatchObject({ type: "tool", content: '{"name":"x"}', closed: true })
  })

  it("marks an unclosed tool_call segment as closed=false", () => {
    const segs = parseMessageSegments('<tool_call>{"name":')
    const tool = segs.find((s) => s.type === "tool")
    expect(tool).toMatchObject({ type: "tool", content: '{"name":', closed: false })
  })

  it("does not add closed to main segments", () => {
    const segs = parseMessageSegments("hello world")
    expect(segs[0]).toEqual({ type: "main", content: "hello world" })
  })
})
