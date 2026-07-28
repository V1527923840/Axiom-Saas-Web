// src/features/industry-chain/services/api.ts
import { get, type ApiResponse } from "@/lib/api"
import type {
  ApiListResponse,
  ChainItem,
  L1Item,
  L2Item,
  VersionItem,
} from "../types"

/**
 * 4 lazy-load endpoints for the industry chain tree.
 *
 * All requests use a fixed `page=1, pageSize=100` because the data set is
 * small (one industry has at most ~10 L2 sectors, each with a handful of
 * chains and versions). Server-side pagination exists for API consistency,
 * not for UI pagination — the tree hook will load each level once.
 *
 * `get<T>` from `@/lib/api` auto-injects the auth token and returns
 * `Promise<ApiResponse<T>>` where `ApiResponse<T> = { data: T, meta?: {...} }`.
 * The wire format (after the global `TransformResponseInterceptor`) is
 * `{ data: T[], meta: {...} }` — i.e. `T` here is the `ApiListResponse<T>`
 * envelope itself. Callers access items via `response.data.data` and
 * pagination via `response.data.meta.{total,page,pageSize}`.
 */
export const industryChainApi = {
  getL1List: (): Promise<ApiResponse<ApiListResponse<L1Item>>> =>
    get<ApiListResponse<L1Item>>("/v1/industry-chains/l1", {
      params: { page: 1, pageSize: 100 },
    }),

  getL2List: (l1: string): Promise<ApiResponse<ApiListResponse<L2Item>>> =>
    get<ApiListResponse<L2Item>>("/v1/industry-chains/l2", {
      params: { l1, page: 1, pageSize: 100 },
    }),

  getChains: (l2: string): Promise<ApiResponse<ApiListResponse<ChainItem>>> =>
    get<ApiListResponse<ChainItem>>("/v1/industry-chains/chains", {
      params: { l2, page: 1, pageSize: 100 },
    }),

  getVersions: (
    chain: string,
  ): Promise<ApiResponse<ApiListResponse<VersionItem>>> =>
    get<ApiListResponse<VersionItem>>("/v1/industry-chains/versions", {
      params: { chain, page: 1, pageSize: 100 },
    }),
}