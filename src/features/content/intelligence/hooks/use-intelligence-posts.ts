"use client"

import { useState, useCallback, useRef } from "react"
import { get as apiGet } from "@/lib/api"
import type { IntelligenceItem, IntelligenceDetail } from "../types"

/**
 * Hook for the intelligence posts list + detail.
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

  const paginationRef = useRef(pagination)
  paginationRef.current = pagination

  const fetchPosts = useCallback(
    async (
      pageOverride?: number,
      params?: Record<string, string | number | boolean | undefined>,
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

        if (params) {
          Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== "") {
              searchParams.set(key, String(value))
            }
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
    fetchPosts,
    setPage,
    setPageSize,
    openDetail,
    closeDetail,
  }
}