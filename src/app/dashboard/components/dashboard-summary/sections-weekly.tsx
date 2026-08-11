import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"

type ImpactLevel = "high" | "medium" | "low"

type WeeklyEvent = {
  title: string
  summary: string
  category?: string
  event_id?: string
  impact_level?: ImpactLevel
  last_seen_date?: string
  first_seen_date?: string
  frequency_in_daily?: number
  source_daily_report_ids?: string[]
}

function isWeeklyShape(x: unknown): x is { weekly_events: WeeklyEvent[] } {
  return (
    !!x && typeof x === "object" && Array.isArray((x as { weekly_events?: unknown }).weekly_events)
  )
}

const impactVariant: Record<
  ImpactLevel,
  "default" | "secondary" | "destructive"
> = {
  high: "destructive",
  medium: "default",
  low: "secondary",
}

export function SectionsWeekly({ sections }: { sections: unknown }) {
  if (!isWeeklyShape(sections)) {
    return (
      <Alert>
        <AlertTitle>报告内容格式异常，请联系管理员</AlertTitle>
        <AlertDescription>
          {import.meta.env.DEV && (
            <pre className="text-xs overflow-auto max-h-64">
              {JSON.stringify(sections, null, 2)}
            </pre>
          )}
        </AlertDescription>
      </Alert>
    )
  }
  const events = sections.weekly_events
  return (
    <ol className="space-y-3 list-decimal pl-5">
      {events.map((e, i) => (
        <li key={i} className="text-sm">
          <div className="flex items-center gap-2">
            <span className="font-medium">{e.title}</span>
            {e.category ? (
              <Badge variant="secondary">{e.category}</Badge>
            ) : null}
            {e.impact_level ? (
              <Badge variant={impactVariant[e.impact_level]}>
                {e.impact_level}
              </Badge>
            ) : null}
            {typeof e.frequency_in_daily === "number" ? (
              <span className="text-xs text-muted-foreground">
                出现 {e.frequency_in_daily} 次
              </span>
            ) : null}
          </div>
          <p className="text-muted-foreground mt-1 whitespace-pre-wrap">
            {e.summary}
          </p>
          {e.first_seen_date || e.last_seen_date ? (
            <p className="text-xs text-muted-foreground mt-1">
              {e.first_seen_date ?? "?"} ~ {e.last_seen_date ?? "?"}
            </p>
          ) : null}
        </li>
      ))}
    </ol>
  )
}
