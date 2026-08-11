import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useAuth } from '@/contexts/auth-context'
import * as svc from '@/services/daily-summary'
import type { AuthContextType } from '@/contexts/auth-context'
import { useLatestReports, useReportHistory, useReportDetail, useReportSources } from './use-daily-summary'

vi.mock('@/contexts/auth-context', () => ({ useAuth: vi.fn() }))
vi.mock('@/services/daily-summary', () => ({
  getLatestDailySummary: vi.fn(),
  listDailySummaries: vi.fn(),
  getDailySummary: vi.fn(),
  getDailySummarySources: vi.fn(),
}))

type AuthStub = Pick<AuthContextType, 'token'>

beforeEach(() => {
  vi.mocked(useAuth).mockReturnValue({ token: 'tok' } as AuthStub)
  vi.mocked(svc.getLatestDailySummary).mockReset()
  vi.mocked(svc.listDailySummaries).mockReset()
  vi.mocked(svc.getDailySummary).mockReset()
  vi.mocked(svc.getDailySummarySources).mockReset()
})

describe('useLatestReports', () => {
  it('fetches and returns the report on success', async () => {
    const report = { reportId: 'r1', frequency: 'daily' }
    vi.mocked(svc.getLatestDailySummary).mockResolvedValue({ data: report })
    const { result } = renderHook(() => useLatestReports('daily'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.report).toEqual(report)
    expect(result.current.error).toBeNull()
  })

  it('captures error on failure', async () => {
    vi.mocked(svc.getLatestDailySummary).mockRejectedValue(new Error('boom'))
    const { result } = renderHook(() => useLatestReports('daily'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.report).toBeNull()
    expect(result.current.error?.message).toBe('boom')
  })
})

describe('useReportHistory', () => {
  it('returns list and pagination', async () => {
    // listDailySummaries returns DailySummaryListResponse directly (flattened from the
    // server's { data, meta } envelope by the service wrapper), not wrapped in ApiResponse.
    vi.mocked(svc.listDailySummaries).mockResolvedValue({
      data: [{ reportId: 'r1' }],
      total: 1,
      page: 0,
      pageSize: 20,
    })
    const { result } = renderHook(() => useReportHistory({ frequency: 'daily', page: 0, pageSize: 20 }))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.items).toHaveLength(1)
    expect(result.current.total).toBe(1)
  })
})

describe('useReportDetail', () => {
  it('skips fetch when reportId is null', async () => {
    const { result } = renderHook(() => useReportDetail(null))
    expect(svc.getDailySummary).not.toHaveBeenCalled()
    expect(result.current.report).toBeNull()
  })

  it('fetches when reportId is set', async () => {
    const report = { reportId: 'r1' }
    vi.mocked(svc.getDailySummary).mockResolvedValue({ data: report })
    const { result } = renderHook(() => useReportDetail('r1'))
    await waitFor(() => expect(result.current.report).toEqual(report))
  })
})

describe('useReportSources', () => {
  it('fetches sources when reportId is set', async () => {
    const sources = { posts: [], research: [] }
    vi.mocked(svc.getDailySummarySources).mockResolvedValue({ data: sources })
    const { result } = renderHook(() => useReportSources('r1'))
    await waitFor(() => expect(result.current.sources).toEqual(sources))
  })
})
