import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { SectionsDaily } from "../dashboard-summary/sections-daily"
import { SectionsWeekly } from "../dashboard-summary/sections-weekly"
import type { DailySummary } from "@/services/daily-summary"

/**
 * `DailySummary.topics` is `unknown` (the column is free-form JSON). Accept both
 * the plain-string form and the `{ name }` object form, and drop anything else
 * rather than rendering `[object Object]`.
 */
function topicLabels(topics: unknown): string[] {
  if (!Array.isArray(topics)) return []
  return topics
    .map((t) => {
      if (typeof t === "string") return t
      if (t && typeof t === "object" && "name" in t) {
        const name = (t as { name: unknown }).name
        if (typeof name === "string") return name
      }
      return null
    })
    .filter((t): t is string => !!t)
}

export function ReportTab({
  report,
  loading,
  error,
}: {
  report: DailySummary | null
  loading: boolean
  error: Error | null
}) {
  if (loading) return <Skeleton className="h-64 w-full" />
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>加载失败</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    )
  }
  if (!report) return <p className="text-sm text-muted-foreground">无数据</p>

  const topics = report.hasTopics ? topicLabels(report.topics) : []

  return (
    <div className="space-y-4">
      {report.briefSummaryMd ? (
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
          {report.briefSummaryMd}
        </p>
      ) : null}
      {topics.length ? (
        <div className="flex flex-wrap gap-1">
          {topics.map((t, i) => (
            <Badge key={i} variant="secondary">
              {t}
            </Badge>
          ))}
        </div>
      ) : null}
      {report.frequency === "daily" ? (
        <SectionsDaily sections={report.sections} />
      ) : (
        <SectionsWeekly sections={report.sections} />
      )}
    </div>
  )
}
