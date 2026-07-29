import { get } from "@/lib/api"
import type {
  ResearchAnalysisItem,
  ResearchAnalysisDetail,
  ListResponse,
} from "@/features/content/research-analysis/types"

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
  ): Promise<ListResponse<ResearchAnalysisItem>> => {
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

    return get<ResearchAnalysisItem[]>(
      `/v1/research-analysis?${searchParams.toString()}`,
    ).then(response => {
      const data = Array.isArray(response.data) ? response.data : []
      return {
        data,
        total: response.meta?.total ?? 0,
        page: response.meta?.page ?? page,
        pageSize: response.meta?.pageSize ?? pageSize,
      }
    })
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