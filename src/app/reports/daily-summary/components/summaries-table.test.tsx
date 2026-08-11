import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { SummariesTable } from "./summaries-table"
import * as hooks from "@/hooks/use-daily-summary"
import type { DailySummary } from "@/services/daily-summary"

// ReportDrawer is mounted alongside the table and pulls useReportDetail /
// useReportSources from the same module — stub them so drawer fetching doesn't
// leak into these tests.
vi.mock("@/hooks/use-daily-summary", () => ({
  useReportHistory: vi.fn(),
  useReportDetail: vi.fn(() => ({ report: null, loading: false, error: null })),
  useReportSources: vi.fn(() => ({ sources: null, loading: false, error: null })),
}))

function makeRow(overrides: Partial<DailySummary> = {}): DailySummary {
  return {
    reportId: "r1",
    frequency: "daily",
    reportDate: "2026-08-11",
    weekStart: null,
    isFinal: true,
    isLatest: true,
    revision: 2,
    dataWindowStart: "2026-08-10",
    dataWindowEnd: "2026-08-11",
    sections: [],
    sourcePostIds: [],
    sourceResearchIds: [],
    sourcePostCount: 12,
    sourceResearchCount: 4,
    completenessRatio: "0.93",
    hasDataWarning: false,
    triggerReason: "scheduled",
    buildPromptVersion: "v1",
    buildModel: "test",
    hasTopics: false,
    topics: null,
    briefSummaryMd: null,
    generatedAt: "2026-08-11T03:04:05.000Z",
    lastDataCheckAt: "2026-08-11T03:04:05.000Z",
    ...overrides,
  }
}

function mockHistory(
  over: Partial<ReturnType<typeof hooks.useReportHistory>> = {},
) {
  vi.mocked(hooks.useReportHistory).mockReturnValue({
    items: [],
    total: 0,
    page: 0,
    pageSize: 20,
    loading: false,
    error: null,
    refresh: () => {},
    ...over,
  })
}

function lastCall() {
  const spy = vi.mocked(hooks.useReportHistory)
  return spy.mock.calls[spy.mock.calls.length - 1][0]
}

describe("SummariesTable", () => {
  beforeEach(() => {
    vi.mocked(hooks.useReportHistory).mockReset()
  })

  it("shows loading skeleton", () => {
    mockHistory({ loading: true })
    render(<SummariesTable />)
    expect(document.querySelector('[data-slot="skeleton"]')).toBeTruthy()
  })

  it("shows empty state when no data", () => {
    mockHistory()
    render(<SummariesTable />)
    expect(screen.getByText("暂无历史记录")).toBeInTheDocument()
  })

  it("shows error alert on error", () => {
    mockHistory({ error: new Error("boom") })
    render(<SummariesTable />)
    expect(screen.getByText("加载失败")).toBeInTheDocument()
    expect(screen.getByText("boom")).toBeInTheDocument()
  })

  it("requests page 0 with pageSize 20 and no frequency by default", () => {
    mockHistory()
    render(<SummariesTable />)
    expect(lastCall()).toEqual({ frequency: undefined, page: 0, pageSize: 20 })
  })

  it("renders a row per item", () => {
    mockHistory({
      items: [
        makeRow(),
        makeRow({
          reportId: "r2",
          frequency: "weekly",
          reportDate: "2026-08-09",
          isFinal: false,
          hasDataWarning: true,
          completenessRatio: "0.5",
          sourcePostCount: 3,
          sourceResearchCount: 1,
        }),
      ],
      total: 2,
    })
    render(<SummariesTable />)

    expect(screen.getAllByTestId("row-trigger")).toHaveLength(2)
    expect(screen.getByText("2026-08-11")).toBeInTheDocument()
    expect(screen.getByText("日报")).toBeInTheDocument()
    expect(screen.getByText("周报")).toBeInTheDocument()
    expect(screen.getByText("终版")).toBeInTheDocument()
    expect(screen.getByText("临时")).toBeInTheDocument()
    // completenessRatio arrives as a decimal string and is normalised to 2 dp.
    expect(screen.getByText(/0\.93/)).toBeInTheDocument()
    expect(screen.getByText(/0\.50/)).toBeInTheDocument()
    expect(screen.getByText("12 帖 / 4 研报")).toBeInTheDocument()
    expect(screen.getAllByText("2026-08-11 03:04")).toHaveLength(2)
  })

  it("opens the report drawer when a row is clicked", () => {
    mockHistory({ items: [makeRow()], total: 1 })
    render(<SummariesTable />)

    expect(vi.mocked(hooks.useReportDetail).mock.calls.at(-1)?.[0]).toBe(null)
    fireEvent.click(screen.getAllByTestId("row-trigger")[0])
    expect(vi.mocked(hooks.useReportDetail).mock.calls.at(-1)?.[0]).toBe("r1")
  })

  it("pages forward and back", () => {
    mockHistory({ items: [makeRow()], total: 45 })
    render(<SummariesTable />)

    expect(screen.getByText("上一页")).toBeDisabled()
    fireEvent.click(screen.getByText("下一页"))
    expect(lastCall().page).toBe(1)
    fireEvent.click(screen.getByText("上一页"))
    expect(lastCall().page).toBe(0)
  })

  it("disables 下一页 on the last page", () => {
    mockHistory({ items: [makeRow()], total: 45 })
    render(<SummariesTable />)

    fireEvent.click(screen.getByText("下一页"))
    fireEvent.click(screen.getByText("下一页"))
    expect(lastCall().page).toBe(2) // ceil(45 / 20) === 3 pages
    expect(screen.getByText("下一页")).toBeDisabled()
  })

  it("resets page to 0 when the frequency filter changes", () => {
    mockHistory({ items: [makeRow()], total: 45 })
    render(<SummariesTable />)

    fireEvent.click(screen.getByText("下一页"))
    expect(lastCall().page).toBe(1)

    fireEvent.click(screen.getByText("Daily"))
    expect(lastCall()).toEqual({ frequency: "daily", page: 0, pageSize: 20 })
  })

  it("clears the frequency filter when All is selected", () => {
    mockHistory()
    render(<SummariesTable />)

    fireEvent.click(screen.getByText("Weekly"))
    expect(lastCall().frequency).toBe("weekly")
    fireEvent.click(screen.getByText("All"))
    expect(lastCall().frequency).toBeUndefined()
  })
})
