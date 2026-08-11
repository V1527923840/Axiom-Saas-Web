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
  sourceFileUrl?: string | null
}

export interface SourcesResponse {
  posts: ContentItemMeta[]
  research: ContentItemMeta[]
}

export interface DailySummaryListResponse {
  data: DailySummary[]
  total: number
  page: number
  pageSize: number
}

export interface ListDailySummariesParams {
  frequency?: Frequency
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
): Promise<ApiResponse<SourcesResponse>> {
  return get<SourcesResponse>(`${BASE}/${reportId}/sources`, {
    token: token || undefined,
  })
}
