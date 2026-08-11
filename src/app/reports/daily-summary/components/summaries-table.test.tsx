import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

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
    // The toggle filter button "日报" comes first in the DOM; we want the
    // row's frequency cell, which is the second match.
    const dailyCells = screen.getAllByText("日报")
    expect(dailyCells.length).toBeGreaterThanOrEqual(2)
    expect(dailyCells[1]).toBeInTheDocument()
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

  it("calls listDailySummaries with frequency when toggle group changes", async () => {
    mockedList.mockResolvedValue({ data: SAMPLE, total: 1, page: 0, pageSize: 10 } as never)
    const user = userEvent.setup()
    render(<SummariesTable />)

    await waitFor(() => expect(mockedList).toHaveBeenCalledTimes(1))
    await user.click(screen.getByRole("radio", { name: "周报" }))
    await waitFor(() => {
      expect(mockedList).toHaveBeenLastCalledWith("tok-1", {
        frequency: "weekly",
        page: 0,
        pageSize: 10,
      })
    })
  })
})
