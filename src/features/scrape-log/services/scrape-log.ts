import { get } from "@/lib/api"
import type { ScrapeLogItem, ScrapeLogQueryParams } from "../types"

export const scrapeLogApi = {
  getScrapeLogs: async (
    page: number = 1,
    limit: number = 10,
    params?: ScrapeLogQueryParams,
    token?: string | null
  ) => {
    const queryParams = new URLSearchParams()
    queryParams.append('page', String(page))
    queryParams.append('limit', String(limit))
    if (params?.status) queryParams.append('status', params.status)
    if (params?.source) queryParams.append('source', params.source)

    return get<{ data: ScrapeLogItem[]; total: number; page: number; pageSize: number }>(
      `/v1/scrape-log?${queryParams.toString()}`,
      token ? { token } : {}
    )
  },

  getScrapeLog: async (id: string, token?: string | null) => {
    return get<ScrapeLogItem>(`/v1/scrape-log/${id}`, token ? { token } : {})
  },
}