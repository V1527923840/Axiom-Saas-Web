"use client"

import { useState, useCallback, useRef } from "react"
import { researchApi } from "../services/research"
import type {
  ResearchAnalysisItem,
  ResearchAnalysisDetail,
  ResearchAnalysisQueryParams,
} from "../types"

interface ResearchAnalysisFilters {
  categoryL1: string | null;
  categoryL2: string | null;
  keyword: string;
  dateRange: { from: Date | undefined; to: Date | undefined } | undefined;
}

interface FetchItemsOptions {
  sortBy?: string;
  sortOrder?: string;
  categoryL1?: string;
  categoryL2?: string;
  keyword?: string;
  dateFrom?: string;
  dateTo?: string;
}

export function useResearchAnalysisStore() {
  const [items, setItems] = useState<ResearchAnalysisItem[]>([])
  const [loading, setLoading] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState({
    page: 0,
    pageSize: 10,
    total: 0,
  })
  const [selectedItem, setSelectedItem] = useState<ResearchAnalysisDetail | null>(null)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [filters, setFilters] = useState<ResearchAnalysisFilters>({
    categoryL1: null,
    categoryL2: null,
    keyword: "",
    dateRange: undefined,
  })

  // Use ref to avoid stale closure issues
  const paginationRef = useRef(pagination)
  paginationRef.current = pagination
  const filtersRef = useRef(filters)
  filtersRef.current = filters

  const fetchItems = useCallback(async (
    pageOverride?: number,
    options?: FetchItemsOptions,
    pageSizeOverride?: number,
  ) => {
    setLoading(true)
    setError(null)
    try {
      const currentPage = pageOverride !== undefined ? pageOverride : paginationRef.current.page
      const page = currentPage + 1
      const pageSize = pageSizeOverride ?? paginationRef.current.pageSize

      const searchParams: ResearchAnalysisQueryParams = {
        sortBy: options?.sortBy as 'analyzedAt' | 'overallScore' | 'createdAt' | undefined,
        sortOrder: options?.sortOrder as 'asc' | 'desc' | undefined,
      }

      const currentFilters = filtersRef.current
      searchParams.categoryL1 = options?.categoryL1 ?? currentFilters.categoryL1 ?? undefined
      searchParams.categoryL2 = options?.categoryL2 ?? currentFilters.categoryL2 ?? undefined
      searchParams.keyword = options?.keyword ?? currentFilters.keyword ?? undefined
      searchParams.dateFrom = options?.dateFrom ?? (currentFilters.dateRange?.from ? currentFilters.dateRange.from.toISOString().split('T')[0] : undefined)
      searchParams.dateTo = options?.dateTo ?? (currentFilters.dateRange?.to ? currentFilters.dateRange.to.toISOString().split('T')[0] : undefined)

      const response = await researchApi.getResearchAnalysis(page, pageSize, searchParams)

      const itemsArray = Array.isArray(response.data) ? response.data : []
      const total = response.total ?? 0
      const responsePage = response.page ?? page
      const responsePageSize = response.pageSize ?? pageSize

      setItems(itemsArray)
      setPagination((prev) => ({
        ...prev,
        total,
        page: responsePage - 1,
        pageSize: responsePageSize,
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch items")
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchDetail = useCallback(async (id: number) => {
    setDetailLoading(true)
    setError(null)
    try {
      const detail = await researchApi.getResearchAnalysisDetail(id)
      return detail
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch detail")
      return null
    } finally {
      setDetailLoading(false)
    }
  }, [])

  const setPage = useCallback((page: number) => {
    setPagination((prev) => ({ ...prev, page }))
    fetchItems(page)
  }, [fetchItems])

  const setPageSize = useCallback((pageSize: number) => {
    setPagination((prev) => ({ ...prev, pageSize, page: 0 }))
    fetchItems(0, {}, pageSize)
  }, [fetchItems])

  const openDetail = useCallback(async (item: ResearchAnalysisItem) => {
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

  // Filter setters
  const setCategoryL1 = useCallback((value: string | null) => {
    setFilters(prev => ({ ...prev, categoryL1: value }))
  }, [])

  const setCategoryL2 = useCallback((value: string) => {
    setFilters(prev => ({ ...prev, categoryL2: value }))
  }, [])

  const setKeyword = useCallback((value: string) => {
    setFilters(prev => ({ ...prev, keyword: value }))
  }, [])

  const setDateRange = useCallback((value: { from: Date | undefined; to: Date | undefined } | undefined) => {
    setFilters(prev => ({ ...prev, dateRange: value }))
  }, [])

  const resetFilters = useCallback(() => {
    setFilters({
      categoryL1: null,
      categoryL2: null,
      keyword: "",
      dateRange: undefined,
    })
  }, [])

  return {
    items,
    loading,
    detailLoading,
    error,
    pagination,
    selectedItem,
    detailDialogOpen,
    filters,
    fetchItems,
    setPage,
    setPageSize,
    openDetail,
    closeDetail,
    setCategoryL1,
    setCategoryL2,
    setKeyword,
    setDateRange,
    resetFilters,
  }
}