import { get } from "@/lib/api"
import type {
  ResearchAnalysisItem,
  ResearchAnalysisDetail,
} from "@/features/content/research-analysis/types"
import type { PaginationMeta } from "@/lib/paginated-response"

export interface ResearchListEnvelope {
  data: ResearchAnalysisItem[]
  meta: PaginationMeta | undefined
}

export const researchApi = {
  /**
   * Get research analysis list
   */
  getResearchAnalysis: (
    page: number,
    pageSize: number,
    filters?: {
      valueRating?: string;
      keyword?: string;
      dateFrom?: string;
      dateTo?: string;
      sortBy?: string;
      sortOrder?: string;
    }
  ): Promise<ResearchListEnvelope> => {
    const searchParams = new URLSearchParams()
    searchParams.set("page", String(page))
    searchParams.set("pageSize", String(pageSize))

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value === undefined || value === null || value === "") return
        // Server DTO expects uppercase sortOrder (enum: ASC | DESC).
        const v =
          key === "sortOrder" ? String(value).toUpperCase() : String(value)
        searchParams.set(key, v)
      })
    }

    // 直接转发后端的 { data: items[], meta: { total, page, pageSize } } 包络。
    // 调用方各自消费 res.data (items) 和 res.meta (分页元数据) —
    // 见 @/lib/paginated-response 的 extractItems / readRootPagination。
    return get<ResearchAnalysisItem[]>(
      `/v1/research-analysis?${searchParams.toString()}`,
    ).then((response) => ({
      data: Array.isArray(response.data) ? response.data : [],
      meta: response.meta,
    }))
  },

  /**
   * Get research analysis detail by id
   */
  getResearchAnalysisDetail: (id: number): Promise<ResearchAnalysisDetail | null> =>
    get<{ data: ResearchAnalysisDetail }>(`/v1/research-analysis/${id}`)
      .then(response => {
        if (response.data && typeof response.data === 'object' && 'data' in response.data) {
          return (response.data as { data: ResearchAnalysisDetail }).data
        }
        return response.data as ResearchAnalysisDetail
      })
      .catch(() => null),
}
