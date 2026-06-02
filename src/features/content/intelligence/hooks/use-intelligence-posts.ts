"use client"

import { useState, useCallback, useRef } from "react"
import { get as apiGet } from "@/lib/api"
import type { IntelligenceItem, IntelligenceDetail } from "../types"

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
  const [selectedItem, setSelectedItem] = useState<IntelligenceDetail | null>(null)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)

  // Use ref to avoid stale closure issues
  const paginationRef = useRef(pagination)
  paginationRef.current = pagination

  const fetchPosts = useCallback(async (
    pageOverride?: number,
    params?: Record<string, string | number | boolean | undefined>,
    pageSizeOverride?: number
  ) => {
    setLoading(true)
    setError(null)
    try {
      const currentPage = pageOverride !== undefined ? pageOverride : paginationRef.current.page
      const page = currentPage + 1
      const pageSize = pageSizeOverride ?? paginationRef.current.pageSize
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

      const response = await apiGet<any>(`/v1/intelligence?${searchParams.toString()}`)

      const postsArray = Array.isArray(response.data) ? response.data : []
      const total = response.total ?? 0
      const responsePage = response.page ?? page
      const responsePageSize = response.pageSize ?? pageSize

      setPosts(postsArray)
      setPagination((prev) => ({
        ...prev,
        total,
        page: responsePage - 1,
        pageSize: responsePageSize,
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch posts")
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchDetail = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)
    try {
      const response = await apiGet<{ data: IntelligenceDetail }>(`/v1/intelligence/${id}`)
      return (response.data as { data?: IntelligenceDetail })?.data ?? null
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch detail")
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const setPage = useCallback((page: number) => {
    setPagination((prev) => ({ ...prev, page }))
    fetchPosts(page, {})
  }, [fetchPosts])

  const setPageSize = useCallback((pageSize: number) => {
    setPagination((prev) => ({ ...prev, pageSize, page: 0 }))
    fetchPosts(0, {}, pageSize)
  }, [fetchPosts])

  const openDetail = useCallback(async (item: IntelligenceItem) => {
    setDetailLoading(true)
    try {
      const detail = await fetchDetail(item.id)
      if (detail) {
        setSelectedItem(detail)
        setDetailDialogOpen(true)
      }
    } finally {
      setDetailLoading(false)
    }
  }, [fetchDetail])

  const closeDetail = useCallback(() => {
    setDetailDialogOpen(false)
  }, [])

  // Initial fetch is handled by page component, not here
  // This store only provides data, page manages the fetch lifecycle

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