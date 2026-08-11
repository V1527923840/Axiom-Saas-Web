import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LatestWeeklyCard } from './latest-weekly-card'
import * as hooks from '@/hooks/use-daily-summary'
import type { DailySummary } from '@/services/daily-summary'

// ReportDrawer (mounted alongside the card) pulls useReportDetail/useReportSources
// from the same module — give them default stubs so the card test stays isolated
// from drawer behavior. The card itself never opens the drawer in these tests.
vi.mock('@/hooks/use-daily-summary', () => ({
  useLatestReports: vi.fn(),
  useReportDetail: vi.fn(() => ({ report: null, loading: false, error: null })),
  useReportSources: vi.fn(() => ({ sources: null, loading: false, error: null })),
}))

describe('LatestWeeklyCard', () => {
  it('shows loading skeleton', () => {
    vi.mocked(hooks.useLatestReports).mockReturnValue({ report: null, loading: true, error: null, refresh: () => {} })
    render(<LatestWeeklyCard />)
    expect(document.querySelector('[class*="animate-pulse"], [data-slot="skeleton"]')).toBeTruthy()
  })

  it('shows empty state when no data', () => {
    vi.mocked(hooks.useLatestReports).mockReturnValue({ report: null, loading: false, error: null, refresh: () => {} })
    render(<LatestWeeklyCard />)
    expect(screen.getByText('暂无最新周报')).toBeInTheDocument()
  })

  it('renders weekly events when report is present', () => {
    const report = {
      reportId: 'w1',
      frequency: 'weekly',
      reportDate: '2026-08-11',
      weekStart: '2026-08-10',
      isFinal: true,
      isLatest: true,
      revision: 1,
      completenessRatio: '0.88',
      hasDataWarning: false,
      sourcePostIds: [],
      sourceResearchIds: [],
      sourcePostCount: 5,
      sourceResearchCount: 2,
      dataWindowStart: '2026-08-04',
      dataWindowEnd: '2026-08-11',
      sections: {
        weekly_events: [
          { title: '事件 X 爆发', summary: '…', impact_level: 'high' },
        ],
      },
      triggerReason: 'scheduled',
      buildPromptVersion: 'v1',
      buildModel: 'test',
      hasTopics: false,
      topics: null,
      briefSummaryMd: null,
      generatedAt: '2026-08-11T00:00:00.000Z',
      lastDataCheckAt: '2026-08-11T00:00:00.000Z',
    }
    vi.mocked(hooks.useLatestReports).mockReturnValue({ report: report as DailySummary, loading: false, error: null, refresh: () => {} })
    render(<LatestWeeklyCard />)
    expect(screen.getByText('事件 X 爆发')).toBeInTheDocument()
    expect(screen.getByText(/查看来源 \(7\)/)).toBeInTheDocument()
  })

  it('shows error alert on error', () => {
    vi.mocked(hooks.useLatestReports).mockReturnValue({ report: null, loading: false, error: new Error('boom'), refresh: () => {} })
    render(<LatestWeeklyCard />)
    expect(screen.getByText('加载最新周报失败')).toBeInTheDocument()
    expect(screen.getByText('boom')).toBeInTheDocument()
  })
})
