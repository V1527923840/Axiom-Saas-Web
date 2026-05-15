export interface OssItem {
  key: string
  size: number
  last_modified: string
  type: 'file' | 'dir'
  file_count?: number
}

export interface OssListResponse {
  path: string
  prefix: string
  marker: string
  max_keys: number
  is_truncated: boolean
  items: OssItem[]
}

export interface OssDownloadResponse {
  url: string
  expires_at: string
}

export interface OssUploadPresignResponse {
  url: string
  key: string
  expires_at: string
}

export interface OssDeleteResponse {
  deleted: string[]
  failed: string[]
}

export interface OssMkdirResponse {
  key: string
}

export interface OssQueryParams {
  path?: string
  marker?: string
  max_keys?: number
}