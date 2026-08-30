// Tests for the <RagContextPanel> component — collapsible panel under an
// assistant bubble that shows the RAG chunks used for the answer.

import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { createRoot, type Root } from "react-dom/client"
import { act } from "react"
import { RagContextPanel } from "./rag-context-panel"
import type { RagContext } from "../lib/vibe-types"

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement("div")
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
})

function makeRag(md: string): RagContext {
  return { markdown: md, chunk_ids: [1, 2], entities_resolved: {}, latency_ms: 42 }
}

describe("RagContextPanel", () => {
  it("renders nothing when markdown is empty", () => {
    act(() => {
      root.render(<RagContextPanel ragContext={{ markdown: "" }} />)
    })
    expect(container.querySelector("[data-testid='rag-context-panel']")).toBeNull()
  })

  it("renders collapsed by default with N-sources header", () => {
    const md = [
      "- **知识星球 · 摘要** (相似度 0.67)",
      "  _《标题A》_ (2026-08-13)",
      "  body A",
      "---",
      "- **知识星球 · 基础事实** (相似度 0.65)",
      "  _《标题B》_ (2026-08-14)",
      "  body B",
    ].join("\n")
    act(() => {
      root.render(<RagContextPanel ragContext={makeRag(md)} />)
    })
    const panel = container.querySelector("[data-testid='rag-context-panel']")
    expect(panel).not.toBeNull()
    expect(panel?.textContent).toMatch(/数据来源/)
    expect(panel?.textContent).toMatch(/2\s*条/)
    expect(panel?.querySelectorAll("[data-testid='rag-source-card']")).toHaveLength(0)
  })

  it("expands on click and shows one card per parsed source", () => {
    const md = [
      "- **知识星球 · 摘要** (相似度 0.67)",
      "  _《标题A》_ (2026-08-13)",
      "  body A",
      "---",
      "- **知识星球 · 基础事实** (相似度 0.65)",
      "  _《标题B》_ (2026-08-14)",
      "  body B",
    ].join("\n")
    act(() => {
      root.render(<RagContextPanel ragContext={makeRag(md)} />)
    })
    const header = container.querySelector("[data-testid='rag-context-panel'] button")
    expect(header).not.toBeNull()
    act(() => {
      ;(header as HTMLButtonElement).click()
    })
    const cards = container.querySelectorAll("[data-testid='rag-source-card']")
    expect(cards).toHaveLength(2)
    expect(cards[0]?.textContent).toMatch(/知识星球/)
    expect(cards[0]?.textContent).toMatch(/标题A/)
    expect(cards[0]?.textContent).toMatch(/2026-08-13/)
  })

  it("renders the original markdown as fallback when parseSources returns []", () => {
    act(() => {
      root.render(
        <RagContextPanel ragContext={makeRag("not a parseable block")} />,
      )
    })
    act(() => {
      const btn = container.querySelector("button")
      if (btn) (btn as HTMLButtonElement).click()
    })
    expect(
      container.querySelector("[data-testid='rag-context-fallback']")?.textContent,
    ).toMatch(/not a parseable block/)
  })
})

// ─── corpus_sources 通路 (2026-08-30 后端归一事件) ────────────────────────

describe("RagContextPanel — corpus_sources path", () => {
  it("renders N source cards directly from sources array (no markdown parsing)", () => {
    const sources = [
      {
        tool: "prefetch" as const,
        source: "zsxq_posts",
        chunk_id: 101,
        view_type: "summary",
        title: "中芯国际2Q26业绩快评",
        publish_date: "2026-08-13",
        similarity: 0.82,
        content_text: "中芯国际2Q26业绩与产能双兑现",
      },
      {
        tool: "corpus_search_research" as const,
        source: "research_analysis",
        chunk_id: 102,
        view_type: "core_view",
        title: "中芯国际深度报告",
        publish_date: "2026-08-12",
        similarity: 0.78,
        content_text: "我们看好中芯国际的产能扩张",
      },
    ]
    act(() => {
      root.render(
        <RagContextPanel
          ragContext={{
            sources,
          }}
        />,
      )
    })
    const panel = container.querySelector("[data-testid='rag-context-panel']")
    expect(panel).not.toBeNull()
    expect(panel?.textContent).toMatch(/数据来源/)
    expect(panel?.textContent).toMatch(/2\s*条/)
  })

  it("expands to one card per CorpusSourceItem on click", () => {
    const sources = [
      {
        tool: "prefetch" as const,
        source: "zsxq_posts",
        chunk_id: 101,
        view_type: "summary",
        title: "中芯国际2Q26业绩快评",
        publish_date: "2026-08-13",
        similarity: 0.82,
        content_text: "中芯国际2Q26业绩与产能双兑现",
      },
    ]
    act(() => {
      root.render(
        <RagContextPanel ragContext={{ sources }} />,
      )
    })
    const header = container.querySelector(
      "[data-testid='rag-context-panel'] button",
    )
    expect(header).not.toBeNull()
    act(() => {
      ;(header as HTMLButtonElement).click()
    })
    const cards = container.querySelectorAll("[data-testid='rag-source-card']")
    expect(cards).toHaveLength(1)
    expect(cards[0]?.textContent).toMatch(/zsxq_posts/)
    expect(cards[0]?.textContent).toMatch(/summary/)
    expect(cards[0]?.textContent).toMatch(/中芯国际2Q26业绩快评/)
    expect(cards[0]?.textContent).toMatch(/2026-08-13/)
    expect(cards[0]?.textContent).toMatch(/相似度 0\.82/)
    expect(cards[0]?.textContent).toMatch(/中芯国际2Q26业绩与产能双兑现/)
  })

  it("renders nothing when both sources and markdown are empty", () => {
    act(() => {
      root.render(<RagContextPanel ragContext={{}} />)
    })
    expect(container.querySelector("[data-testid='rag-context-panel']")).toBeNull()
  })

  it("prefers sources over markdown when both are present", () => {
    // 来源多于 markdown 解析出的卡片 → 渲染 sources 数量,与 markdown 无关。
    const md = ["- **来源A · 视图A**", "  _标题A_ (2026-08-01)", "  body"].join("\n")
    const sources = [
      { tool: "prefetch" as const, source: "zsxq_posts", chunk_id: 1, view_type: "v1" },
      { tool: "prefetch" as const, source: "zsxq_posts", chunk_id: 2, view_type: "v2" },
      { tool: "prefetch" as const, source: "zsxq_posts", chunk_id: 3, view_type: "v3" },
    ]
    act(() => {
      root.render(
        <RagContextPanel ragContext={{ sources, markdown: md }} />,
      )
    })
    const panel = container.querySelector("[data-testid='rag-context-panel']")
    expect(panel?.textContent).toMatch(/3\s*条/)
  })
})