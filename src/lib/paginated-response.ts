/**
 * 后端分页响应的单一事实源。
 *
 * 后端用 infinityPagination() 返回 { data, total, page, pageSize }(admin-server
 * CLAUDE.md 「格式 A」)— 分页字段在响应根级别,**不在** `response.meta` 里。
 *
 * 这层封装吸收两件事:
 *   1. **位置**:从 rawData 根级别读 total/page/pageSize,而不是 response.meta。
 *   2. **基数转换**:后端是 1-based page,前端内部 state 是 0-based
 *      (DataTable 把 externalPagination.page 当作 pageIndex:0-based,显示时 +1)。
 *
 * 不放这两件事到调用方,是防止 copy-paste 把 bug 重新带回来 —
 * 历史上 `response.meta?.page ?? 1` 出现在 7 个 hook 里,
 * `?? 1` 兜底每次 fetch 都把 pagination.page 重置成 1,叠加上 1-based/0-based
 * 错位导致「进入就是第二页 / 翻页对不上」的 bug。
 */

export interface PaginatedApiResponse {
  data: unknown[]
  total: number
  /** 后端是 1-based(第 1 页 = 1,不是 0)。 */
  page: number
  pageSize: number
}

export interface InternalPagination {
  /** 前端内部 0-based(直接喂给 DataTable 的 pageIndex)。 */
  page: number
  pageSize: number
  total: number
}

/**
 * 从后端 rawData 读 pagination,并把 1-based API page 转回 0-based。
 *
 * @param rawData 后端响应(可能 undefined,容错返回默认值)
 * @param defaults rawData 为空或缺字段时的兜底
 */
export function readRootPagination(
  rawData: PaginatedApiResponse | null | undefined,
  defaults: { pageSize: number },
): InternalPagination {
  return {
    page: Math.max(0, (rawData?.page ?? 1) - 1),
    pageSize: rawData?.pageSize ?? defaults.pageSize,
    total: rawData?.total ?? 0,
  }
}

/**
 * 把前端 internal 0-based params 转成 API 1-based query params。
 * 跟 readRootPagination 是反向操作 — 一起用能保证 0/1-based 一致。
 */
export function toApiPageParams(
  params: { page?: number; pageSize?: number },
  defaults: { pageSize: number },
): { page: number; pageSize: number } {
  return {
    page: (params.page ?? 0) + 1,
    pageSize: params.pageSize ?? defaults.pageSize,
  }
}

/**
 * 后端返回的 items 字段可能是数组本身,也可能是 { data: [...] } 包络
 * (历史原因:某些 endpoint 走 ApiResponse 自动解包,某些没有)。
 * 这层统一处理两种 shape,返回真正的 items 数组。
 */
export function extractItems<T>(rawData: unknown): T[] {
  if (Array.isArray(rawData)) return rawData as T[]
  const wrapped = rawData as { data?: T[] } | null | undefined
  return Array.isArray(wrapped?.data) ? (wrapped!.data as T[]) : []
}