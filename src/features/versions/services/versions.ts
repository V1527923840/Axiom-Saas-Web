import { get } from "@/lib/api"
import type { VersionItem, VersionFile } from "../types"

export interface VersionsResponse {
  versions: VersionItem[]
}

export interface VersionFilesResponse {
  files: VersionFile[]
}

export const versionsApi = {
  // Get versions list
  getVersions: async (params?: { source?: string }): Promise<VersionsResponse> => {
    const queryParams = new URLSearchParams()
    if (params?.source) queryParams.append('source', params.source)

    const endpoint = `/v1/versions${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    console.log('[versions] API call:', endpoint)
    const response = await get<VersionItem[]>(endpoint)
    console.log('[versions] raw response:', response)
    // API returns { data: [...], total, page, pageSize } so response.data is the array
    return {
      versions: Array.isArray(response.data) ? response.data : [],
    }
  },

  // Get version files
  getVersionFiles: async (source: string, version: string): Promise<VersionFilesResponse> => {
    const response = await get<{ data: VersionFile[]; total: number; page: number; pageSize: number }>(
      `/v1/versions/${source}/files?version=${encodeURIComponent(version)}`
    )
    return {
      files: Array.isArray(response.data?.data) ? response.data.data : [],
    }
  },
}