// Sentiment Posts Types

// Sentiment type
export type Sentiment = 'positive' | 'negative' | 'neutral'

// Company info
export interface Company {
  name: string
  code?: string | null
  context?: string
}

// Classification tag
export interface ClassificationTag {
  code: string
  name: string
  layer: 'carrier' | 'info_type' | 'financial'
}

// Sentiment Post item
export interface SentimentPostItem {
  id: string
  title: string
  summary?: string
  originalContent?: string
  contentTimestamp?: string
  sentiment?: Sentiment
  companies?: Company[]
  parser?: string
  entryIndex?: number
  entryId?: string
  sourceFile?: string
  classifications?: ClassificationTag[]
  metadata?: Record<string, unknown>
  collectedAt: string
  createdAt: string
}

// Query params for sentiment posts
export interface SentimentPostsQueryParams {
  page?: number
  pageSize?: number
  sentiment?: Sentiment
  company?: string
  keyword?: string
  dateFrom?: string
  dateTo?: string
}

// Post filters state
export interface PostFiltersState {
  sentiment: Sentiment | null
  company: string
  keyword: string
  dateFrom: string
  dateTo: string
}

// List response interface
export interface ListResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}