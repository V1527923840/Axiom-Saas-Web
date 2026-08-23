import { describe, expect, it, vi, beforeEach } from "vitest"
import { fireEvent, screen, waitFor } from "@testing-library/react"
import { renderWithQuery } from "@/test-utils"
import { ReportDrawer } from "./index"
import * as hooks from "./hooks/use-daily-summary"
import * as svc from "@/services/daily-summary"
import type { DailySummary } from "@/services/daily-summary"

vi.mock("./hooks/use-daily-summary", () => ({
  useReportDetail: vi.fn(),
}))
vi.mock("@/services/daily-summary", () => ({
  getDailySummarySources: vi.fn(),
}))
vi.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({ token: "tok" }),
}))

const useReportDetail = vi.mocked(hooks.useReportDetail)
const getDailySummarySources = vi.mocked(svc.getDailySummarySources)

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
  getDailySummarySources.mockReset()
  useReportDetail.mockReturnValue({ report: null, loading: true, error: null })
  // Default: pending forever so loading skeletons don't appear. Tests
  // that need a resolved value override per-test.
  getDailySummarySources.mockReturnValue(new Promise(() => {}))
})

describe("ReportDrawer", () => {
  it("renders Sheet with both tabs", () => {
    renderWithQuery(<ReportDrawer reportId="r1" open onOpenChange={() => {}} />)
    expect(screen.getByRole("tab", { name: "报告" })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "来源" })).toBeInTheDocument()
  })

  it("passes null to useReportDetail when open is false", () => {
    useReportDetail.mockReturnValue({ report: null, loading: false, error: null })
    renderWithQuery(<ReportDrawer reportId="r1" open={false} onOpenChange={() => {}} />)
    expect(useReportDetail).toHaveBeenCalledWith(null)
    expect(getDailySummarySources).not.toHaveBeenCalled()
  })

  it("passes reportId to useReportDetail when open", () => {
    renderWithQuery(<ReportDrawer reportId="r1" open onOpenChange={() => {}} />)
    expect(useReportDetail).toHaveBeenCalledWith("r1")
  })

  it("shows the report title and date once loaded", () => {
    useReportDetail.mockReturnValue({ report: makeReport(), loading: false, error: null })
    renderWithQuery(<ReportDrawer reportId="r1" open onOpenChange={() => {}} />)
    expect(screen.getByText("日报详情")).toBeInTheDocument()
    expect(screen.getByText("2026-08-10")).toBeInTheDocument()
    expect(screen.getByText("宏观海外")).toBeInTheDocument()
  })

  it("titles a weekly report as 周报详情", () => {
    useReportDetail.mockReturnValue({
      report: makeReport({ frequency: "weekly", sections: { weekly_events: [] } }),
      loading: false,
      error: null,
    })
    renderWithQuery(<ReportDrawer reportId="r1" open onOpenChange={() => {}} />)
    expect(screen.getByText("周报详情")).toBeInTheDocument()
  })

  it("opens on the sources tab when initialTab is 'sources'", async () => {
    useReportDetail.mockReturnValue({ report: makeReport(), loading: false, error: null })
    getDailySummarySources.mockResolvedValue({
      data: {
        posts: [
          { id: "p1", title: "帖子一", categoryCode: "MACRO", publishDate: "2026-08-09T08:00:00.000Z" },
        ],
        research: [],
        postsTotal: 1,
        researchTotal: 0,
        missingIds: [],
      },
    } as any)
    renderWithQuery(
      <ReportDrawer reportId="r1" open onOpenChange={() => {}} initialTab="sources" />,
    )
    expect(screen.getByRole("tab", { name: "来源" })).toHaveAttribute(
      "aria-selected",
      "true",
    )
    await waitFor(() =>
      expect(getDailySummarySources).toHaveBeenCalledWith(
        expect.anything(),
        "r1",
        expect.objectContaining({ limit: 20, offset: 0 }),
      ),
    )
    expect(await screen.findByText("帖子一")).toBeInTheDocument()
  })

  it("switches to the sources tab on click", async () => {
    useReportDetail.mockReturnValue({ report: makeReport(), loading: false, error: null })
    getDailySummarySources.mockResolvedValue({
      data: {
        posts: [{ id: "p1", title: "post-a", categoryCode: "X", publishDate: "" }],
        research: [{ id: "1", title: "research-a", categoryCode: "R", publishDate: "" }],
        postsTotal: 1,
        researchTotal: 1,
        missingIds: [],
      },
    } as any)
    renderWithQuery(<ReportDrawer reportId="r1" open onOpenChange={() => {}} />)
    clickTab("来源")
    // SourcesTab exposes 中文 tab triggers with counts.
    expect(await screen.findByRole("tab", { name: /帖文 \(1\)/ })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: /研报 \(1\)/ })).toBeInTheDocument()
  })

  it("re-seeds the tab to initialTab when reopened for another report", async () => {
    useReportDetail.mockReturnValue({ report: makeReport(), loading: false, error: null })
    getDailySummarySources.mockResolvedValue({
      data: {
        posts: [{ id: "p1", title: "post-a", categoryCode: "X", publishDate: "" }],
        research: [{ id: "1", title: "research-a", categoryCode: "R", publishDate: "" }],
        postsTotal: 1,
        researchTotal: 1,
        missingIds: [],
      },
    } as any)
    const { rerender } = renderWithQuery(
      <ReportDrawer reportId="r1" open onOpenChange={() => {}} />,
    )
    clickTab("来源")
    await waitFor(() =>
      expect(getDailySummarySources).toHaveBeenCalled(),
    )
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
    renderWithQuery(<ReportDrawer reportId="r1" open onOpenChange={() => {}} />)
    expect(screen.getByText("加载失败")).toBeInTheDocument()
    expect(screen.getByText("boom")).toBeInTheDocument()
  })
})