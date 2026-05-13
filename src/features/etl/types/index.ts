// ETL Types

// File item in the待入库 file list
export interface EtlFileItem {
  filename: string
  parser: string
  entryCount: number
  size: number
  modifiedAt: string
}

// ETL Job status
export type EtlJobStatus = 'pending' | 'processing' | 'completed' | 'failed'

// ETL Job record
export interface EtlJob {
  id: string
  sourceFile: string
  parser?: string
  totalItems: number
  successItems: number
  failedItems: number
  status: EtlJobStatus
  errorMessage?: string
  startedAt?: string
  completedAt?: string
  createdAt: string
}

// ETL Import request options
export interface EtlImportOptions {
  dryRun?: boolean
  batchSize?: number
}

// ETL Import response
export interface EtlImportResponse {
  jobId: string
  status: EtlJobStatus
  estimatedItems: number
  startedAt: string
}

// Pagination for ETL jobs list
export interface EtlJobsQueryParams {
  page?: number
  pageSize?: number
  status?: EtlJobStatus
  dateFrom?: string
  dateTo?: string
}

// List response interface
export interface ListResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}