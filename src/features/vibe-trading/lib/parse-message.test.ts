import { describe, it, expect } from "vitest"
import { parseMessageSegments, findOpenToolCalls, parseAttachmentPrefix } from "./parse-message"

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
    expect(segs[0]).toEqual({ type: "main", content: "hello world", start: 0 })
  })
})

describe("findOpenToolCalls", () => {
  it("returns empty for content with no tool_call", () => {
    expect(findOpenToolCalls("plain text only")).toEqual([])
  })

  it("returns empty when tool_call is fully closed", () => {
    expect(findOpenToolCalls('<tool_call>{"name":"x"}</tool_call>')).toEqual([])
  })

  it("returns one open call with parsed name and params", () => {
    const calls = findOpenToolCalls('<tool_call>{"name":"getQuote","symbol":"AAPL"}')
    expect(calls).toHaveLength(1)
    expect(calls[0].raw).toBe('{"name":"getQuote","symbol":"AAPL"}')
    expect(calls[0].toolName).toBe("getQuote")
    expect(calls[0].parsed).toEqual({ name: "getQuote", symbol: "AAPL" })
  })

  it("returns multiple open calls in order", () => {
    const content =
      '<tool_call>{"name":"first"}<tool_call>{"name":"second"'
    const calls = findOpenToolCalls(content)
    expect(calls).toHaveLength(2)
    expect(calls[0].toolName).toBe("first")
    expect(calls[1].toolName).toBe("second")
  })

  it("skips closed tool_call and only returns the open one", () => {
    const content = '<tool_call>{"name":"done"}</tool_call><tool_call>{"name":"running"'
    const calls = findOpenToolCalls(content)
    expect(calls).toHaveLength(1)
    expect(calls[0].toolName).toBe("running")
  })

  it("leaves toolName undefined when JSON is malformed", () => {
    const calls = findOpenToolCalls('<tool_call>{not valid')
    expect(calls).toHaveLength(1)
    expect(calls[0].toolName).toBeUndefined()
    expect(calls[0].parsed).toBeUndefined()
  })

  it("recovers toolName from partial JSON when value is still streaming in", () => {
    // 上游流式场景:tool_call 已开,但 JSON 还没写完 —— JSON.parse 会抛,
    // 走 extractToolNameFromPartialJson 兜底,返回当前已写出的 name。
    const calls = findOpenToolCalls('<tool_call>{"name":"getQuote","sym')
    expect(calls).toHaveLength(1)
    expect(calls[0].toolName).toBe("getQuote")
    expect(calls[0].parsed).toBeUndefined()
  })

  it("recovers toolName from partial JSON when key is named 'tool' instead of 'name'", () => {
    const calls = findOpenToolCalls('<tool_call>{"tool":"lookup",')
    expect(calls).toHaveLength(1)
    expect(calls[0].toolName).toBe("lookup")
  })
})

describe("parseAttachmentPrefix", () => {
  it("extracts filename and file_path from the standard [Uploaded file: ...] prefix", () => {
    const content =
      "[Uploaded file: 财联社早知道.pdf, path: uploads/abc.pdf]\n\n帮我分析这份文件"
    const parsed = parseAttachmentPrefix(content)
    expect(parsed).not.toBeNull()
    expect(parsed!.attachment).toEqual({
      filename: "财联社早知道.pdf",
      file_path: "uploads/abc.pdf",
    })
    expect(parsed!.remaining).toBe("帮我分析这份文件")
  })

  it("handles Chinese filenames with special characters and spaces", () => {
    // 真实场景:用户上传文件名里有逗号/中文/长 Unicode 串
    const content =
      "[Uploaded file: 2-3 山东宏桥新型材料有限公司2024年度经审计的合并及母公司财务报告.pdf, path: uploads/0816b2ebd511464da46997a6fac2570d.pdf]\n\n总结这份年报"
    const parsed = parseAttachmentPrefix(content)
    expect(parsed).not.toBeNull()
    expect(parsed!.attachment.filename).toContain("山东宏桥")
    expect(parsed!.attachment.file_path).toBe(
      "uploads/0816b2ebd511464da46997a6fac2570d.pdf",
    )
    expect(parsed!.remaining).toBe("总结这份年报")
  })

  it("returns null when content does not start with the prefix", () => {
    expect(parseAttachmentPrefix("普通消息没有附件")).toBeNull()
  })

  it("returns null when prefix is malformed (missing closing bracket)", () => {
    expect(
      parseAttachmentPrefix("[Uploaded file: x.pdf, path: uploads/x.pdf\n\nmsg"),
    ).toBeNull()
  })

  it("returns null when prefix is malformed (missing the [Uploaded file: marker)", () => {
    expect(
      parseAttachmentPrefix("[file: x.pdf, path: uploads/x.pdf]\n\nmsg"),
    ).toBeNull()
  })

  it("preserves multiline remaining content", () => {
    const content =
      "[Uploaded file: x.pdf, path: uploads/x.pdf]\n\n第一行\n第二行\n第三行"
    const parsed = parseAttachmentPrefix(content)
    expect(parsed).not.toBeNull()
    expect(parsed!.remaining).toBe("第一行\n第二行\n第三行")
  })

  it("returns empty remaining when content is exactly the prefix with no user text", () => {
    const content =
      "[Uploaded file: x.pdf, path: uploads/x.pdf]\n\n"
    const parsed = parseAttachmentPrefix(content)
    expect(parsed).not.toBeNull()
    expect(parsed!.remaining).toBe("")
  })
})
