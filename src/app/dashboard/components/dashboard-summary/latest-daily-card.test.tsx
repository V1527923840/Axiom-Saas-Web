import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LatestDailyCard } from './latest-daily-card'
import * as hooks from '@/app/dashboard/components/report-drawer/hooks/use-daily-summary'
import type { DailySummary } from '@/services/daily-summary'

// SourcesDrawer (mounted alongside the card) does its own fetch via the
// service module — no hook stub needed here. The card itself never opens
// the drawer in these tests, so SourcesDrawer's child effects don't fire.
vi.mock('@/app/dashboard/components/report-drawer/hooks/use-daily-summary', () => ({
  useLatestReports: vi.fn(),
}))

// Track SourcesDrawer props without rendering the real Sheet — keeps the
// card test isolated from drawer behavior while still asserting the
// header metadata is plumbed through.
const sourcesDrawerSpy = vi.fn()
vi.mock('@/app/dashboard/components/report-drawer', () => ({
  SourcesDrawer: (props: unknown) => {
    sourcesDrawerSpy(props)
    return null
  },
}))

describe('LatestDailyCard', () => {
  beforeEach(() => {
    sourcesDrawerSpy.mockClear()
  })

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

    // SourcesDrawer must receive the metadata from the same report the card
    // renders, not an extra fetch.
    const lastCall = sourcesDrawerSpy.mock.calls.at(-1)?.[0] as {
      reportId: string | null
      header?: { frequency: string; reportDate: string }
    }
    expect(lastCall.reportId).toBe('r1')
    expect(lastCall.header).toEqual({
      frequency: 'daily',
      reportDate: '2026-08-11',
    })
  })

  it('passes no header when the report has not loaded yet', () => {
    vi.mocked(hooks.useLatestReports).mockReturnValue({ report: null, loading: true, error: null, refresh: () => {} })
    render(<LatestDailyCard />)
    const lastCall = sourcesDrawerSpy.mock.calls.at(-1)?.[0] as { header?: unknown }
    expect(lastCall.header).toBeUndefined()
  })

  it('shows error alert on error', () => {
    vi.mocked(hooks.useLatestReports).mockReturnValue({ report: null, loading: false, error: new Error('boom'), refresh: () => {} })
    render(<LatestDailyCard />)
    expect(screen.getByText('加载最新日报失败')).toBeInTheDocument()
    expect(screen.getByText('boom')).toBeInTheDocument()
  })
})
