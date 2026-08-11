"use client"

import { useCallback } from "react"
import { create } from "zustand"
import {
  listDailySummaries,
  type DailySummary,
  type Frequency,
} from "@/services/daily-summary"
import { useAuth } from "@/contexts/auth-context"
import { formatLocalDate } from "@/lib/utils"

interface Pagination {
  page: number
  pageSize: number
  total: number
}

export interface DateRange {
  from: Date | undefined
  to: Date | undefined
}

interface FetchOverrides {
  page?: number
  pageSize?: number
  frequency?: Frequency
  dateRange?: DateRange | null
}

interface SummariesState {
  items: DailySummary[]
  loading: boolean
  error: string | null
  pagination: Pagination
  frequency: Frequency | undefined
  dateRange: DateRange | null
  openReportId: string | null

  fetchSummaries: (
    token: string | null,
    overrides?: FetchOverrides,
  ) => Promise<void>
  setPage: (token: string | null, page: number) => void
  setPageSize: (token: string | null, pageSize: number) => void
  /** Update the frequency filter in store only — does NOT trigger a fetch.
   *  Callers must invoke fetchSummaries({ page: 0 }) explicitly (typically
   *  from the "搜索" button) to apply the new value. */
  setFrequency: (frequency: Frequency | undefined) => void
  /** Update the date range filter in store only — does NOT trigger a fetch. */
  setDateRange: (range: DateRange | null) => void
  resetFilters: () => void
  openReport: (id: string) => void
  closeReport: () => void
}

export const useSummariesStore = create<SummariesState>((set, get) => ({
  items: [],
  loading: false,
  error: null,
  pagination: { page: 0, pageSize: 10, total: 0 },
  frequency: undefined,
  dateRange: null,
  openReportId: null,

  fetchSummaries: async (token, overrides) => {
    const cur = get()
    const page = overrides?.page ?? cur.pagination.page
    const pageSize = overrides?.pageSize ?? cur.pagination.pageSize
    const frequency = overrides?.frequency ?? cur.frequency
    const dateRange =
      overrides?.dateRange !== undefined
        ? overrides.dateRange
        : cur.dateRange
    set({ loading: true, error: null })
    try {
      const r = await listDailySummaries(token, {
        frequency,
        dateFrom: dateRange?.from
          ? formatLocalDate(dateRange.from)
          : undefined,
        dateTo: dateRange?.to ? formatLocalDate(dateRange.to) : undefined,
        page,
        pageSize,
      })
      set({
        items: r.data,
        pagination: { page: r.page, pageSize: r.pageSize, total: r.total },
        loading: false,
        frequency,
        dateRange,
      })
    } catch (e) {
      set({
        error: e instanceof Error ? e.message : "加载失败",
        loading: false,
      })
    }
  },

  setPage: (token, page) => {
    void get().fetchSummaries(token, { page })
  },
  setPageSize: (token, pageSize) => {
    void get().fetchSummaries(token, { pageSize, page: 0 })
  },
  // Filter setters only mutate store state — the page-level "搜索" button
  // is the single trigger that calls fetchSummaries to apply the latest
  // filter values. This matches the 情报精选 / 机构研报 UX (manual
  // filter-then-search, no fetch-on-every-keystroke).
  setFrequency: (frequency) => set({ frequency }),
  setDateRange: (range) => set({ dateRange: range }),
  resetFilters: () => {
    set({ frequency: undefined, dateRange: null })
  },
  openReport: (id) => set({ openReportId: id }),
  closeReport: () => set({ openReportId: null }),
}))

/**
 * Convenience hook that wraps the store with auth-token injection.
 * Use this from the page instead of `useSummariesStore` directly so
 * the caller doesn't have to thread the token through every action.
 */
export function useSummariesPage() {
  const { token } = useAuthSafe()
  const store = useSummariesStore()
  const fetchSummaries = useCallback(
    (overrides?: FetchOverrides) => store.fetchSummaries(token, overrides),
    [token, store],
  )
  const setPage = useCallback(
    (page: number) => store.setPage(token, page),
    [token, store],
  )
  const setPageSize = useCallback(
    (pageSize: number) => store.setPageSize(token, pageSize),
    [token, store],
  )
  const setFrequency = useCallback(
    (frequency: Frequency | undefined) => store.setFrequency(frequency),
    [store],
  )
  const setDateRange = useCallback(
    (range: DateRange | null) => store.setDateRange(range),
    [store],
  )
  return {
    items: store.items,
    loading: store.loading,
    error: store.error,
    pagination: store.pagination,
    frequency: store.frequency,
    dateRange: store.dateRange,
    openReportId: store.openReportId,
    fetchSummaries,
    setPage,
    setPageSize,
    setFrequency,
    setDateRange,
    resetFilters: store.resetFilters,
    openReport: store.openReport,
    closeReport: store.closeReport,
  }
}

// Local alias so the page-level hook reads auth without forcing every
// test to mock useAuth.
function useAuthSafe() {
  return useAuth()
}
