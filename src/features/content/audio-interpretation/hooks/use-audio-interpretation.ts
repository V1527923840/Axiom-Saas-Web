/**
 * useAudioInterpretation — paginated audio interpretation list.
 *
 * Migrated to TanStack Query (mirroring use-users.ts).
 * 分页元数据走 src/lib/paginated-response.ts 的 readRootPagination —
 * 处理 1-based API → 0-based 内部的转换 + 后端字段在响应根级别的事实
 * (admin-server CLAUDE.md 「格式 A」)。
 *
 * service 端的 contentApi.getAudioInterpretation 已经把后端的 { data, meta }
 * 包络拍平成了 { data, total, page, pageSize },所以 readRootPagination
 * 可以直接用。
 */
import { useQuery } from "@tanstack/react-query"
import { contentApi } from "@/services/content"
import type { AudioInterpretationItem } from "@/features/content/types"
import {
  readRootPagination,
  toApiPageParams,
  type InternalPagination,
  type PaginatedApiResponse,
} from "@/lib/paginated-response"

const PAGE_SIZE_DEFAULT = 10

export interface UseAudioInterpretationResult {
  items: AudioInterpretationItem[]
  pagination: InternalPagination
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

export interface AudioInterpretationQueryParams {
  page?: number
  pageSize?: number
}

export function useAudioInterpretation(
  params: AudioInterpretationQueryParams = {},
): UseAudioInterpretationResult {
  const list = useQuery({
    queryKey: ["audio-interpretation", params] as const,
    queryFn: async (): Promise<PaginatedApiResponse> => {
      const { page, pageSize } = toApiPageParams(params, {
        pageSize: PAGE_SIZE_DEFAULT,
      })
      const res = await contentApi.getAudioInterpretation(page, pageSize)
      // contentApi.getAudioInterpretation 已经把后端 { data, meta } 拍平成了
      // { data, total, page, pageSize } —— 直接交给 readRootPagination。
      return res
    },
    staleTime: 30_000,
  })

  const rawData = list.data
  const items = (rawData?.data as AudioInterpretationItem[] | undefined) ?? []
  const pagination = readRootPagination(rawData, { pageSize: PAGE_SIZE_DEFAULT })

  return {
    items,
    pagination,
    isLoading: list.isLoading,
    error: list.error,
    refetch: list.refetch,
  }
}
