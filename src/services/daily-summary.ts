// src/services/daily-summary.ts
import { get } from "@/lib/api"
import type { ApiResponse } from "@/lib/api"

export type Frequency = "daily" | "weekly"

export interface DailySummary {
  reportId: string
  frequency: Frequency
  reportDate: string
  weekStart: string | null
  isFinal: boolean
  isLatest: boolean
  revision: number
  dataWindowStart: string
  dataWindowEnd: string
  sections: unknown
  sourcePostIds: string[]
  sourceResearchIds: string[]
  sourcePostCount: number
  sourceResearchCount: number
  completenessRatio: string
  hasDataWarning: boolean
  triggerReason: string
  buildPromptVersion: string
  buildModel: string
  hasTopics: boolean
  topics: unknown
  briefSummaryMd: string | null
  generatedAt: string
  lastDataCheckAt: string
}

export interface ContentItemMeta {
  id: string
  title: string
  categoryCode: string
  publishDate: string
}

export interface SourcesResponse {
  posts: ContentItemMeta[]
  research: ContentItemMeta[]
  /** 去重后的帖文来源总数（不受 limit 截断）。 */
  postsTotal: number
  /** 去重后的研报来源总数（不受 limit 截断）。 */
  researchTotal: number
  /** 在源表中查不到的 id 合并去重后的列表。前端据此区分\"真缺失\"与标题恰好叫 (missing) 的行。 */
  missingIds: string[]
}

export interface DailySummaryListResponse {
  data: DailySummary[]
  total: number
  page: number
  pageSize: number
}

export interface ListDailySummariesParams {
  frequency?: Frequency
  /** Inclusive lower bound of reportDate range (YYYY-MM-DD). */
  dateFrom?: string
  /** Inclusive upper bound of reportDate range (YYYY-MM-DD). */
  dateTo?: string
  page?: number
  pageSize?: number
}

const BASE = "/v1/daily-summary"

export async function getLatestDailySummary(
  token: string | null,
  frequency: Frequency,
): Promise<ApiResponse<DailySummary | null>> {
  return get<DailySummary | null>(`${BASE}/latest`, {
    params: { frequency },
    token: token || undefined,
  })
}

/**
 * The server pairs `{ data, total, page, pageSize }` from the service with a
 * global TransformResponseInterceptor that hoists pagination into the envelope
 * `meta`, so the wire body is `{ data: DailySummary[], meta: { total, page,
 * pageSize } }`. This flattens it back into the shape callers expect.
 */
export async function listDailySummaries(
  token: string | null,
  params: ListDailySummariesParams = {},
): Promise<DailySummaryListResponse> {
  const page = params.page ?? 0
  const pageSize = params.pageSize ?? 20

  const response = await get<DailySummary[]>(BASE, {
    params: {
      ...(params.frequency ? { frequency: params.frequency } : {}),
      ...(params.dateFrom ? { dateFrom: params.dateFrom } : {}),
      ...(params.dateTo ? { dateTo: params.dateTo } : {}),
      page,
      pageSize,
    },
    token: token || undefined,
  })

  return {
    data: Array.isArray(response.data) ? response.data : [],
    total: response.meta?.total ?? 0,
    page: response.meta?.page ?? page,
    pageSize: response.meta?.pageSize ?? pageSize,
  }
}

export async function getDailySummary(
  token: string | null,
  reportId: string,
): Promise<ApiResponse<DailySummary>> {
  return get<DailySummary>(`${BASE}/${reportId}`, {
    token: token || undefined,
  })
}

export async function getDailySummarySources(
  token: string | null,
  reportId: string,
  params?: { limit?: number; offset?: number },
): Promise<ApiResponse<SourcesResponse>> {
  return get<SourcesResponse>(`${BASE}/${reportId}/sources`, {
    params: {
      ...(params?.limit !== undefined ? { limit: params.limit } : {}),
      ...(params?.offset !== undefined ? { offset: params.offset } : {}),
    },
    token: token || undefined,
  })
}
