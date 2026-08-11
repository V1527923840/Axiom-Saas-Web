import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import {
  getDailySummary,
  getDailySummarySources,
  getLatestDailySummary,
  listDailySummaries,
  type DailySummary,
  type Frequency,
  type SourcesResponse,
} from '@/services/daily-summary'

export function useLatestReports(frequency: Frequency) {
  const { token } = useAuth()
  const [report, setReport] = useState<DailySummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [tick, setTick] = useState(0)
  const refresh = useCallback(() => setTick((n) => n + 1), [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    getLatestDailySummary(token, frequency)
      .then((r) => { if (!cancelled) setReport(r.data ?? null) })
      .catch((e) => { if (!cancelled) setError(e as Error) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [token, frequency, tick])

  return { report, loading, error, refresh }
}

export function useReportHistory(params: { frequency?: Frequency; page: number; pageSize: number }) {
  const { token } = useAuth()
  const [items, setItems] = useState<DailySummary[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [tick, setTick] = useState(0)
  const refresh = useCallback(() => setTick((n) => n + 1), [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    listDailySummaries(token, params)
      .then((r) => {
        if (cancelled) return
        // r is DailySummaryListResponse directly (flattened by the service wrapper,
        // not wrapped in ApiResponse — see Task 7 report for the interceptor context).
        setItems(r.data ?? [])
        setTotal(r.total ?? 0)
      })
      .catch((e) => { if (!cancelled) setError(e as Error) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
    // params is the caller's object — we depend on its primitive fields, not its
    // reference, so an unstable object identity from the parent doesn't refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, params.frequency, params.page, params.pageSize, tick])

  return { items, total, page: params.page, pageSize: params.pageSize, loading, error, refresh }
}

export function useReportDetail(reportId: string | null) {
  const { token } = useAuth()
  const [report, setReport] = useState<DailySummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!reportId) {
      setReport(null)
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    getDailySummary(token, reportId)
      .then((r) => { if (!cancelled) setReport(r.data) })
      .catch((e) => { if (!cancelled) setError(e as Error) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [token, reportId])

  return { report, loading, error }
}

export function useReportSources(reportId: string | null) {
  const { token } = useAuth()
  const [sources, setSources] = useState<SourcesResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!reportId) {
      setSources(null)
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    getDailySummarySources(token, reportId)
      .then((r) => { if (!cancelled) setSources(r.data) })
      .catch((e) => { if (!cancelled) setError(e as Error) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [token, reportId])

  return { sources, loading, error }
}
