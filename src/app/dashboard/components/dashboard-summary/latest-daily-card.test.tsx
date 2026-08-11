import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LatestDailyCard } from './latest-daily-card'
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

describe('LatestDailyCard', () => {
  it('shows loading skeleton', () => {
    vi.mocked(hooks.useLatestReports).mockReturnValue({ report: null, loading: true, error: null, refresh: () => {} })
    render(<LatestDailyCard />)
    expect(document.querySelector('[class*="animate-pulse"], [data-slot="skeleton"]')).toBeTruthy()
  })

  it('shows empty state when no data', () => {
    vi.mocked(hooks.useLatestReports).mockReturnValue({ report: null, loading: false, error: null, refresh: () => {} })
    render(<LatestDailyCard />)
    expect(screen.getByText('暂无最新日报')).toBeInTheDocument()
  })

  it('renders sections when report is present', () => {
    const report = {
      reportId: 'r1',
      frequency: 'daily',
      reportDate: '2026-08-11',
      weekStart: null,
      isFinal: true,
      isLatest: true,
      revision: 2,
      completenessRatio: '0.93',
      hasDataWarning: false,
      sourcePostIds: [],
      sourceResearchIds: [],
      sourcePostCount: 12,
      sourceResearchCount: 4,
      dataWindowStart: '2026-08-10',
      dataWindowEnd: '2026-08-11',
      sections: [
        { section_title: '宏观海外', section_content: '…' },
        { section_title: 'A 股行业聚焦', section_content: '…' },
      ],
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
    render(<LatestDailyCard />)
    expect(screen.getByText('宏观海外')).toBeInTheDocument()
    expect(screen.getByText('A 股行业聚焦')).toBeInTheDocument()
    expect(screen.getByText(/查看来源 \(16\)/)).toBeInTheDocument()
  })

  it('shows error alert on error', () => {
    vi.mocked(hooks.useLatestReports).mockReturnValue({ report: null, loading: false, error: new Error('boom'), refresh: () => {} })
    render(<LatestDailyCard />)
    expect(screen.getByText('加载最新日报失败')).toBeInTheDocument()
    expect(screen.getByText('boom')).toBeInTheDocument()
  })
})
