import { get } from "@/lib/api"
import type {
  DailyNewsItem,
  AudioInterpretationItem,
  InstitutionReportsItem,
  ListResponse,
  ContentCategory,
} from "@/features/content/types"
import type { SentimentPostItem } from "@/features/content/sentiment-posts/types"
import type { ApiResponse } from "@/lib/api"

export interface ContentCategoryResponse {
  categories: ContentCategory[]
}

export const contentApi = {
  /**
   * Get content categories
   */
  getCategories: () =>
    get<ApiResponse<ContentCategory[]>>("/v1/content/categories"),

  /**
   * Get daily news list
   */
  getDailyNews: (page: number, pageSize: number): Promise<ListResponse<DailyNewsItem>> =>
    get<{ data: DailyNewsItem[], total: number, page: number, pageSize: number }>(
      `/v1/content/daily-news?page=${page}&pageSize=${pageSize}`
    ).then(response => ({
      data: Array.isArray(response.data) ? response.data : (response.data?.data || []),
      total: response.data?.total || 0,
      page: response.data?.page || page,
      pageSize: response.data?.pageSize || pageSize,
    })),

  /**
   * Get audio interpretation list
   */
  getAudioInterpretation: (page: number, pageSize: number): Promise<ListResponse<AudioInterpretationItem>> =>
    get<{ data: AudioInterpretationItem[], total: number, page: number, pageSize: number }>(
      `/v1/content/audio-interpretation?page=${page}&pageSize=${pageSize}`
    ).then(response => ({
      data: Array.isArray(response.data) ? response.data : (response.data?.data || []),
      total: response.data?.total || 0,
      page: response.data?.page || page,
      pageSize: response.data?.pageSize || pageSize,
    })),

  /**
   * Get institution reports list
   */
  getInstitutionReports: (page: number, pageSize: number): Promise<ListResponse<InstitutionReportsItem>> =>
    get<{ data: InstitutionReportsItem[], total: number, page: number, pageSize: number }>(
      `/v1/content/institution-reports?page=${page}&pageSize=${pageSize}`
    ).then(response => ({
      data: Array.isArray(response.data) ? response.data : (response.data?.data || []),
      total: response.data?.total || 0,
      page: response.data?.page || page,
      pageSize: response.data?.pageSize || pageSize,
    })),

  /**
   * Get sentiment posts list
   */
  getSentimentPosts: (page: number, pageSize: number, params?: {
    sentiment?: string
    company?: string
    keyword?: string
    dateFrom?: string
    dateTo?: string
  }): Promise<ListResponse<SentimentPostItem>> => {
    const queryParams = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    })
    if (params?.sentiment) queryParams.set('sentiment', params.sentiment)
    if (params?.company) queryParams.set('company', params.company)
    if (params?.keyword) queryParams.set('keyword', params.keyword)
    if (params?.dateFrom) queryParams.set('dateFrom', params.dateFrom)
    if (params?.dateTo) queryParams.set('dateTo', params.dateTo)

    return get<{ data: SentimentPostItem[], total: number, page: number, pageSize: number }>(
      `/v1/content/sentiment-posts?${queryParams.toString()}`
    ).then(response => ({
      data: Array.isArray(response.data) ? response.data : (response.data?.data || []),
      total: response.data?.total || 0,
      page: response.data?.page || page,
      pageSize: response.data?.pageSize || pageSize,
    }))
  },
}
