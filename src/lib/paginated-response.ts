/**
 * 后端分页响应的单一事实源。
 *
 * 后端用 infinityPagination() 返回 { data, total, page, pageSize },
 * 然后 TransformResponseInterceptor 包成
 *   { data: <items 数组>, meta: { total, page, pageSize } }
 * 见 admin-server src/utils/interceptors/transform-response.interceptor.ts。
 *
 * 前端 api.ts 的 request<T>() 不解包,直接返回这个 envelope —
 * 所以 response.data 是 items 数组本身,response.meta 是分页元数据。
 *
 * 这层封装吸收两件事:
 *   1. **位置**:从 response.meta 读 total/page/pageSize。
 *   2. **基数转换**:后端是 1-based page,前端内部 state 是 0-based
 *      (DataTable 把 externalPagination.page 当作 pageIndex:0-based,显示时 +1)。
 *
 * 不放这两件事到调用方,是防止 copy-paste 把 bug 重新带回来 —
 * 历史上读错位置 + 0/1-based 错位,导致「进入就是第二页 / 翻页对不上」。
 */

export interface PaginationMeta {
  /** 后端是 1-based(第 1 页 = 1,不是 0)。 */
  page?: number
  pageSize?: number
  total?: number
  hasNextPage?: boolean
}

export interface InternalPagination {
  /** 前端内部 0-based(直接喂给 DataTable 的 pageIndex)。 */
  page: number
  pageSize: number
  total: number
}

/**
 * 从后端 meta block 读 pagination,并把 1-based API page 转回 0-based。
 *
 * @param meta 后端 response.meta({ total, page, pageSize },可能 undefined)
 * @param defaults meta 为空或缺字段时的兜底
 */
export function readRootPagination(
  meta: PaginationMeta | null | undefined,
  defaults: { pageSize: number },
): InternalPagination {
  return {
    page: Math.max(0, (meta?.page ?? 1) - 1),
    pageSize: meta?.pageSize ?? defaults.pageSize,
    total: meta?.total ?? 0,
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
 * 后端返回的 data 字段可能是数组本身,也可能是 { data: [...] } 包络
 * (历史原因:某些 endpoint 走 ApiResponse 自动解包,某些没有)。
 * 这层统一处理两种 shape,返回真正的 items 数组。
 */
export function extractItems<T>(rawData: unknown): T[] {
  if (Array.isArray(rawData)) return rawData as T[]
  const wrapped = rawData as { data?: T[] } | null | undefined
  return Array.isArray(wrapped?.data) ? (wrapped!.data as T[]) : []
}