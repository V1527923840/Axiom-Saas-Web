import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import {
  getDailySummary,
  getDailySummarySources,
  getLatestDailySummary,
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
