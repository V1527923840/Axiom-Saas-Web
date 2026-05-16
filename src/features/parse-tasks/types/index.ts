export interface ParseTaskItem {
  id: string
  task_id: string
  source: string
  version: string
  status: 'pending' | 'running' | 'success' | 'partial' | 'failed'
  source_file_key: string
  output_json_key?: string
  output_md_key?: string
  entry_count?: number
  confidence?: number
  error_message?: string
  retry_count?: number
  parser?: string
  parse_duration_ms?: number
  started_at?: string
  completed_at?: string
  created_at: string
  updated_at: string
}

export interface ParseTaskDetail extends ParseTaskItem {
  scrape_log_id: string
  extraction_log_id?: string
  source_filename: string
  metadata?: Record<string, unknown>
}

export interface VersionItem {
  source: string
  version: string
  file_count: number
  latest_parse_status?: string
  created_at: string
}

export interface VersionFile {
  filename: string
  osspath: string
  size?: number
  created_at: string
}

export interface CreateTaskRequest {
  source: string
  version: string
  source_file_key: string
  execute_immediately?: boolean
}