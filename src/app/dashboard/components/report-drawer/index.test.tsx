import { describe, expect, it, vi, beforeEach } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { ReportDrawer } from "./index"
import * as hooks from "@/hooks/use-daily-summary"
import type { DailySummary } from "@/services/daily-summary"

vi.mock("@/hooks/use-daily-summary", () => ({
  useReportDetail: vi.fn(),
  useReportSources: vi.fn(),
}))

const useReportDetail = vi.mocked(hooks.useReportDetail)
const useReportSources = vi.mocked(hooks.useReportSources)

// Radix TabsTrigger selects on `mousedown`, not `click`, so fireEvent.click
// alone leaves the tab unchanged.
function clickTab(name: string) {
  const tab = screen.getByRole("tab", { name })
  fireEvent.mouseDown(tab)
  fireEvent.click(tab)
}

function makeReport(over: Partial<DailySummary> = {}): DailySummary {
  return {
    reportId: "r1",
    frequency: "daily",
    reportDate: "2026-08-10",
    weekStart: null,
    isFinal: true,
    isLatest: true,
    revision: 2,
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

beforeEach(() => {
  useReportDetail.mockReset()
  useReportSources.mockReset()
  useReportDetail.mockReturnValue({ report: null, loading: true, error: null })
  useReportSources.mockReturnValue({ sources: null, loading: false, error: null })
})

describe("ReportDrawer", () => {
  it("renders Sheet with both tabs", () => {
    render(<ReportDrawer reportId="r1" open onOpenChange={() => {}} />)
    expect(screen.getByRole("tab", { name: "报告" })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "来源" })).toBeInTheDocument()
  })

  it("passes null to both hooks when open is false", () => {
    useReportDetail.mockReturnValue({ report: null, loading: false, error: null })
    render(<ReportDrawer reportId="r1" open={false} onOpenChange={() => {}} />)
    expect(useReportDetail).toHaveBeenCalledWith(null)
    expect(useReportSources).toHaveBeenCalledWith(null)
  })

  it("passes reportId to both hooks when open", () => {
    render(<ReportDrawer reportId="r1" open onOpenChange={() => {}} />)
    expect(useReportDetail).toHaveBeenCalledWith("r1")
    expect(useReportSources).toHaveBeenCalledWith("r1")
  })

  it("shows the report title and revision once loaded", () => {
    useReportDetail.mockReturnValue({ report: makeReport(), loading: false, error: null })
    render(<ReportDrawer reportId="r1" open onOpenChange={() => {}} />)
    expect(screen.getByText("日报详情")).toBeInTheDocument()
    expect(screen.getByText("2026-08-10 · Rev 2")).toBeInTheDocument()
    expect(screen.getByText("宏观海外")).toBeInTheDocument()
  })

  it("titles a weekly report as 周报详情", () => {
    useReportDetail.mockReturnValue({
      report: makeReport({ frequency: "weekly", sections: { weekly_events: [] } }),
      loading: false,
      error: null,
    })
    render(<ReportDrawer reportId="r1" open onOpenChange={() => {}} />)
    expect(screen.getByText("周报详情")).toBeInTheDocument()
  })

  it("opens on the sources tab when initialTab is 'sources'", () => {
    useReportDetail.mockReturnValue({ report: makeReport(), loading: false, error: null })
    useReportSources.mockReturnValue({
      sources: {
        posts: [
          { id: "p1", title: "帖子一", categoryCode: "MACRO", publishDate: "2026-08-09T08:00:00.000Z" },
        ],
        research: [],
      },
      loading: false,
      error: null,
    })
    render(
      <ReportDrawer reportId="r1" open onOpenChange={() => {}} initialTab="sources" />,
    )
    expect(screen.getByRole("tab", { name: "来源" })).toHaveAttribute(
      "aria-selected",
      "true",
    )
    expect(screen.getByText("帖子一")).toBeInTheDocument()
  })

  it("switches to the sources tab on click", () => {
    useReportDetail.mockReturnValue({ report: makeReport(), loading: false, error: null })
    useReportSources.mockReturnValue({
      sources: { posts: [], research: [] },
      loading: false,
      error: null,
    })
    render(<ReportDrawer reportId="r1" open onOpenChange={() => {}} />)
    clickTab("来源")
    expect(screen.getByText("Posts (0)")).toBeInTheDocument()
  })

  it("re-seeds the tab to initialTab when reopened for another report", () => {
    useReportDetail.mockReturnValue({ report: makeReport(), loading: false, error: null })
    useReportSources.mockReturnValue({
      sources: { posts: [], research: [] },
      loading: false,
      error: null,
    })
    const { rerender } = render(
      <ReportDrawer reportId="r1" open onOpenChange={() => {}} />,
    )
    clickTab("来源")
    expect(screen.getByRole("tab", { name: "来源" })).toHaveAttribute("aria-selected", "true")

    rerender(<ReportDrawer reportId="r1" open={false} onOpenChange={() => {}} />)
    rerender(<ReportDrawer reportId="r2" open onOpenChange={() => {}} />)
    expect(screen.getByRole("tab", { name: "报告" })).toHaveAttribute("aria-selected", "true")
  })

  it("surfaces a detail load error in the report tab", () => {
    useReportDetail.mockReturnValue({
      report: null,
      loading: false,
      error: new Error("boom"),
    })
    render(<ReportDrawer reportId="r1" open onOpenChange={() => {}} />)
    expect(screen.getByText("加载失败")).toBeInTheDocument()
    expect(screen.getByText("boom")).toBeInTheDocument()
  })
})
