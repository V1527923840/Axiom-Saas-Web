// Base content item interface
export interface BaseContentItem {
  id: string
  title: string
  summary: string
  collectedAt: string
  createdAt: string
}

// Daily News specific
export interface DailyNewsItem extends BaseContentItem {
  originalContent: string
  images: string[]
  refinedSummary: string
}

// Audio Interpretation specific
export interface AudioInterpretationItem extends BaseContentItem {
  audioUrl: string
  transcript: string
  refinedSummary: string
}

// Institution Reports specific
export interface InstitutionReportsItem extends BaseContentItem {
  transcript: string
  refinedSummary: string
  pdfUrl: string
}

// List response interface
export interface ListResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}

// Content category type
export type ContentCategory = 'daily-news' | 'audio-interpretation' | 'institution-reports'