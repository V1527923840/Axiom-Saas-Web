import { useState, useCallback } from "react"
import { get, post } from "@/lib/api"
import type { EtlFileItem, EtlJob, EtlImportOptions, EtlImportResponse, ListResponse, EtlJobsQueryParams } from "../types"
import { useAuth } from "@/contexts/auth-context"

export function useEtlFiles() {
  const { token } = useAuth()
  const [files, setFiles] = useState<EtlFileItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchFiles = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await get<{ data: EtlFileItem[], total: number }>("/v1/etl/files", {
        token: token ?? undefined,
      })
      const data = response.data
      setFiles(Array.isArray(data) ? data : (data?.data || []))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch files")
    } finally {
      setLoading(false)
    }
  }, [token])

  return { files, loading, error, fetchFiles }
}

export function useEtlImport() {
  const { token } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const importFiles = useCallback(async (
    files: string[],
    options: EtlImportOptions = {}
  ): Promise<EtlImportResponse> => {
    setLoading(true)
    setError(null)
    try {
      const response = await post<EtlImportResponse>("/v1/etl/import", {
        files,
        options,
      }, token ?? undefined)
      return response.data
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to import files"
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [token])

  return { importFiles, loading, error }
}

export function useEtlJobs() {
  const { token } = useAuth()
  const [jobs, setJobs] = useState<EtlJob[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState({
    page: 0,
    pageSize: 20,
    total: 0,
  })

  const fetchJobs = useCallback(async (params: EtlJobsQueryParams = {}) => {
    setLoading(true)
    setError(null)
    try {
      const page = (params.page ?? 0) + 1
      const pageSize = params.pageSize ?? 20
      const queryParams: Record<string, string | number> = { page, pageSize }
      if (params.status) queryParams.status = params.status
      if (params.dateFrom) queryParams.dateFrom = params.dateFrom
      if (params.dateTo) queryParams.dateTo = params.dateTo

      const response = await get<{ data: EtlJob[], total: number, page: number, pageSize: number }>(
        "/v1/etl/jobs",
        { params: queryParams, token: token ?? undefined }
      )
      const rawData = response.data as { data?: EtlJob[], total?: number, page?: number, pageSize?: number }
      const jobsData = Array.isArray(rawData) ? rawData : (rawData?.data || [])
      setJobs(jobsData)
      setPagination({
        page: response.page ?? 1,
        pageSize: response.pageSize ?? 20,
        total: response.total ?? 0,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch jobs")
    } finally {
      setLoading(false)
    }
  }, [token])

  const getJob = useCallback(async (jobId: string): Promise<EtlJob | null> => {
    setLoading(true)
    setError(null)
    try {
      const response = await get<EtlJob>(`/v1/etl/jobs/${jobId}`, {
        token: token ?? undefined,
      })
      return response.data
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get job")
      return null
    } finally {
      setLoading(false)
    }
  }, [token])

  return { jobs, loading, error, pagination, fetchJobs, getJob }
}

export function useJobStatus() {
  const { token } = useAuth()
  const [job, setJob] = useState<EtlJob | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pollJobStatus = useCallback(async (jobId: string): Promise<EtlJob | null> => {
    try {
      const response = await get<EtlJob>(`/v1/etl/jobs/${jobId}`, {
        token: token ?? undefined,
      })
      setJob(response.data)
      return response.data
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to poll job status")
      return null
    }
  }, [token])

  return { job, loading, error, pollJobStatus }
}