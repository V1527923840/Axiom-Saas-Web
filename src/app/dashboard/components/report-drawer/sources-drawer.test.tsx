import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import * as hooks from "@/hooks/use-daily-summary"
import type { SourcesResponse } from "@/services/daily-summary"
import { SourcesDrawer } from "./sources-drawer"

vi.mock("@/hooks/use-daily-summary", () => ({
  useReportSources: vi.fn(),
}))

const useReportSources = vi.mocked(hooks.useReportSources)

const SAMPLE_SOURCES: SourcesResponse = {
  posts: [
    { id: "p1", title: "帖子一", categoryCode: "MACRO", publishDate: "2026-08-09T08:00:00.000Z" },
  ],
  research: [
    { id: "r1", title: "研报一", categoryCode: "RESEARCH", publishDate: "2026-08-08T08:00:00.000Z" },
  ],
}

beforeEach(() => {
  useReportSources.mockReset()
  useReportSources.mockReturnValue({ sources: null, loading: false, error: null })
})

describe("SourcesDrawer", () => {
  it("passes null to useReportSources when closed (no fetch)", () => {
    render(
      <SourcesDrawer reportId="r1" open={false} onOpenChange={() => {}} />,
    )
    expect(useReportSources).toHaveBeenCalledWith(null)
  })

  it("passes reportId to useReportSources when open", () => {
    useReportSources.mockReturnValue({ sources: SAMPLE_SOURCES, loading: false, error: null })
    render(
      <SourcesDrawer
        reportId="r1"
        open
        onOpenChange={() => {}}
        header={{ frequency: "daily", reportDate: "2026-08-11", revision: 2 }}
      />,
    )
    expect(useReportSources).toHaveBeenCalledWith("r1")
  })

  it("uses '日报详情' header for daily reports", () => {
    useReportSources.mockReturnValue({ sources: SAMPLE_SOURCES, loading: false, error: null })
    render(
      <SourcesDrawer
        reportId="r1"
        open
        onOpenChange={() => {}}
        header={{ frequency: "daily", reportDate: "2026-08-11", revision: 2 }}
      />,
    )
    expect(screen.getByText("日报详情")).toBeInTheDocument()
    expect(screen.getByText("2026-08-11 · Rev 2")).toBeInTheDocument()
  })

  it("uses '周报详情' header for weekly reports", () => {
    useReportSources.mockReturnValue({ sources: SAMPLE_SOURCES, loading: false, error: null })
    render(
      <SourcesDrawer
        reportId="r1"
        open
        onOpenChange={() => {}}
        header={{ frequency: "weekly", reportDate: "2026-08-11", revision: 1 }}
      />,
    )
    expect(screen.getByText("周报详情")).toBeInTheDocument()
    expect(screen.getByText("2026-08-11 · Rev 1")).toBeInTheDocument()
  })

  it("falls back to a generic header when no header metadata is provided", () => {
    useReportSources.mockReturnValue({ sources: null, loading: true, error: null })
    render(<SourcesDrawer reportId="r1" open onOpenChange={() => {}} />)
    expect(screen.getByText("来源详情")).toBeInTheDocument()
    expect(screen.getByText("加载中…")).toBeInTheDocument()
  })

  it("renders SourcesTab with the loaded sources — only posts tab visible by default", () => {
    useReportSources.mockReturnValue({ sources: SAMPLE_SOURCES, loading: false, error: null })
    render(
      <SourcesDrawer
        reportId="r1"
        open
        onOpenChange={() => {}}
        header={{ frequency: "daily", reportDate: "2026-08-11", revision: 2 }}
      />,
    )
    // Inner SourcesTab exposes 帖文 / 研报 tab triggers with counts.
    expect(screen.getByRole("tab", { name: /帖文 \(1\)/ })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: /研报 \(1\)/ })).toBeInTheDocument()
    // posts tab is the default panel — row title visible.
    expect(screen.getByText("帖子一")).toBeInTheDocument()
    // research tab content is hidden until clicked.
    expect(screen.queryByText("研报一")).not.toBeInTheDocument()

    // The drawer itself has NO 报告/来源 tab (those live on ReportDrawer, used by SummariesTable).
    expect(screen.queryByRole("tab", { name: "报告" })).not.toBeInTheDocument()
    expect(screen.queryByRole("tab", { name: "来源" })).not.toBeInTheDocument()
  })

  it("does not surface the ReportDrawer-level 报告/来源 tabs regardless of reportId", () => {
    useReportSources.mockReturnValue({ sources: null, loading: false, error: null })
    const { rerender } = render(
      <SourcesDrawer reportId="r1" open onOpenChange={() => {}} />,
    )
    rerender(<SourcesDrawer reportId="r2" open onOpenChange={() => {}} />)
    expect(screen.queryByRole("tab", { name: "报告" })).not.toBeInTheDocument()
    expect(screen.queryByRole("tab", { name: "来源" })).not.toBeInTheDocument()
  })
})
