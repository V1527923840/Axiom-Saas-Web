"use client"

import { useState, useCallback, useRef } from "react"
import { get as apiGet } from "@/lib/api"
import type { IntelligenceItem, IntelligenceDetail } from "../types"

/**
 * Hook for the intelligence posts list + detail.
 *
 * Pagination bug fix note (this hook previously did not own the
 * search-bar filters):
 *
 *   When the DataTable called the store's `setPage(newPage)`, the
 *   store would dispatch `fetchPosts(page, {})` with empty params,
 *   silently dropping the title / date range the user had typed into
 *   the search bar — because those values lived in a separate
 *   `useIntelligenceFilters` hook in the page component. Clicking the
 *   pagination chevrons on a filtered result set would therefore jump
 *   to the wrong (unfiltered) page and confuse the operator.
 *
 *   The fix is to keep filter state here, alongside the pagination
 *   state, and let `setPage` / `setPageSize` fall back to the latest
 *   saved filters — the same pattern used by `useScrapeLogStore` and
 *   `useParseTaskStore`. The page still owns the visible filter UI;
 *   it just writes into the store via the setters exposed below
 *   instead of into a sibling hook.
 *
 * Note on response shape: the server returns `{ data: T[], meta: { total,
 * page, pageSize } }` (envelope) for list endpoints and `{ data: T }` for
 * single-item endpoints. The api.ts wrapper's `response` IS the parsed
 * wire body — its top-level `data` is the array/item, and the sibling
 * `meta` carries pagination.
 *
 * For the detail endpoint the wire body is `{ data: IntelligenceDetail }`,
 * so `response.data` (the wrapper's `data` field) IS the wire body, and
 * `response.data.data` (the wire body's `data` field) is the actual
 * IntelligenceDetail.
 */
