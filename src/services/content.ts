// src/services/content.ts
import { get } from "@/lib/api"
import type { PaginationMeta } from "@/lib/paginated-response"

// Note: The server's content category list schema isn't in api.d.ts yet
// (Task 7 generated an early snapshot that predates the content module's
// DTOs). The category objects returned by /v1/content/categories are typed
// loosely here until the server emits a generated ContentCategory schema.
// AudioInterpretationItem is the project-local feature type (see
// src/features/content/types).

type ContentCategoryDto = Record<string, unknown>

type AudioInterpretationItemDto =
  import("@/features/content/types").AudioInterpretationItem

export interface AudioInterpretationListEnvelope {
  data: AudioInterpretationItemDto[]
  meta: PaginationMeta | undefined
}

export const contentApi = {
  getCategories: () =>
    get<ContentCategoryDto[]>("/v1/content/categories"),

  // 直接转发后端的 { data: items[], meta: { total, page, pageSize } } 包络。
  // 调用方各自消费 res.data (items) 和 res.meta (分页元数据) —
  // 见 @/lib/paginated-response 的 extractItems / readRootPagination。
  getAudioInterpretation: (
    page: number,
    pageSize: number,
  ): Promise<AudioInterpretationListEnvelope> =>
    get<AudioInterpretationItemDto[]>(
      "/v1/content/audio-interpretation",
      { params: { page, pageSize } },
    ).then((response) => ({
      data: Array.isArray(response.data) ? response.data : [],
      meta: response.meta,
    })),
}