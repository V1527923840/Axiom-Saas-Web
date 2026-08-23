import { describe, expect, it, vi, beforeEach } from "vitest"
import { screen, waitFor } from "@testing-library/react"
import { renderWithQuery } from "@/test-utils"
import * as svc from "@/services/daily-summary"
import type { SourcesResponse } from "@/services/daily-summary"
import { SourcesDrawer } from "./sources-drawer"

vi.mock("@/services/daily-summary", () => ({
  getDailySummarySources: vi.fn(),
}))
vi.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({ token: "tok" }),
}))

const getDailySummarySources = vi.mocked(svc.getDailySummarySources)

const SAMPLE_SOURCES: SourcesResponse = {
  posts: [
    { id: "p1", title: "帖子一", categoryCode: "MACRO", publishDate: "2026-08-09T08:00:00.000Z" },
  ],
  research: [
    { id: "r1", title: "研报一", categoryCode: "RESEARCH", publishDate: "2026-08-08T08:00:00.000Z" },
  ],
  postsTotal: 1,
  researchTotal: 1,
  missingIds: [],
}

beforeEach(() => {
  getDailySummarySources.mockReset()
  // Default: pending forever so loading skeletons don't appear. Tests
  // that need a resolved value override per-test.
  getDailySummarySources.mockReturnValue(new Promise(() => {}))
})

describe("SourcesDrawer", () => {
  it("does not call getDailySummarySources when closed (no fetch)", () => {
    renderWithQuery(
      <SourcesDrawer reportId="r1" open={false} onOpenChange={() => {}} />,
    )
    expect(getDailySummarySources).not.toHaveBeenCalled()
  })

  it("passes reportId to getDailySummarySources when open", async () => {
    getDailySummarySources.mockResolvedValue({ data: SAMPLE_SOURCES } as any)
    renderWithQuery(
      <SourcesDrawer
        reportId="r1"
        open
        onOpenChange={() => {}}
        header={{ frequency: "daily", reportDate: "2026-08-11" }}
      />,
    )
    await waitFor(() =>
      expect(getDailySummarySources).toHaveBeenCalledWith(
        expect.anything(),
        "r1",
        expect.objectContaining({ limit: 20, offset: 0 }),
      ),
    )
  })

  it("uses '日报详情' header for daily reports", async () => {
    getDailySummarySources.mockResolvedValue({ data: SAMPLE_SOURCES } as any)
    renderWithQuery(
      <SourcesDrawer
        reportId="r1"
        open
        onOpenChange={() => {}}
        header={{ frequency: "daily", reportDate: "2026-08-11" }}
      />,
    )
    expect(screen.getByText("日报详情")).toBeInTheDocument()
    expect(screen.getByText("2026-08-11")).toBeInTheDocument()
  })

  it("uses '周报详情' header for weekly reports", async () => {
    getDailySummarySources.mockResolvedValue({ data: SAMPLE_SOURCES } as any)
    renderWithQuery(
      <SourcesDrawer
        reportId="r1"
        open
        onOpenChange={() => {}}
        header={{ frequency: "weekly", reportDate: "2026-08-11" }}
      />,
    )
    expect(screen.getByText("周报详情")).toBeInTheDocument()
    expect(screen.getByText("2026-08-11")).toBeInTheDocument()
  })

  it("falls back to a generic header when no header metadata is provided", () => {
    renderWithQuery(<SourcesDrawer reportId="r1" open onOpenChange={() => {}} />)
    expect(screen.getByText("来源详情")).toBeInTheDocument()
    expect(screen.getByText("加载中…")).toBeInTheDocument()
  })

  it("renders SourcesTab with the loaded sources — only posts tab visible by default", async () => {
    getDailySummarySources.mockResolvedValue({ data: SAMPLE_SOURCES } as any)
    renderWithQuery(
      <SourcesDrawer
        reportId="r1"
        open
        onOpenChange={() => {}}
        header={{ frequency: "daily", reportDate: "2026-08-11" }}
      />,
    )
    // Inner SourcesTab exposes 帖文 / 研报 tab triggers with counts.
    expect(await screen.findByRole("tab", { name: /帖文 \(1\)/ })).toBeInTheDocument()
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
    getDailySummarySources.mockReturnValue(new Promise(() => {}))
    const { rerender } = renderWithQuery(
      <SourcesDrawer reportId="r1" open onOpenChange={() => {}} />,
    )
    rerender(<SourcesDrawer reportId="r2" open onOpenChange={() => {}} />)
    expect(screen.queryByRole("tab", { name: "报告" })).not.toBeInTheDocument()
    expect(screen.queryByRole("tab", { name: "来源" })).not.toBeInTheDocument()
  })
})