import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { ReportTab } from "./report-tab"
import type { DailySummary } from "@/services/daily-summary"

function makeReport(over: Partial<DailySummary> = {}): DailySummary {
  return {
    reportId: "r1",
    frequency: "daily",
    reportDate: "2026-08-10",
    weekStart: null,
    dataWindowStart: "2026-08-09",
    dataWindowEnd: "2026-08-10",
    sections: [
      { section_key: "macro", section_title: "宏观海外", section_content: "海外宏观…" },
    ],
    sourcePostIds: [],
    sourceResearchIds: [],
    sourcePostCount: 0,
    sourceResearchCount: 0,
    completenessRatio: "1.00",
    hasDataWarning: false,
    triggerReason: "scheduled",
    buildPromptVersion: "v1",
    buildModel: "test-model",
    hasTopics: false,
    topics: null,
    briefSummaryMd: null,
    generatedAt: "2026-08-10T00:00:00.000Z",
    lastDataCheckAt: "2026-08-10T00:00:00.000Z",
    ...over,
  }
}

describe("ReportTab", () => {
  it("renders daily sections via SectionsDaily", () => {
    render(<ReportTab report={makeReport()} loading={false} error={null} />)
    expect(screen.getByText("宏观海外")).toBeInTheDocument()
    expect(screen.getByText("海外宏观…")).toBeInTheDocument()
  })

  it("renders weekly events via SectionsWeekly", () => {
    const report = makeReport({
      frequency: "weekly",
      sections: { weekly_events: [{ title: "周度事件", summary: "事件摘要" }] },
    })
    render(<ReportTab report={report} loading={false} error={null} />)
    expect(screen.getByText("周度事件")).toBeInTheDocument()
  })

  it("renders briefSummaryMd and topic badges", () => {
    const report = makeReport({
      briefSummaryMd: "今日要点摘要",
      hasTopics: true,
      topics: ["降息", { name: "AI 算力" }],
    })
    render(<ReportTab report={report} loading={false} error={null} />)
    expect(screen.getByText("今日要点摘要")).toBeInTheDocument()
    expect(screen.getByText("降息")).toBeInTheDocument()
    expect(screen.getByText("AI 算力")).toBeInTheDocument()
  })

  it("skips topics when hasTopics is false", () => {
    const report = makeReport({ hasTopics: false, topics: ["不该显示"] })
    render(<ReportTab report={report} loading={false} error={null} />)
    expect(screen.queryByText("不该显示")).not.toBeInTheDocument()
  })

  it("renders an error alert", () => {
    render(<ReportTab report={null} loading={false} error={new Error("坏了")} />)
    expect(screen.getByText("加载失败")).toBeInTheDocument()
    expect(screen.getByText("坏了")).toBeInTheDocument()
  })

  it("renders 无数据 when report is null and not loading", () => {
    render(<ReportTab report={null} loading={false} error={null} />)
    expect(screen.getByText("无数据")).toBeInTheDocument()
  })
})
