// Intelligence (ZSXQ) Types

// Stock mapping
export interface MentionedStock {
  name: string
}

// API response item (list view)
export interface IntelligenceItem {
  id: string
  title: string
  author: string
  groupName: string
  summary: string
  postDate: string
  createdAt: string
  categoryL1: string
  categoryL2: string
  valueRating: string
  totalScore: number
  swIndustryTag: string[]
  stockMapping: {
    mentionedStocks: MentionedStock[]
  }
  originalTextRaw?: string
}

// Full detail item
export interface IntelligenceDetail extends IntelligenceItem {
  scrapeLogId: string
  sourceFileKey: string
  version: string
  originalText: string
  originalTextRaw?: string
  imageUrls?: string[] | null
  likeCount: number
  commentCount: number
  sourceCredibility: number
  timelinessScore: number
  dataDensity: number
  differentiationScore: number
  actionability: number
  riskDisclosure: number
  confidenceFactor: number
  expectationGap: Record<string, unknown>
  summaryPoints: string[]
  updatedAt: string
}

// Query params for intelligence posts
export interface IntelligenceQueryParams {
  page?: number
  pageSize?: number
  categoryL1?: string
  categoryL2?: string
  valueRating?: string
  company?: string
  keyword?: string
  dateFrom?: string
  dateTo?: string
  sortBy?: 'postDate' | 'createdAt' | 'totalScore'
  sortOrder?: 'asc' | 'desc'
}

// List response interface
export interface ListResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}

// Radar chart data point
export interface RadarChartDataPoint {
  dimension: string
  value: number
  fullMark?: number
}

// Dimension name mapping (Chinese)
export const DIMENSION_NAME_MAP: Record<string, string> = {
  sourceCredibility: '来源可信度',
  timelinessScore: '时效性评分',
  dataDensity: '数据密度',
  differentiationScore: '差异化评分',
  actionability: '可执行性',
  riskDisclosure: '风险揭示',
}

// Value rating options
export const VALUE_RATING_OPTIONS = ['高', '中', '低', '高风险'] as const
export type ValueRating = typeof VALUE_RATING_OPTIONS[number]

// Category L1 options
export const CATEGORY_L1_OPTIONS = [
  'INDUSTRY',
  'COMPANY',
  'MACRO',
  'NEWS',
  'RESEARCH',
  'TRADING',
  'CONCEPT',
] as const
export type CategoryL1 = typeof CATEGORY_L1_OPTIONS[number]