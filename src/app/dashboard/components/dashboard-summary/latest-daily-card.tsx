import { useState } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useLatestReports } from '@/app/dashboard/components/report-drawer/hooks/use-daily-summary'
import { SourcesDrawer } from '@/app/dashboard/components/report-drawer'
import { SectionsDaily } from './sections-daily'
import { SourcesButton } from './sources-button'

export function LatestDailyCard() {
  const { report, loading, error } = useLatestReports('daily')
  const [open, setOpen] = useState(false)

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>📅 今日日报</CardTitle>
            {report ? (
              <span className="text-xs text-muted-foreground">
                {report.reportDate}
              </span>
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-64 w-full" />
          ) : error ? (
            <Alert variant="destructive">
              <AlertTitle>加载最新日报失败</AlertTitle>
              <AlertDescription>{error.message}</AlertDescription>
            </Alert>
          ) : !report ? (
            <p className="text-sm text-muted-foreground">暂无最新日报</p>
          ) : (
            <SectionsDaily sections={report.sections} />
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
            ? { frequency: 'daily', reportDate: report.reportDate }
            : undefined
        }
      />
    </>
  )
}