export function useIntelligencePostsStore() {
  const [posts, setPosts] = useState<IntelligenceItem[]>([])
  const [loading, setLoading] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState({
    page: 0,
    pageSize: 10,
    total: 0,
  })
  const [selectedItem, setSelectedItem] = useState<IntelligenceDetail | null>(
    null,
  )
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  // Search-bar filters now live in the store so that pagination, search,
  // and sort all see the same source of truth. Previously these lived in
  // a separate `useIntelligenceFilters` hook in the page, which caused
  // the pagination bug described in the comment above.
  const [filters, setFilters] = useState({
    title: "",
    dateRange: { from: undefined as Date | undefined, to: undefined as Date | undefined },
  })

  const paginationRef = useRef(pagination)
  paginationRef.current = pagination
  const filtersRef = useRef(filters)
  filtersRef.current = filters

  const fetchPosts = useCallback(
    async (
      pageOverride?: number,
      params?: Record<string, string | number | boolean | Date | undefined>,
      pageSizeOverride?: number,
    ) => {
      setLoading(true)
      setError(null)
      try {
        const currentPage =
          pageOverride !== undefined
            ? pageOverride
            : paginationRef.current.page
        const page = currentPage + 1
        const pageSize =
          pageSizeOverride ?? paginationRef.current.pageSize

        const searchParams = new URLSearchParams()
        searchParams.set("page", String(page))
        searchParams.set("pageSize", String(pageSize))

        // `params` is the explicit set the caller wants to forward
        // (e.g. the values typed into the search bar the moment the
        // operator clicked 搜索). When `params` is missing/empty we
        // fall back to the latest saved filters — this is what keeps
        // pagination in sync with the visible search state when the
        // operator only clicks next/prev without re-running 搜索.
        //
        // Param name mapping note: the UI shows the filter as "标题"
        // (title) but the backend DTO `QueryIntelligenceDto` only
        // declares `keyword` (which on the server side maps to a
        // `WHERE title ILIKE %keyword%` clause — see
        // intelligence.repository.ts). The visual label and the
        // wire-protocol name do not match — we keep "标题" in the UI
        // (it's the right operator-facing word) and emit "keyword"
        // on the wire so the backend accepts it.
        let effectiveParams: Record<string, string | number | boolean | Date | undefined> | undefined = params
        if (!effectiveParams || Object.keys(effectiveParams).length === 0) {
          const f = filtersRef.current
          const fallback: Record<string, string | number | boolean | Date | undefined> = {}
          if (f.title) fallback.keyword = f.title
          if (f.dateRange?.from) fallback.dateFrom = f.dateRange.from.toISOString().split("T")[0]
          if (f.dateRange?.to) fallback.dateTo = f.dateRange.to.toISOString().split("T")[0]
          effectiveParams = fallback
        }

        if (effectiveParams) {
          Object.entries(effectiveParams).forEach(([key, value]) => {
            if (value === undefined || value === null || value === "") return
            // Server DTO expects uppercase sortOrder (enum: ASC | DESC).
            // Accept lowercase from callers and normalize here.
            const v =
              key === "sortOrder" ? String(value).toUpperCase() : String(value)
            searchParams.set(key, v)
          })
        }

        // Wire body: { data: IntelligenceItem[], meta: { total, page, pageSize } }
        // The api.ts wrapper exposes the wire body as-is; meta is at the top level.
        const wireBody = (await apiGet(
          `/v1/intelligence?${searchParams.toString()}`,
        )) as unknown as {
          data?: IntelligenceItem[]
          meta?: { total?: number; page?: number; pageSize?: number }
        }

        const itemsArray = Array.isArray(wireBody.data) ? wireBody.data : []
        const total = wireBody.meta?.total ?? 0
        const responsePage = wireBody.meta?.page ?? page
        const responsePageSize = wireBody.meta?.pageSize ?? pageSize

        setPosts(itemsArray)
        setPagination((prev) => ({
          ...prev,
          total,
          page: responsePage - 1,
          pageSize: responsePageSize,
        }))
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch posts",
        )
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  const fetchDetail = useCallback(async (id: string) => {
    setDetailLoading(true)
    setError(null)
    try {
      // Wire body: { data: IntelligenceDetail }
      // apiGet<T> returns the wire body cast to ApiResponse<T> — so
      // response.data (the wrapper's `data` field) IS the wire body itself,
      // and response.data.data is the actual detail object.
      const wireBody = (await apiGet(
        `/v1/intelligence/${id}`,
      )) as unknown as { data?: IntelligenceDetail }

      const detail = wireBody.data ?? null
      if (!detail) return null
      setSelectedItem(detail)
      setDetailDialogOpen(true)
      return detail
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch detail",
      )
      return null
    } finally {
      setDetailLoading(false)
    }
  }, [])

  // The setPage/setPageSize flows now use `fetchPosts(page, {})` —
  // empty params — which triggers the `filterRef` fallback path
  // above, so the user's search bar values are always re-attached.
  const setPage = useCallback(
    (page: number) => {
      setPagination((prev) => ({ ...prev, page }))
      fetchPosts(page, {})
    },
    [fetchPosts],
  )

  const setPageSize = useCallback(
    (pageSize: number) => {
      setPagination((prev) => ({ ...prev, pageSize, page: 0 }))
      fetchPosts(0, {}, pageSize)
    },
    [fetchPosts],
  )

  const setTitle = useCallback((title: string) => {
    setFilters((prev) => ({ ...prev, title }))
  }, [])

  const setDateRange = useCallback(
    (dateRange: { from: Date | undefined; to: Date | undefined } | undefined) => {
      setFilters((prev) => ({ ...prev, dateRange }))
    },
    [],
  )

  const resetFilters = useCallback(() => {
    setFilters({
      title: "",
      dateRange: { from: undefined, to: undefined },
    })
  }, [])

  const openDetail = useCallback(
    async (item: IntelligenceItem) => {
      await fetchDetail(item.id)
    },
    [fetchDetail],
  )

  const closeDetail = useCallback(() => {
    setDetailDialogOpen(false)
  }, [])

  return {
    posts,
    loading,
    detailLoading,
    error,
    pagination,
    selectedItem,
    detailDialogOpen,
    filters,
    fetchPosts,
    setPage,
    setPageSize,
    openDetail,
    closeDetail,
    setTitle,
    setDateRange,
    resetFilters,
  }
}
