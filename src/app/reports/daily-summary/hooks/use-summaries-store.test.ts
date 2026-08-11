import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, act } from "@testing-library/react"

vi.mock("@/services/daily-summary", () => ({
  listDailySummaries: vi.fn(),
}))
vi.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({ token: "tok-1" }),
}))

import { listDailySummaries } from "@/services/daily-summary"
import {
  useSummariesStore,
  useSummariesPage,
} from "./use-summaries-store"

const mockedList = vi.mocked(listDailySummaries)

beforeEach(() => {
  mockedList.mockReset()
  // Reset internal state between tests by calling the store action.
  useSummariesStore.setState({
    items: [],
    pagination: { page: 0, pageSize: 10, total: 0 },
    frequency: undefined,
    dateRange: null,
    openReportId: null,
  })
})

describe("useSummariesPage", () => {
  it("fetches daily summaries with 0-based page", async () => {
    mockedList.mockResolvedValue({
      data: [{ reportId: "r1" }],
      total: 1,
      page: 0,
      pageSize: 10,
    } as never)

    const { result } = renderHook(() => useSummariesPage())
    await act(async () => {
      await result.current.fetchSummaries({ frequency: "daily", page: 0 })
    })

    expect(mockedList).toHaveBeenCalledWith("tok-1", {
      frequency: "daily",
      page: 0,
      pageSize: 10,
    })
    expect(result.current.items).toHaveLength(1)
    expect(result.current.pagination.total).toBe(1)
  })

  it("setFrequency resets to page 0 on next fetch", async () => {
    mockedList.mockResolvedValue({ data: [], total: 0, page: 0, pageSize: 10 } as never)
    const { result } = renderHook(() => useSummariesPage())
    await act(async () => {
      result.current.setFrequency("weekly")
      await result.current.fetchSummaries({})
    })
    expect(mockedList).toHaveBeenLastCalledWith("tok-1", {
      frequency: "weekly",
      page: 0,
      pageSize: 10,
    })
  })

  it("setDateRange passes dateFrom + dateTo and re-fetches from page 0", async () => {
    mockedList.mockResolvedValue({ data: [], total: 0, page: 0, pageSize: 10 } as never)
    const { result } = renderHook(() => useSummariesPage())
    const from = new Date(2026, 7, 5) // local 2026-08-05
    const to = new Date(2026, 7, 7) // local 2026-08-07
    await act(async () => {
      result.current.setDateRange({ from, to })
    })
    expect(mockedList).toHaveBeenLastCalledWith("tok-1", {
      dateFrom: "2026-08-05",
      dateTo: "2026-08-07",
      page: 0,
      pageSize: 10,
    })
    expect(result.current.dateRange?.from).toBe(from)
    expect(result.current.dateRange?.to).toBe(to)
  })

  it("openReport + closeReport toggles openReportId", () => {
    const { result } = renderHook(() => useSummariesPage())
    act(() => result.current.openReport("r-1"))
    expect(result.current.openReportId).toBe("r-1")
    act(() => result.current.closeReport())
    expect(result.current.openReportId).toBeNull()
  })
})
