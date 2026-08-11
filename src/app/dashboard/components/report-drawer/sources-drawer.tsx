import { useReportSources } from "@/hooks/use-daily-summary"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { SourcesTab } from "./sources-tab"

/**
 * Sources-only drawer used by the dashboard's "今日日报 / 本周周报" cards.
 *
 * Different from <ReportDrawer> in three ways:
 *   - No tabs (the report body is already on the card above; the drawer
 *     is meant to surface the underlying posts / research only).
 *   - Skips `useReportDetail` — header metadata (frequency, date, revision)
 *     comes from the parent via the `header` prop, sourced from the same
 *     `useLatestReports(frequency)` call that populated the card.
 *   - Single `useReportSources` request.
 */
export function SourcesDrawer({
  reportId,
  open,
  onOpenChange,
  header,
}: {
  reportId: string | null
  open: boolean
  onOpenChange: (b: boolean) => void
  header?: {
    frequency: "daily" | "weekly"
    reportDate: string
    revision: number
  }
}) {
  // Passing null while closed keeps the hook from firing a request for a
  // drawer the user can't see — mirrors the same guard in ReportDrawer.
  const activeId = open ? reportId : null
  const { sources, loading, error } = useReportSources(activeId)

  const title = header
    ? header.frequency === "weekly"
      ? "周报详情"
      : "日报详情"
    : "来源详情"
  const description = header
    ? `${header.reportDate} · Rev ${header.revision}`
    : "加载中…"

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl lg:max-w-3xl overflow-y-auto"
      >
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-4">
          <SourcesTab sources={sources} loading={loading} error={error} />
        </div>
      </SheetContent>
    </Sheet>
  )
}
