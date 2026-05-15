export interface ScrapeLogItem {
  id: string
  source: string
  targettime: string
  status: 'pending' | 'running' | 'success' | 'failed'
  filecount: number
  postcount: number
  latestposttime: string | null
  osspath: string | null
  errormessage: string | null
  startedat: string
  completedat: string | null
  createdat: string
  updatedat: string
}

export interface ScrapeLogQueryParams {
  page?: number
  limit?: number
  status?: string
  source?: string
}