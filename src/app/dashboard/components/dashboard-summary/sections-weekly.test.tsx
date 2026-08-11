import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { SectionsWeekly } from "./sections-weekly"

describe("SectionsWeekly", () => {
  it("renders weekly_events with category, impact_level, and frequency chips", () => {
    const sections = {
      weekly_events: [
        { title: "事件 1", summary: "…", category: "industry", impact_level: "high", frequency_in_daily: 5 },
        { title: "事件 2", summary: "…", category: "finance", impact_level: "low" },
      ],
    }
    render(<SectionsWeekly sections={sections as never} />)
    expect(screen.getByText("事件 1")).toBeInTheDocument()
    expect(screen.getByText("事件 2")).toBeInTheDocument()
    expect(screen.getByText("high")).toBeInTheDocument()
    expect(screen.getByText("出现 5 次")).toBeInTheDocument()
  })

  it("shows a fallback Alert when shape is wrong", () => {
    render(<SectionsWeekly sections={{ foo: 1 } as never} />)
    expect(screen.getByText(/raw/i)).toBeInTheDocument()
  })
})
