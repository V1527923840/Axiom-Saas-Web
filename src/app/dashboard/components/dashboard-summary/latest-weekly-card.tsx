import { useState } from 'react'
import { addDays, format, parseISO } from 'date-fns'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useLatestReports } from '@/hooks/use-daily-summary'
import { SourcesDrawer } from '@/app/dashboard/components/report-drawer'
import { SectionsWeekly } from './sections-weekly'
import { SourcesButton } from './sources-button'

/**
 * Render the "[start - end]" range shown in the weekly card header.
 * Weekly reports always cover a 7-day window, so the end date is
 * `weekStart + 6 days`. Falls back to `reportDate` when the row is
 * missing `weekStart` (defensive — current service always sets it for
 * frequency='weekly', but the type allows null).
 */
function formatWeeklyRange(weekStart: string | null, reportDate: string): string {
  const start = weekStart ?? reportDate
  const end = format(addDays(parseISO(start), 6), 'yyyy-MM-dd')
  return `${start} - ${end}`
}

export function LatestWeeklyCard() {
  const { report, loading, error } = useLatestReports('weekly')
  const [open, setOpen] = useState(false)

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>📅 本周周报</CardTitle>
            {report ? (
              <span className="text-xs text-muted-foreground">
                {formatWeeklyRange(report.weekStart, report.reportDate)}
              </span>
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-64 w-full" />
          ) : error ? (
            <Alert variant="destructive">
              <AlertTitle>加载最新周报失败</AlertTitle>
              <AlertDescription>{error.message}</AlertDescription>
            </Alert>
          ) : !report ? (
            <p className="text-sm text-muted-foreground">暂无最新周报</p>
          ) : (
            <SectionsWeekly sections={report.sections} />
          )}
        </CardContent>
        {report ? (
          <CardContent className="flex items-center justify-between border-t pt-4">
            <span className="text-xs text-muted-foreground">
              🔗 {report.sourcePostCount} post / {report.sourceResearchCount} research
            </span>
            <SourcesButton
              count={report.sourcePostCount + report.sourceResearchCount}
              onClick={() => setOpen(true)}
              expanded={open}
            />
          </CardContent>
        ) : null}
      </Card>
      <SourcesDrawer
        reportId={report?.reportId ?? null}
        open={open}
        onOpenChange={setOpen}
        header={
          report
            ? { frequency: 'weekly', reportDate: report.reportDate }
            : undefined
        }
      />
    </>
  )
}
