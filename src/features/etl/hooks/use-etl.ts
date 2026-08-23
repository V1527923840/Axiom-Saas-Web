/**
 * useEtl — 待入库文件列表 + 导入 + 任务历史(jobs)。
 *
 * 迁移到 TanStack Query(对照 use-users.ts):
 *  - useEtlFiles/useEtlJobs 走 useQuery 缓存 + 自动 refetch
 *  - useEtlImport 是 useMutation,onSuccess 自动 invalidate jobs 列表 —
 *    之前 page.tsx 在 import 成功后手动调 fetchJobs(),现在交给缓存层处理
 *  - useJobStatus 没有任何 caller(grep 全仓库只剩 hook 自己)—
 *    它的 `loading` setter 还是 declared-but-never-written 的 dead state,
 *    干脆删掉整个 hook。需要时再单独写一个 useJobStatus(jobId)。
 *
 * 分页元数据走 src/lib/paginated-response.ts 的 readRootPagination —
 * 处理 1-based API → 0-based 内部的转换。后端的 TransformResponseInterceptor
 * 把分页响应包成 { data: items[], meta: { total, page, pageSize } },
 * readRootPagination 从 res.meta 读元数据,extractItems 从 res.data 读 items。
 *
 * JobHistory 组件契约:它消费 pagination.page 是 1-based(用 page-1 / page+1
 * 计算翻页,用 page<=1 判断 disabled)。所以 hook 返回前把 internal 0-based
 * 再 + 1 转回 1-based,保留 JobHistory 不用动 — 跟 useUsers 返回 0-based
 * (DataTable 用)不同,这里返回 1-based 是组件契约的硬要求。
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { get, post } from "@/lib/api"
import type {
  EtlFileItem,
  EtlJob,
  EtlImportOptions,
  EtlImportResponse,
  EtlJobsQueryParams,
} from "../types"
import {
  readRootPagination,
  toApiPageParams,
  extractItems,
} from "@/lib/paginated-response"

const PAGE_SIZE_DEFAULT = 20

// 后端响应形状 — files 端点返回 { data: EtlFileItem[], total }
// (infinityPagination,admin-server CLAUDE.md 格式 A)
interface EtlFilesApiResponse {
  data: EtlFileItem[]
  total: number
}

export interface UseEtlFilesResult {
  files: EtlFileItem[]
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

export function useEtlFiles(): UseEtlFilesResult {
  const files = useQuery({
    queryKey: ["etl", "files"] as const,
    queryFn: async (): Promise<EtlFileItem[]> => {
      const res = await get<EtlFilesApiResponse>("/v1/etl/files")
      // 后端包络可能是 { data: [...] } 也可能是裸数组,都兼容
      const raw = res.data as unknown
      if (Array.isArray(raw)) return raw as EtlFileItem[]
      const wrapped = raw as { data?: EtlFileItem[] } | null
      return Array.isArray(wrapped?.data) ? wrapped!.data : []
    },
    staleTime: 30_000,
  })

  return {
    files: files.data ?? [],
    isLoading: files.isLoading,
    error: files.error,
    refetch: files.refetch,
  }
}

export interface UseEtlImportResult {
  importFiles: (files: string[], options?: EtlImportOptions) => Promise<EtlImportResponse>
  isPending: boolean
  error: Error | null
  reset: () => void
}

export function useEtlImport(): UseEtlImportResult {
  const qc = useQueryClient()
  const mutation = useMutation({
    mutationFn: async ({
      files,
      options,
    }: {
      files: string[]
      options?: EtlImportOptions
    }): Promise<EtlImportResponse> => {
      const res = await post<EtlImportResponse>("/v1/etl/import", { files, options })
      return res.data
    },
    // ★ import 成功后刷新任务列表,让新 job 立刻出现。
    // 之前 page.tsx 在 import 成功后手动调 fetchJobs(),
    // 现在交给缓存层,所有持有 ['etl', 'jobs'] query 的组件都会自动刷新。
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["etl", "jobs"] })
    },
  })

  return {
    importFiles: (files, options) => mutation.mutateAsync({ files, options }),
    isPending: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  }
}

export interface EtlJobsPagination {
  /** 1-based(JobHistory 组件契约)。 */
  page: number
  pageSize: number
  total: number
}

export interface UseEtlJobsResult {
  jobs: EtlJob[]
  pagination: EtlJobsPagination
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

/**
 * params 必须由 caller 传入(从 useState 派生),params 变 → queryKey 变 →
 * TanStack Query 自动 refetch。不要 capture initialParams by closure —
 * 那会导致翻页请求带新参数但 queryFn 仍用旧参数,翻页静默失效。
 */
export function useEtlJobs(params: EtlJobsQueryParams = {}): UseEtlJobsResult {
  // JSON.stringify 给 params 做稳定 key;对象引用每次 render 都变,
  // 直接放 queryKey 会让 TanStack Query 每次 render 都 refetch。
  const paramsKey = JSON.stringify(params)

  const list = useQuery({
    queryKey: ["etl", "jobs", paramsKey] as const,
    queryFn: async () => {
      const { page, pageSize } = toApiPageParams(params, {
        pageSize: PAGE_SIZE_DEFAULT,
      })
      const queryParams: Record<string, string | number> = { page, pageSize }
      if (params.status) queryParams.status = params.status
      if (params.dateFrom) queryParams.dateFrom = params.dateFrom
      if (params.dateTo) queryParams.dateTo = params.dateTo

      const res = await get<EtlJob[]>("/v1/etl/jobs", { params: queryParams })
      // res.data 是 items 数组(res.meta 是分页元数据)
      const items = extractItems<EtlJob>(res.data)
      return { items, meta: res.meta }
    },
    staleTime: 30_000,
  })

  const items = list.data?.items ?? []
  // internal 0-based → 外部 1-based(JobHistory 契约)
  const internal = readRootPagination(list.data?.meta, { pageSize: PAGE_SIZE_DEFAULT })
  const pagination: EtlJobsPagination = {
    page: internal.page + 1,
    pageSize: internal.pageSize,
    total: internal.total,
  }

  return {
    jobs: items,
    pagination,
    isLoading: list.isLoading,
    error: list.error,
    refetch: list.refetch,
  }
}
