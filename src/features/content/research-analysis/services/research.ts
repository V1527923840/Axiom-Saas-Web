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
      categoryL1?: string;
      categoryL2?: string;
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
        if (value !== undefined && value !== null && value !== "") {
          searchParams.set(key, String(value))
        }
      })
    }

    return get<{
      data: ResearchAnalysisItem[];
      total: number;
      page: number;
      pageSize: number;
    }>(`/v1/research-analysis?${searchParams.toString()}`).then(response => {
      // API returns direct format: {data:[...], total, page, pageSize}
      // Some endpoints wrap in {success, data}, need to handle both
      const data = Array.isArray(response.data) ? response.data : (response.data?.data || [])
      return {
        data,
        total: response.total ?? 0,
        page: response.page ?? page,
        pageSize: response.pageSize ?? pageSize,
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