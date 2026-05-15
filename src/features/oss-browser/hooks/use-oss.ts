import { useState, useCallback } from 'react'
import { get, post } from '@/lib/api'
import type {
  OssItem,
  OssListResponse,
  OssDownloadResponse,
  OssUploadPresignResponse,
  OssDeleteResponse,
  OssMkdirResponse,
  OssQueryParams,
} from '../types'
import { useAuth } from '@/contexts/auth-context'

export function useOssList() {
  const { token } = useAuth()
  const [items, setItems] = useState<OssItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [marker, setMarker] = useState<string>('')
  const [isTruncated, setIsTruncated] = useState(false)
  const [currentPath, setCurrentPath] = useState<string>('/')

  const fetchList = useCallback(async (params: OssQueryParams = {}) => {
    setLoading(true)
    setError(null)
    try {
      const queryParams: Record<string, string | number | undefined> = {}
      if (params.path !== undefined) queryParams.path = params.path
      if (params.marker !== undefined) queryParams.marker = params.marker
      if (params.max_keys !== undefined) queryParams.max_keys = params.max_keys

      const response = await get<OssListResponse>('/v1/oss/list', {
        params: queryParams,
        token: token ?? undefined,
      })

      const data = response.data
      setItems(data?.items || [])
      setMarker(data?.marker || '')
      setIsTruncated(data?.is_truncated || false)
      setCurrentPath(data?.path || '/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch file list')
    } finally {
      setLoading(false)
    }
  }, [token])

  const loadMore = useCallback(async () => {
    if (!isTruncated && marker) {
      await fetchList({ path: currentPath, marker })
    }
  }, [fetchList, isTruncated, marker, currentPath])

  return { items, loading, error, fetchList, loadMore, marker, isTruncated, currentPath }
}

export function useOssDownload() {
  const { token } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getDownloadUrl = useCallback(async (key: string): Promise<OssDownloadResponse | null> => {
    setLoading(true)
    setError(null)
    try {
      const encodedKey = encodeURIComponent(key)
      const response = await get<OssDownloadResponse>(`/v1/oss/download/${encodedKey}`, {
        token: token ?? undefined,
      })
      return response.data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get download URL')
      return null
    } finally {
      setLoading(false)
    }
  }, [token])

  const downloadFile = useCallback(async (key: string) => {
    const result = await getDownloadUrl(key)
    if (result?.url) {
      window.open(result.url, '_blank')
    }
  }, [getDownloadUrl])

  return { downloadFile, loading, error }
}

export function useOssDelete() {
  const { token } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const deleteFiles = useCallback(async (keys: string[]): Promise<OssDeleteResponse | null> => {
    setLoading(true)
    setError(null)
    try {
      const response = await post<OssDeleteResponse>('/v1/oss/delete', { keys }, token ?? undefined)
      return response.data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete files')
      return null
    } finally {
      setLoading(false)
    }
  }, [token])

  return { deleteFiles, loading, error }
}

export function useOssMkdir() {
  const { token } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mkdir = useCallback(async (path: string): Promise<OssMkdirResponse | null> => {
    setLoading(true)
    setError(null)
    try {
      const response = await post<OssMkdirResponse>('/v1/oss/mkdir', { path }, token ?? undefined)
      return response.data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create directory')
      return null
    } finally {
      setLoading(false)
    }
  }, [token])

  return { mkdir, loading, error }
}

export function useOssUpload() {
  const { token } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getUploadUrl = useCallback(async (path: string, contentType?: string): Promise<OssUploadPresignResponse | null> => {
    setLoading(true)
    setError(null)
    try {
      const response = await post<OssUploadPresignResponse>('/v1/oss/upload/presign', {
        path,
        content_type: contentType,
      }, token ?? undefined)
      return response.data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get upload URL')
      return null
    } finally {
      setLoading(false)
    }
  }, [token])

  return { getUploadUrl, loading, error }
}