import { get, post, del } from "@/lib/api"
import type { ParseTaskItem, ParseTaskDetail, VersionItem, VersionFile, CreateTaskRequest } from "../types"

export interface ParseTaskListResponse {
  items: ParseTaskItem[]
  total: number
  limit: number
  offset: number
}

export interface VersionsResponse {
  versions: VersionItem[]
}

export interface VersionFilesResponse {
  files: VersionFile[]
}

export const parseTaskApi = {
  // Get parse task list
  getTasks: async (params?: {
    source?: string
    status?: string
    limit?: number
    offset?: number
  }): Promise<ParseTaskListResponse> => {
    const queryParams = new URLSearchParams()
    if (params?.source) queryParams.append('source', params.source)
    if (params?.status) queryParams.append('status', params.status)
    if (params?.limit) queryParams.append('limit', String(params.limit))
    if (params?.offset) queryParams.append('offset', String(params.offset))

    const response = await get<ParseTaskListResponse>(
      `/v1/parse/tasks${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    )
    return {
      items: Array.isArray(response.data?.items) ? response.data.items : [],
      total: response.data?.total ?? 0,
      limit: response.data?.limit ?? 50,
      offset: response.data?.offset ?? 0,
    }
  },

  // Get parse task detail
  getTask: async (taskId: string): Promise<ParseTaskDetail> => {
    const response = await get<ParseTaskDetail>(`/v1/parse/tasks/${taskId}`)
    return response.data
  },

  // Create parse task
  createTask: async (data: CreateTaskRequest): Promise<{ task_id: string; status: string; message: string }> => {
    const response = await post<{ task_id: string; status: string; message: string }>('/v1/parse/tasks', data)
    return response.data
  },

  // Execute parse task
  executeTask: async (taskId: string): Promise<{ task_id: string; status: string; agent_job_id: string }> => {
    const response = await post<{ task_id: string; status: string; agent_job_id: string }>(
      `/v1/parse/tasks/${taskId}/execute`
    )
    return response.data
  },

  // Delete parse task
  deleteTask: async (taskId: string): Promise<void> => {
    await del(`/v1/parse/tasks/${taskId}`)
  },

  // Get versions list
  getVersions: async (params?: { source?: string }): Promise<VersionsResponse> => {
    const queryParams = new URLSearchParams()
    if (params?.source) queryParams.append('source', params.source)

    // With auto-unwrap in api.ts, response.data is already the unwrapped { versions: [...] }
    const response = await get<{ versions: VersionItem[] }>(
      `/v1/versions${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    )
    return {
      versions: Array.isArray(response.data?.versions) ? response.data.versions : [],
    }
  },

  // Get version files
  getVersionFiles: async (source: string, version: string): Promise<VersionFilesResponse> => {
    const response = await get<{ files: VersionFile[] }>(
      `/v1/versions/${source}/files?version=${encodeURIComponent(version)}`
    )
    return {
      files: Array.isArray(response.data?.files) ? response.data.files : [],
    }
  },

  // Get available sources
  getSources: async (): Promise<{ sources: string[] }> => {
    const response = await get<{ sources: string[] }>('/v1/versions/sources')
    return {
      sources: Array.isArray(response.data?.sources) ? response.data.sources : [],
    }
  },
}