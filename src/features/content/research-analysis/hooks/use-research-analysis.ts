/**
 * useResearchAnalysis — list + detail for the 机构研报 page.
 *
 * Migrated to TanStack Query (mirroring use-users.ts). The Zustand store
 * that used to live here is gone; list + detail are now cached queries.
 *
 * What stayed in component state (NOT moved into the hook):
 *   - Search-bar filters (keyword, dateRange): UI-only, no need to cache.
 *   - selectedId / selectedItem / detailDialogOpen: component-local, drives
 *     which row's detail is being viewed. The detail query is keyed by
 *     `id` so a remount of the same id hits the cache.
 *
 * 分页元数据走 src/lib/paginated-response.ts 的 readRootPagination —
 * 处理 1-based API → 0-based 内部的转换。后端的 TransformResponseInterceptor
 * 把分页响应包成 { data: items[], meta: { total, page, pageSize } },
 * readRootPagination 从 res.meta 读元数据,extractItems 从 res.data 读 items。
 *
 * Service-level behavior preserved:
 *   - getResearchAnalysis: sortOrder uppercased before sending (service
 *     responsibility — the hook just forwards `params`).
 *   - getResearchAnalysisDetail: silent-null on error — the hook's
 *     queryFn wraps the service call in try/catch and returns null
 *     instead of letting TanStack Query surface the error, so the UI
 *     stays in its "no detail loaded" branch. Flip the behavior by
 *     removing the try/catch if the UI ever wants to show an error
 *     alert.
 */
import { useQuery } from "@tanstack/react-query"
import {
  readRootPagination,
  toApiPageParams,
  type InternalPagination,
  type PaginationMeta,
} from "@/lib/paginated-response"
import { researchApi } from "../services/research"
import type {
  ResearchAnalysisItem,
  ResearchAnalysisDetail,
  ResearchAnalysisQueryParams,
} from "../types"

const PAGE_SIZE_DEFAULT = 10

export interface ResearchAnalysisListParams {
  page?: number
  pageSize?: number
  keyword?: string
  dateFrom?: string
  dateTo?: string
  sortBy?: ResearchAnalysisQueryParams["sortBy"]
  sortOrder?: ResearchAnalysisQueryParams["sortOrder"]
}

export interface UseResearchAnalysisListResult {
  items: ResearchAnalysisItem[]
  pagination: InternalPagination
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

export function useResearchAnalysisList(
  params: ResearchAnalysisListParams = {},
): UseResearchAnalysisListResult {
  const query = useQuery({
    queryKey: ["research-analysis", "list", params] as const,
    queryFn: async (): Promise<{ items: ResearchAnalysisItem[]; meta: PaginationMeta | undefined }> => {
      const { page, pageSize } = toApiPageParams(params, {
        pageSize: PAGE_SIZE_DEFAULT,
      })
      const res = await researchApi.getResearchAnalysis(page, pageSize, {
        keyword: params.keyword,
        dateFrom: params.dateFrom,
        dateTo: params.dateTo,
        sortBy: params.sortBy,
        sortOrder: params.sortOrder,
      })
      return { items: res.data, meta: res.meta }
    },
    staleTime: 30_000,
  })

  const items = query.data?.items ?? []
  const pagination = readRootPagination(query.data?.meta, { pageSize: PAGE_SIZE_DEFAULT })
  return {
    items,
    pagination,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  }
}

export interface UseResearchAnalysisDetailResult {
  detail: ResearchAnalysisDetail | null
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

/**
 * Detail query. `enabled: false` until an id is set — the page passes the
 * selected row's id, so the query only fires after the operator clicks
 * 查看. The service silently returns null on error; the queryFn mirrors
 * that to keep the UI's "detail not loaded yet" branch identical.
 */
export function useResearchAnalysisDetail(
  id: number | null | undefined,
): UseResearchAnalysisDetailResult {
  const query = useQuery({
    queryKey: ["research-analysis", "detail", id] as const,
    queryFn: async (): Promise<ResearchAnalysisDetail | null> => {
      try {
        return await researchApi.getResearchAnalysisDetail(Number(id))
      } catch {
        return null
      }
    },
    enabled: id !== null && id !== undefined && Number.isFinite(Number(id)),
    staleTime: 30_000,
  })

  return {
    detail: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  }
}
