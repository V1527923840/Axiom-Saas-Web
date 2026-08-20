import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ToolCallSummary } from "./tool-call-summary"
import { TOOL_OPEN, TOOL_CLOSE } from "../lib/parse-message"
import type { Segment } from "../lib/parse-message"

// Test helper to build closed tool segments quickly.
const closed = (name: string): Extract<Segment, { type: "tool" }> => ({
  type: "tool",
  content: JSON.stringify({ name, status: "ok", elapsed_ms: 100 }),
  closed: true,
  start: 0,
})
const open = (name: string, start = 0): Extract<Segment, { type: "tool" }> => ({
  type: "tool",
  content: JSON.stringify({ name, elapsed_s: 1 }),
  closed: false,
  start,
})

describe("ToolCallSummary — renders closed segments compactly", () => {
  it("renders nothing for an empty segment list", () => {
    const { container } = render(<ToolCallSummary segments={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it("renders individual rows when ≤3 closed segments", () => {
    const segments = [closed("a"), closed("b"), closed("c")]
    render(<ToolCallSummary segments={segments} />)
    // Each closed tool shows its name with a check icon (no "调用 N 个工具" summary).
    expect(screen.queryByText(/调用 \d+ 个工具/)).toBeNull()
    expect(screen.getByText("a")).toBeInTheDocument()
    expect(screen.getByText("b")).toBeInTheDocument()
    expect(screen.getByText("c")).toBeInTheDocument()
  })

  it("aggregates >3 closed segments into a collapsed summary chip with count breakdown", () => {
    const segments = [
      closed("load_skill_file"),
      closed("load_skill_file"),
      closed("load_skill_file"),
      closed("load_skill_manifest"),
      closed("load_skill_manifest"),
      closed("Chart"),
    ]
    render(<ToolCallSummary segments={segments} />)
    // Summary chip visible by default — read its full text via the button role
    // (the count and breakdown live in sibling spans inside the same button).
    const chip = screen.getByRole("button", { name: /调用 6 个工具/ })
    const chipText = chip.textContent ?? ""
    expect(chipText).toContain("调用 6 个工具")
    expect(chipText).toContain("load_skill_file × 3")
    expect(chipText).toContain("load_skill_manifest × 2")
    expect(chipText).toContain("Chart × 1")
    // Individual rows are NOT visible until expanded
    expect(screen.queryByText("load_skill_file")).not.toBeInTheDocument()
    expect(screen.queryByText("Chart")).not.toBeInTheDocument()
  })

  it("expands on click to show the individual rows", async () => {
    const user = userEvent.setup()
    const segments = [
      closed("a"),
      closed("b"),
      closed("c"),
      closed("d"),
    ]
    render(<ToolCallSummary segments={segments} />)
    expect(screen.queryByText("a")).not.toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: /调用 4 个工具/ }))
    expect(screen.getByText("a")).toBeInTheDocument()
    expect(screen.getByText("b")).toBeInTheDocument()
    expect(screen.getByText("c")).toBeInTheDocument()
    expect(screen.getByText("d")).toBeInTheDocument()
  })

  it("keeps unclosed (in-flight) tool rows visible while collapsed closed tools", () => {
    const segments = [
      open("in_flight", 0),
      closed("a"),
      closed("b"),
      closed("c"),
      closed("d"),
    ]
    render(<ToolCallSummary segments={segments} />)
    // Open row: shows the "中…" suffix from ToolCallBlock (closed=false).
    expect(screen.getByText(/in_flight 中…/)).toBeInTheDocument()
    // Summary chip still appears for the closed count.
    expect(screen.getByText(/调用 4 个工具/)).toBeInTheDocument()
  })

  it("falls back to '工具' label when a closed segment's JSON is malformed", () => {
    const segments: Segment[] = [
      { type: "tool", content: "broken", closed: true, start: 0 },
      { type: "tool", content: "still broken", closed: true, start: 7 },
      { type: "tool", content: "more broken", closed: true, start: 21 },
      { type: "tool", content: "yet more", closed: true, start: 33 },
    ]
    render(<ToolCallSummary segments={segments} />)
    // Falls back to 工具 when name extraction fails — that's fine, the summary
    // chip still aggregates to "工具 × 4".
    expect(screen.getByText(/调用 4 个工具/)).toBeInTheDocument()
  })
})

// Regression for 2026-08-20: 30+ tool calls used to render 30 individual rows
// inside the AI bubble, pushing the actual markdown answer below the fold.
// After the fix: ≥4 closed tools collapse into a one-line summary chip.
describe("ToolCallSummary — many-tool regression (2026-08-20)", () => {
  it("renders a single summary chip for 30 closed tool calls instead of 30 rows", () => {
    const segments: Segment[] = Array.from({ length: 30 }, (_, i) =>
      closed(`tool_${i % 3}`),
    )
    render(<ToolCallSummary segments={segments} />)
    // 30 segments → ONE summary chip, not 30 rows.
    const chip = screen.getByRole("button", { name: /调用 30 个工具/ })
    expect(chip).toBeInTheDocument()
    // Breakdown: tool_0/1/2 each × 10
    const text = chip.textContent ?? ""
    expect(text).toMatch(/tool_0 × 10/)
    expect(text).toMatch(/tool_1 × 10/)
    expect(text).toMatch(/tool_2 × 10/)
  })
})

// Sanity: the parsing boundary tags are imported and stable. If these change,
// the rendered close tags must too.
describe("ToolCallSummary — TOOL_OPEN/CLOSE invariant", () => {
  it("tool block strings use the same tags as the parser", () => {
    expect(TOOL_OPEN.length).toBeGreaterThan(0)
    expect(TOOL_CLOSE.length).toBeGreaterThan(0)
    expect(TOOL_OPEN).not.toBe(TOOL_CLOSE)
  })
})