import { useEffect, useState } from "react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useReportDetail } from "./hooks/use-daily-summary"
import { ReportTab } from "./report-tab"
import { SourcesTab } from "./sources-tab"
export { SourcesDrawer } from "./sources-drawer"

type DrawerTab = "report" | "sources"

export function ReportDrawer({
  reportId,
  open,
  onOpenChange,
  initialTab = "report",
}: {
  reportId: string | null
  open: boolean
  onOpenChange: (b: boolean) => void
  initialTab?: DrawerTab
}) {
  const [tab, setTab] = useState<DrawerTab>(initialTab)

  // Callers (LatestCards, SummariesTable) keep a single Drawer instance mounted
  // and swap `reportId` / `initialTab` per row, so the tab has to be re-seeded
  // on each open — otherwise the previous row's tab sticks.
  useEffect(() => {
    if (open) setTab(initialTab)
  }, [open, initialTab, reportId])

  // Pass null while closed so SourcesTab's effect skips the fetch.
  // useReportDetail still lives here so the header can show frequency /
  // reportDate; sources pagination lives inside SourcesTab.
  const activeId = open ? reportId : null
  const { report, loading: reportLoading, error: reportError } = useReportDetail(activeId)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl lg:max-w-3xl overflow-y-auto"
      >
        <SheetHeader>
          <SheetTitle>
            {report?.frequency === "weekly" ? "周报详情" : "日报详情"}
          </SheetTitle>
          <SheetDescription>
            {report ? report.reportDate : "加载中…"}
          </SheetDescription>
        </SheetHeader>
        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as DrawerTab)}
          className="px-4 pb-4"
        >
          <TabsList>
            <TabsTrigger value="report">报告</TabsTrigger>
            <TabsTrigger value="sources">来源</TabsTrigger>
          </TabsList>
          <TabsContent value="report" className="mt-4">
            <ReportTab report={report} loading={reportLoading} error={reportError} />
          </TabsContent>
          <TabsContent value="sources" className="mt-4">
            <SourcesTab reportId={activeId} />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}
