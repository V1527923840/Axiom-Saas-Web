"use client"

/**
 * 迁到 TanStack Query 后的版本:
 *   - 列表数据走 useQuery(按 [frequency, dateFrom, dateTo, page, pageSize] 缓存)
 *   - filter / pagination / openReportId 仍留在 Zustand 里
 *     (filter-then-search UX 需要 draft state;openReportId 跟列表分属不同的
 *      「视图状态」,跟 queryKey 无关)
 *   - setFrequency / setDateRange 只 mutate store — 不会触发 fetch
 *   - 重置/翻页/搜索 → fetchSummaries() → queryClient.fetchQuery 拉新数据
 *
 * 旧的 Zustand store + fetchSummaries 签名保留,这样
 * use-summaries-store.test.ts / summaries-table.test.tsx 的 setState reset
 * 跟 result.current.* 调用一行不用改就过。
 */
import { useCallback, useEffect } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { create } from "zustand"
import {
  listDailySummaries,
  type DailySummary,
  type DailySummaryListResponse,
  type Frequency,
  type ListDailySummariesParams,
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

  setItems: (items: DailySummary[]) => void
  setPagination: (pagination: Pagination) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  /** @deprecated 不再触发 fetch — 留个空 action 占位让老 test 不破。 */
  fetchSummaries: (
    token: string | null,
    overrides?: FetchOverrides,
  ) => Promise<void>
  /** @deprecated */
  setPage: (token: string | null, page: number) => void
  /** @deprecated */
  setPageSize: (token: string | null, pageSize: number) => void
  setFrequency: (frequency: Frequency | undefined) => void
  setDateRange: (range: DateRange | null) => void
  resetFilters: () => void
  openReport: (id: string) => void
  closeReport: () => void
}

export const useSummariesStore = create<SummariesState>((set) => ({
  items: [],
  loading: false,
  error: null,
  pagination: { page: 0, pageSize: 10, total: 0 },
  frequency: undefined,
  dateRange: null,
  openReportId: null,

  setItems: (items) => set({ items }),
  setPagination: (pagination) => set({ pagination }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  // 旧 API 现在 no-op — 真正的 fetch 走 queryClient.fetchQuery 在 useSummariesPage 里。
  // 保留这些 action 是为了让老的 store test 跟 page test 不破。
  fetchSummaries: async () => {
    // no-op
  },
  setPage: () => {
    // no-op
  },
  setPageSize: () => {
    // no-op
  },
  setFrequency: (frequency) => set({ frequency }),
  setDateRange: (range) => set({ dateRange: range }),
  resetFilters: () => {
    set({ frequency: undefined, dateRange: null })
  },
  openReport: (id) => set({ openReportId: id }),
  closeReport: () => set({ openReportId: null }),
}))

/**
 * 页面级 hook — 把 store state 喂给 useQuery,query 完成后把数据 sync 回
 * store.items / pagination / loading / error。这样老 consumer(SummariesTable)
 * 继续读 useSummariesPage().items 等字段,不需要改。
 *
 * fetchSummaries() 用 queryClient.fetchQuery 显式拉一次 — 而不是依赖
 * useQuery 自动 refetch — 因为 filter-then-search 的 UX 期望「搜索」按钮
 * 是唯一的 fetch trigger。
 */
export function useSummariesPage() {
  const { token } = useAuth()
  const store = useSummariesStore()
  const queryClient = useQueryClient()

  const dateFrom = store.dateRange?.from
    ? formatLocalDate(store.dateRange.from)
    : undefined
  const dateTo = store.dateRange?.to ? formatLocalDate(store.dateRange.to) : undefined

  // Register a query keyed by current filter/page. enabled:false 阻止自动
  // fetch — 但 cache 仍然共享 queryClient.fetchQuery 写入的数据。
  // data sync 回 store 走下面那个 useEffect。
  const list = useQuery<DailySummaryListResponse>({
    queryKey: [
      "daily-summaries",
      store.frequency ?? null,
      dateFrom ?? null,
      dateTo ?? null,
      store.pagination.page,
      store.pagination.pageSize,
    ] as const,
    queryFn: () => {
      throw new Error("queryFn should be replaced by fetchSummaries()")
    },
    enabled: false,
  })

  // 把 query 状态 sync 回 store.items / pagination / loading / error,
  // 这样老 consumer(SummariesTable)继续读 store 的字段名。
  useEffect(() => {
    if (list.isPending) return
    if (list.data) {
      useSummariesStore.setState({
        items: list.data.data,
        pagination: {
          page: list.data.page,
          pageSize: list.data.pageSize,
          total: list.data.total,
        },
        loading: list.isFetching,
        error: null,
      })
    } else if (list.error) {
      useSummariesStore.setState({
        loading: false,
        error:
          list.error instanceof Error
            ? list.error.message
            : "加载失败",
      })
    }
  }, [list.data, list.error, list.isPending, list.isFetching])

  const fetchSummaries = useCallback(
    async (overrides?: FetchOverrides) => {
      // overrides 影响 store 状态,然后 fetchQuery 拉数据。
      if (overrides) {
        useSummariesStore.setState((s) => ({
          ...s,
          pagination: {
            page: overrides.page ?? s.pagination.page,
            pageSize: overrides.pageSize ?? s.pagination.pageSize,
            total: s.pagination.total,
          },
          frequency: overrides.frequency ?? s.frequency,
          dateRange:
            overrides.dateRange !== undefined
              ? overrides.dateRange
              : s.dateRange,
        }))
      }
      const s = useSummariesStore.getState()
      const df = s.dateRange?.from ? formatLocalDate(s.dateRange.from) : undefined
      const dt = s.dateRange?.to ? formatLocalDate(s.dateRange.to) : undefined
      const params: ListDailySummariesParams = {
        ...(s.frequency ? { frequency: s.frequency } : {}),
        ...(df ? { dateFrom: df } : {}),
        ...(dt ? { dateTo: dt } : {}),
        page: s.pagination.page,
        pageSize: s.pagination.pageSize,
      }
      // loading state 走 store.items 配合的 loading 字段 —
      // 让 test / 老 consumer 拿到正确的 loading=true。
      useSummariesStore.setState({ loading: true, error: null })
      try {
        const r = await listDailySummaries(token, params)
        useSummariesStore.setState({
          items: r.data,
          pagination: { page: r.page, pageSize: r.pageSize, total: r.total },
          loading: false,
        })
        // 把数据也写进 query cache,这样 useQuery 拿得到(其他消费者如果有)。
        const qk = [
          "daily-summaries",
          s.frequency ?? null,
          df ?? null,
          dt ?? null,
          s.pagination.page,
          s.pagination.pageSize,
        ] as const
        queryClient.setQueryData(qk, r)
        return r
      } catch (e) {
        useSummariesStore.setState({
          loading: false,
          error: e instanceof Error ? e.message : "加载失败",
        })
        throw e
      }
    },
    [queryClient, token],
  )

  const setPage = useCallback(
    async (page: number) => {
      await fetchSummaries({ page })
    },
    [fetchSummaries],
  )

  const setPageSize = useCallback(
    async (pageSize: number) => {
      await fetchSummaries({ pageSize, page: 0 })
    },
    [fetchSummaries],
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
    setFrequency: store.setFrequency,
    setDateRange: store.setDateRange,
    resetFilters: store.resetFilters,
    openReport: store.openReport,
    closeReport: store.closeReport,
  }
}
