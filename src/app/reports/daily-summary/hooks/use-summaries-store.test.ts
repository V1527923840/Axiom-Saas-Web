import { describe, it, expect, vi, beforeEach } from "vitest"
import { act } from "@testing-library/react"
import { renderHookWithQuery } from "@/test-utils"

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

    const { result } = renderHookWithQuery(() => useSummariesPage())
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

  it("setFrequency updates store state without fetching", () => {
    const { result } = renderHookWithQuery(() => useSummariesPage())
    act(() => result.current.setFrequency("weekly"))
    expect(result.current.frequency).toBe("weekly")
    expect(mockedList).not.toHaveBeenCalled()
  })

  it("setDateRange updates store state without fetching", () => {
    const { result } = renderHookWithQuery(() => useSummariesPage())
    const from = new Date(2026, 7, 5)
    const to = new Date(2026, 7, 7)
    act(() => result.current.setDateRange({ from, to }))
    expect(result.current.dateRange?.from).toBe(from)
    expect(result.current.dateRange?.to).toBe(to)
    expect(mockedList).not.toHaveBeenCalled()
  })

  it("fetchSummaries reads back the latest setFrequency + setDateRange state", async () => {
    mockedList.mockResolvedValue({ data: [], total: 0, page: 0, pageSize: 10 } as never)
    const { result } = renderHookWithQuery(() => useSummariesPage())
    act(() => {
      result.current.setFrequency("weekly")
      result.current.setDateRange({
        from: new Date(2026, 7, 5),
        to: new Date(2026, 7, 7),
      })
    })
    await act(async () => {
      // Simulate the page-level "搜索" button: just call fetchSummaries
      // and the store picks up the saved frequency + dateRange.
      await result.current.fetchSummaries({ page: 0 })
    })
    expect(mockedList).toHaveBeenLastCalledWith("tok-1", {
      frequency: "weekly",
      dateFrom: "2026-08-05",
      dateTo: "2026-08-07",
      page: 0,
      pageSize: 10,
    })
  })

  it("resetFilters clears frequency + dateRange but does not fetch", () => {
    mockedList.mockResolvedValue({ data: [], total: 0, page: 0, pageSize: 10 } as never)
    const { result } = renderHookWithQuery(() => useSummariesPage())
    act(() => {
      result.current.setFrequency("weekly")
      result.current.setDateRange({
        from: new Date(2026, 7, 5),
        to: new Date(2026, 7, 7),
      })
    })
    act(() => result.current.resetFilters())
    expect(result.current.frequency).toBeUndefined()
    expect(result.current.dateRange).toBeNull()
    expect(mockedList).not.toHaveBeenCalled()
  })

  it("openReport + closeReport toggles openReportId", () => {
    const { result } = renderHookWithQuery(() => useSummariesPage())
    act(() => result.current.openReport("r-1"))
    expect(result.current.openReportId).toBe("r-1")
    act(() => result.current.closeReport())
    expect(result.current.openReportId).toBeNull()
  })
})
