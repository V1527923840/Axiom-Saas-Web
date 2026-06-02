import { get } from "@/lib/api"
import type {
  AudioInterpretationItem,
  ListResponse,
  ContentCategory,
} from "@/features/content/types"
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
}