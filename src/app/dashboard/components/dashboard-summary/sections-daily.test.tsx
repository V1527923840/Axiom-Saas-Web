import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { SectionsDaily } from "./sections-daily"

describe("SectionsDaily", () => {
  it("renders all 4 sections by section_title", () => {
    const sections = [
      { section_key: "macro_overseas", section_title: "宏观海外", section_content: "海外宏观…" },
      { section_key: "industry", section_title: "A 股行业聚焦", section_content: "行业…", key_points: ["点 1", "点 2"] },
      { section_key: "stock", section_title: "股票", section_content: "股票…" },
      { section_key: "risk", section_title: "风险", section_content: "风险…" },
    ]
    render(<SectionsDaily sections={sections as never} />)
    expect(screen.getByText("宏观海外")).toBeInTheDocument()
    expect(screen.getByText("A 股行业聚焦")).toBeInTheDocument()
    expect(screen.getByText("股票")).toBeInTheDocument()
    expect(screen.getByText("风险")).toBeInTheDocument()
    expect(screen.getByText("点 1")).toBeInTheDocument()
  })

  it("shows a fallback Alert when shape is wrong", () => {
    render(<SectionsDaily sections={"not-an-array" as never} />)
    // New copy hides the raw JSON dump behind import.meta.env.DEV, but
    // vitest runs with DEV=true so the <pre> still renders in tests.
    expect(screen.getByText(/报告内容格式异常/)).toBeInTheDocument()
    // The raw JSON dump should still be present under DEV gate.
    expect(screen.getByText(/"not-an-array"/)).toBeInTheDocument()
  })
})
