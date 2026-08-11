import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useAuth } from '@/contexts/auth-context'
import * as svc from '@/services/daily-summary'
import { useLatestReports, useReportDetail, useReportSources } from './use-daily-summary'
import type { DailySummary, SourcesResponse } from '@/services/daily-summary'

vi.mock('@/contexts/auth-context', () => ({ useAuth: vi.fn() }))
vi.mock('@/services/daily-summary', () => ({
  getLatestDailySummary: vi.fn(),
  listDailySummaries: vi.fn(),
  getDailySummary: vi.fn(),
  getDailySummarySources: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(useAuth).mockReturnValue({ token: 'tok' } as any)
  vi.mocked(svc.getLatestDailySummary).mockReset()
  vi.mocked(svc.listDailySummaries).mockReset()
  vi.mocked(svc.getDailySummary).mockReset()
  vi.mocked(svc.getDailySummarySources).mockReset()
})

describe('useLatestReports', () => {
  it('fetches and returns the report on success', async () => {
    const report = { reportId: 'r1', frequency: 'daily' } as unknown as DailySummary
    vi.mocked(svc.getLatestDailySummary).mockResolvedValue({ data: report } as any)
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

describe('useReportDetail', () => {
  it('skips fetch when reportId is null', async () => {
    const { result } = renderHook(() => useReportDetail(null))
    expect(svc.getDailySummary).not.toHaveBeenCalled()
    expect(result.current.report).toBeNull()
  })

  it('fetches when reportId is set', async () => {
    const report = { reportId: 'r1' } as unknown as DailySummary
    vi.mocked(svc.getDailySummary).mockResolvedValue({ data: report } as any)
    const { result } = renderHook(() => useReportDetail('r1'))
    await waitFor(() => expect(result.current.report).toEqual(report))
  })
})

describe('useReportSources', () => {
  it('fetches sources when reportId is set', async () => {
    const sources: SourcesResponse = { posts: [], research: [] }
    vi.mocked(svc.getDailySummarySources).mockResolvedValue({ data: sources } as any)
    const { result } = renderHook(() => useReportSources('r1'))
    await waitFor(() => expect(result.current.sources).toEqual(sources))
  })
})
