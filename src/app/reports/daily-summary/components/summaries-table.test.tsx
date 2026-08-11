import { describe, it, expect, vi, beforeEach } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"

vi.mock("@/services/daily-summary", () => ({
  listDailySummaries: vi.fn(),
}))
vi.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({ token: "tok-1" }),
}))
// Avoid rendering the real Sheet drawer in this test.
vi.mock("@/app/dashboard/components/report-drawer", () => ({
  ReportDrawer: ({ open }: { open: boolean }) =>
    open ? <div data-testid="report-drawer-stub" /> : null,
}))

import { listDailySummaries } from "@/services/daily-summary"
import { SummariesTable } from "./summaries-table"
import { useSummariesStore } from "../hooks/use-summaries-store"

const mockedList = vi.mocked(listDailySummaries)

beforeEach(() => {
  mockedList.mockReset()
  useSummariesStore.setState({
    items: [],
    pagination: { page: 0, pageSize: 10, total: 0 },
    frequency: undefined,
    dateRange: null,
    openReportId: null,
  })
})

const SAMPLE = [
  {
    reportId: "r-1",
    frequency: "daily" as const,
    reportDate: "2026-08-07",
    weekStart: null,
    isFinal: true,
    isLatest: true,
    revision: 1,
    dataWindowStart: "",
    dataWindowEnd: "",
    sections: {},
    sourcePostIds: [],
    sourceResearchIds: [],
    sourcePostCount: 4,
    sourceResearchCount: 2,
    completenessRatio: "0.92",
    hasDataWarning: false,
    triggerReason: "",
    buildPromptVersion: "",
    buildModel: "",
    hasTopics: false,
    topics: null,
    briefSummaryMd: null,
    generatedAt: "2026-08-07T03:04:05.000Z",
    lastDataCheckAt: "",
  },
]

describe("SummariesTable", () => {
  it("renders rows from listDailySummaries response", async () => {
    mockedList.mockResolvedValue({ data: SAMPLE, total: 1, page: 0, pageSize: 10 } as never)

    render(<SummariesTable />)

    await waitFor(() => {
      expect(screen.getByTestId("summaries-view-button").getAttribute("data-report-id")).toBe("r-1")
    })
    // The frequency column renders "日报" for daily rows. The Select trigger
    // displays the current selection ("全部" by default), so "日报" only
    // appears once — in the row's cell.
    expect(screen.getByText("日报")).toBeInTheDocument()
    expect(screen.getByText("4 帖 / 2 研报")).toBeInTheDocument()
  })

  it("renders the empty state when zero rows", async () => {
    mockedList.mockResolvedValue({ data: [], total: 0, page: 0, pageSize: 10 } as never)
    render(<SummariesTable />)
    await waitFor(() => {
      expect(screen.getByText("暂无数据")).toBeInTheDocument()
    })
  })

  it("triggers a fetch from page 0 when the 搜索 button is clicked", async () => {
    mockedList.mockResolvedValue({ data: SAMPLE, total: 1, page: 0, pageSize: 10 } as never)
    render(<SummariesTable />)

    await waitFor(() => expect(mockedList).toHaveBeenCalledTimes(1))

    // The filter form values (报告类型/报告日期) only mutate store state;
    // the page-level "搜索" button is the single trigger that calls
    // fetchSummaries({ page: 0 }) to apply the saved filters.
    const searchBtn = screen.getByRole("button", { name: "搜索" })
    fireEvent.click(searchBtn)

    await waitFor(() => {
      expect(mockedList).toHaveBeenLastCalledWith("tok-1", {
        page: 0,
        pageSize: 10,
      })
    })
    expect(mockedList).toHaveBeenCalledTimes(2)
  })

  it("resets filters and re-fetches when 重置 is clicked", async () => {
    mockedList.mockResolvedValue({ data: SAMPLE, total: 1, page: 0, pageSize: 10 } as never)
    render(<SummariesTable />)

    await waitFor(() => expect(mockedList).toHaveBeenCalledTimes(1))

    const resetBtn = screen.getByRole("button", { name: /重置/ })
    fireEvent.click(resetBtn)

    await waitFor(() => {
      expect(mockedList).toHaveBeenLastCalledWith("tok-1", {
        page: 0,
        pageSize: 10,
      })
    })
  })
})
