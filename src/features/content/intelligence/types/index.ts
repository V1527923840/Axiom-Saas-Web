// Intelligence (ZSXQ) Types — pyramid-view schema

// Stock mapping
export interface MentionedStock {
  name: string;
}

// API response item (list view)
export interface IntelligenceItem {
  id: string;
  title: string;
  author: string;
  groupName: string;
  summary: string;
  postDate: string;
  createdAt: string;
  categoryL1: string;
  categoryL2: string;
  swIndustryTag: string[];
  stockMapping: {
    mentionedStocks: MentionedStock[];
  };
  coreView?: Record<string, unknown> | null;
  pyramidVersion?: string | null;
  classificationMethod?: string | null;
  originalTextRaw?: string;
}

// Full detail item
export interface IntelligenceDetail extends IntelligenceItem {
  scrapeLogId: string;
  sourceFileKey: string;
  version: string;
  originalText: string;
  imageUrls?: string[] | null;
  expectationGap: Record<string, unknown>;
  // Pyramid-view
  rawFacts?: Record<string, unknown> | null;
  inductionGroups?: Record<string, unknown> | null;
  baseView?: Record<string, unknown> | null;
  midView?: Record<string, unknown> | null;
  pyramidJudgement?: Record<string, unknown> | null;
  updatedAt: string;
}

// Query params for intelligence posts
export interface IntelligenceQueryParams {
  page?: number;
  pageSize?: number;
  categoryL1?: string;
  categoryL2?: string;
  company?: string;
  keyword?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: 'postDate' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

// List response interface
export interface ListResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

// Category L1 options
export const CATEGORY_L1_OPTIONS = [
  'INDUSTRY',
  'COMPANY',
  'MACRO',
  'NEWS',
  'RESEARCH',
  'TRADING',
  'CONCEPT',
] as const;
export type CategoryL1 = typeof CATEGORY_L1_OPTIONS[number];