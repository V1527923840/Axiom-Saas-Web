// src/features/industry-chain/types/index.ts

export interface L1Item {
  code: string
  name: string
  chainCount: number
}

export interface L2Item {
  code: string
  name: string
  chainCount: number
}

export interface ChainItem {
  slug: string
  name: string
  createTime: string
  versionCount: number
}

export interface VersionItem {
  id: number
  version: number
  createTime: string
  qiniuUrl: string
}

/**
 * Inner list envelope returned by the 4 lazy-load endpoints after the global
 * `TransformResponseInterceptor` wraps the controller's flat paginated payload.
 *
 * Wire shape (verified against the backend interceptor):
 *   { data: T[], meta: { total, page, pageSize } }
 *
 * Because `get<T>` already unwraps one layer (`response.data` = T), callers
 * access the items via `response.data.data` and pagination via
 * `response.data.meta.{total,page,pageSize}`.
 */
export interface ApiListResponse<T> {
  data: T[]
  meta: {
    total: number
    page: number
    pageSize: number
  }
}