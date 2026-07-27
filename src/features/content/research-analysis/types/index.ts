// Research Analysis Types — pyramid-view schema

// Stock mapping
export interface MentionedStock {
  name: string;
}

// API response item (list view)
export interface ResearchAnalysisItem {
  id: number;
  documentName: string;
  keyThesis: string;
  analyzedAt: string;
  createdAt: string;
  categoryL1: string;
  categoryL2: string;
  swIndustryTag: Record<string, any>[];
  mentionedStocks: Record<string, any>[];
  coreView?: Record<string, unknown> | null;
  pyramidVersion?: string | null;
}

// Full detail item
export interface ResearchAnalysisDetail extends ResearchAnalysisItem {
  version: string;
  docType: string;
  sourceFileKey: string;
  ossUrl?: string | null;
  localPath?: string | null;
  scrapeLogId: string;
  // Pyramid-view
  rawFacts?: Record<string, unknown> | null;
  inductionGroups?: Record<string, unknown> | null;
  baseView?: Record<string, unknown> | null;
  midView?: Record<string, unknown> | null;
  pyramidJudgement?: Record<string, unknown> | null;
  analysisVersion: string;
  updatedAt: string;
}

// Query params for research analysis
export interface ResearchAnalysisQueryParams {
  page?: number;
  pageSize?: number;
  categoryL1?: string;
  categoryL2?: string;
  keyword?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: 'analyzedAt' | 'createdAt';
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