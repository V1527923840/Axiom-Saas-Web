// Base content item interface
export interface BaseContentItem {
  id: string
  title: string
  summary: string
  collectedAt: string
  createdAt: string
}

// Audio Interpretation specific
export interface AudioInterpretationItem extends BaseContentItem {
  audioUrl: string
  transcript: string
  refinedSummary: string
}

// List response interface
export interface ListResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}

// Content category type
export type ContentCategory = 'audio-interpretation' | 'intelligence'