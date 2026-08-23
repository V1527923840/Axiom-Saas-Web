/**
 * useAudioInterpretation — paginated audio interpretation list.
 *
 * Migrated to TanStack Query (mirroring use-users.ts).
 * 分页元数据走 src/lib/paginated-response.ts 的 readRootPagination —
 * 处理 1-based API → 0-based 内部的转换。后端的 TransformResponseInterceptor
 * 把分页响应包成 { data: items[], meta: { total, page, pageSize } },
 * readRootPagination 从 res.meta 读元数据,extractItems 从 res.data 读 items。
 *
 * service 端的 contentApi.getAudioInterpretation 直接转发后端的
 * { data, meta } 包络,hook 里用 extractItems + res.meta 各自消费。
 */
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { contentApi } from "@/services/content"
import type { AudioInterpretationItem } from "@/features/content/types"
import {
  readRootPagination,
  toApiPageParams,
  extractItems,
  type InternalPagination,
  type PaginationMeta,
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
    queryFn: async (): Promise<{ items: AudioInterpretationItem[]; meta: PaginationMeta | undefined }> => {
      const { page, pageSize } = toApiPageParams(params, {
        pageSize: PAGE_SIZE_DEFAULT,
      })
      const res = await contentApi.getAudioInterpretation(page, pageSize)
      // res.data 是 items 数组(res.meta 是分页元数据)
      const items = extractItems<AudioInterpretationItem>(res.data)
      return { items, meta: res.meta }
    },
    staleTime: 30_000,
    // 翻页时保留上一页数据 — 新 queryKey fetch 期间不闪 skeleton,
    // 跟其他 7 个迁移过的 hook(useUsers / usePlans / useMenus 等)
    // 的体感对齐。
    placeholderData: keepPreviousData,
  })

  const items = list.data?.items ?? []
  const pagination = readRootPagination(list.data?.meta, { pageSize: PAGE_SIZE_DEFAULT })

  return {
    items,
    pagination,
    isLoading: list.isLoading,
    error: list.error,
    refetch: list.refetch,
  }
}
