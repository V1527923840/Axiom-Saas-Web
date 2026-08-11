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

const mockedList = vi.mocked(listDailySummaries)

beforeEach(() => {
  mockedList.mockReset()
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
    expect(screen.getByText("Rev 1")).toBeInTheDocument()
    expect(screen.getByText("终版")).toBeInTheDocument()
    expect(screen.getByText("0.92")).toBeInTheDocument()
    expect(screen.getByText("4 帖 / 2 研报")).toBeInTheDocument()
  })

  it("renders the empty state when zero rows", async () => {
    mockedList.mockResolvedValue({ data: [], total: 0, page: 0, pageSize: 10 } as never)
    render(<SummariesTable />)
    await waitFor(() => {
      expect(screen.getByText("暂无数据")).toBeInTheDocument()
    })
  })

  it("passes reportDate filter when the date input changes", async () => {
    mockedList.mockResolvedValue({ data: SAMPLE, total: 1, page: 0, pageSize: 10 } as never)
    render(<SummariesTable />)

    await waitFor(() => expect(mockedList).toHaveBeenCalledTimes(1))

    // jsdom does not implement a real <input type="date"> parser, so use
    // fireEvent.change to set the value directly — this exercises the same
    // onChange handler user keystrokes would invoke.
    const dateInput = screen.getByLabelText("报告日期") as HTMLInputElement
    fireEvent.change(dateInput, { target: { value: "2026-08-07" } })

    await waitFor(() => {
      expect(mockedList).toHaveBeenLastCalledWith("tok-1", {
        reportDate: "2026-08-07",
        page: 0,
        pageSize: 10,
      })
    })
  })
})
