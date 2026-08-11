import { useState } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useLatestReports } from '@/hooks/use-daily-summary'
import { ReportDrawer } from '@/app/dashboard/components/report-drawer'
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
            <CardTitle>📅 Daily</CardTitle>
            {report ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{report.reportDate}</span>
                <Badge variant="outline">Rev {report.revision}</Badge>
                <Badge variant={report.isFinal ? 'default' : 'secondary'}>
                  {report.isFinal ? '✅ final' : '⚠️ draft'}
                </Badge>
                <span>完整性 {Number(report.completenessRatio).toFixed(2)}</span>
                {report.hasDataWarning ? <span className="text-destructive">⚠️</span> : null}
              </div>
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
            />
          </CardContent>
        ) : null}
      </Card>
      <ReportDrawer
        reportId={report?.reportId ?? null}
        open={open}
        onOpenChange={setOpen}
        initialTab="sources"
      />
    </>
  )
}
