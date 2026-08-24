import { describe, it, expect } from "vitest"
import { parseSources } from "./parse-sources"

describe("parseSources", () => {
  it("returns [] for empty input", () => {
    expect(parseSources("")).toEqual([])
  })

  it("returns [] for non-list markdown", () => {
    expect(parseSources("hello world")).toEqual([])
  })

  it("parses a single card with all 5 fields", () => {
    const md = [
      "- **知识星球 · 摘要** (相似度 0.82)",
      "  _《中芯国际Q2Q6业绩快评》_ (2026-08-13)",
      "  中芯国际2026业绩与产能双兑现，3Q26指引显示涨价驱动盈利质量接力增长",
    ].join("\n")
    expect(parseSources(md)).toEqual([
      {
        source: "知识星球",
        view: "摘要",
        title: "中芯国际Q2Q6业绩快评",
        date: "2026-08-13",
        similarity: "0.82",
        body: "中芯国际2026业绩与产能双兑现，3Q26指引显示涨价驱动盈利质量接力增长",
      },
    ])
  })

  it("parses multiple cards separated by \\n---\\n", () => {
    const md = [
      "- **知识星球 · 摘要** (相似度 0.67)",
      "  _《标题A》_ (2026-08-13)",
      "  body A",
      "---",
      "- **知识星球 · 基础事实** (相似度 0.65)",
      "  _《标题B》_ (2026-08-14)",
      "  body B",
    ].join("\n")
    const out = parseSources(md)
    expect(out).toHaveLength(2)
    expect(out[0]?.title).toBe("标题A")
    expect(out[0]?.view).toBe("摘要")
    expect(out[1]?.title).toBe("标题B")
    expect(out[1]?.view).toBe("基础事实")
  })

  it("handles missing similarity gracefully", () => {
    const md = [
      "- **知识星球 · 原文**",
      "  _《标题X》_ (2026-08-15)",
      "  body X",
    ].join("\n")
    expect(parseSources(md)).toEqual([
      {
        source: "知识星球",
        view: "原文",
        title: "标题X",
        date: "2026-08-15",
        similarity: undefined,
        body: "body X",
      },
    ])
  })

  it("skips blocks that don't start with -", () => {
    const md = [
      "## 这是分隔标题",
      "- **知识星球 · 摘要** (相似度 0.50)",
      "  _《有效标题》_ (2026-08-13)",
      "  body",
    ].join("\n")
    expect(parseSources(md)).toHaveLength(1)
    expect(parseSources(md)[0]?.title).toBe("有效标题")
  })

  it("returns [] on parse failure without throwing", () => {
    const md = "- **知识星球 · 摘要**"
    expect(() => parseSources(md)).not.toThrow()
    const out = parseSources(md)
    expect(out).toHaveLength(1)
    expect(out[0]?.title).toBe("")
  })
})
