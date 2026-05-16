export interface VersionItem {
  source: string
  version: string
  fileCount: number
  latestParseStatus?: string
  createdAt: string
}

export interface VersionFile {
  key: string
  filename: string
  size: number
  lastModified: string
}