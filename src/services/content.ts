// src/services/content.ts
import { get } from "@/lib/api"

// Note: The server's content category list schema isn't in api.d.ts yet
// (Task 7 generated an early snapshot that predates the content module's
// DTOs). The category objects returned by /v1/content/categories are typed
// loosely here until the server emits a generated ContentCategory schema.
// AudioInterpretationItem is the project-local feature type (see
// src/features/content/types).

type ContentCategoryDto = Record<string, unknown>

export interface ListResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}

type AudioInterpretationItemDto =
  import("@/features/content/types").AudioInterpretationItem

export const contentApi = {
  getCategories: () =>
    get<ContentCategoryDto[]>("/v1/content/categories"),

  getAudioInterpretation: (
    page: number,
    pageSize: number,
  ): Promise<ListResponse<AudioInterpretationItemDto>> =>
    get<ListResponse<AudioInterpretationItemDto>>(
      "/v1/content/audio-interpretation",
      { params: { page, pageSize } },
    ).then((response) => ({
      data: Array.isArray(response.data) ? response.data : [],
      total: response.meta?.total ?? 0,
      page: response.meta?.page ?? page,
      pageSize: response.meta?.pageSize ?? pageSize,
    })),
}