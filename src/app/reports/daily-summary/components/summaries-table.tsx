import { useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ReportDrawer } from "@/app/dashboard/components/report-drawer"
import { useReportHistory } from "@/hooks/use-daily-summary"
import type { Frequency } from "@/services/daily-summary"
import { FrequencyFilter } from "./frequency-filter"
import { RowTrigger } from "./row-trigger"

const PAGE_SIZE = 20
const COLUMN_COUNT = 7

/** `2026-08-11T03:04:05.000Z` → `2026-08-11 03:04`; tolerates a missing value. */
function formatGeneratedAt(value: string | null | undefined) {
  if (!value) return "—"
  return value.slice(0, 16).replace("T", " ")
}

export function SummariesTable() {
  const [frequency, setFrequency] = useState<Frequency | undefined>(undefined)
  const [page, setPage] = useState(0)
  const [openReportId, setOpenReportId] = useState<string | null>(null)
  const { items, total, loading, error } = useReportHistory({
    frequency,
    page,
    pageSize: PAGE_SIZE,
  })
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="space-y-4 px-4 py-6 lg:px-6">
      <div className="flex items-center justify-between">
        <FrequencyFilter
          value={frequency}
          onChange={(v) => {
            setFrequency(v)
            // A narrower filter can have fewer pages than the current one, so the
            // page index has to reset or the table lands on an empty page.
            setPage(0)
          }}
        />
        <span className="text-muted-foreground text-sm">
          第 {page + 1} / {totalPages} 页 · 共 {total} 条
        </span>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>日期</TableHead>
                <TableHead>频率</TableHead>
                <TableHead>版本</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>完整度</TableHead>
                <TableHead>来源</TableHead>
                <TableHead>生成时间</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={COLUMN_COUNT}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={COLUMN_COUNT}>
                    <Alert variant="destructive">
                      <AlertTitle>加载失败</AlertTitle>
                      <AlertDescription>{error.message}</AlertDescription>
                    </Alert>
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={COLUMN_COUNT}
                    className="text-muted-foreground text-center"
                  >
                    暂无历史记录
                  </TableCell>
                </TableRow>
              ) : (
                items.map((r) => (
                  <RowTrigger
                    key={r.reportId}
                    onClick={() => setOpenReportId(r.reportId)}
                  >
                    <TableCell>{r.reportDate}</TableCell>
                    <TableCell>{r.frequency === "weekly" ? "周报" : "日报"}</TableCell>
                    <TableCell>{r.revision}</TableCell>
                    <TableCell>
                      <Badge variant={r.isFinal ? "default" : "secondary"}>
                        {r.isFinal ? "终版" : "临时"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {Number(r.completenessRatio).toFixed(2)}
                      {r.hasDataWarning ? (
                        <span className="text-destructive ml-1" title="数据不完整">
                          ⚠️
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      {r.sourcePostCount} 帖 / {r.sourceResearchCount} 研报
                    </TableCell>
                    <TableCell>{formatGeneratedAt(r.generatedAt)}</TableCell>
                  </RowTrigger>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page === 0}
          onClick={() => setPage((p) => p - 1)}
        >
          上一页
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page + 1 >= totalPages}
          onClick={() => setPage((p) => p + 1)}
        >
          下一页
        </Button>
      </div>

      <ReportDrawer
        reportId={openReportId}
        open={!!openReportId}
        onOpenChange={(b) => {
          if (!b) setOpenReportId(null)
        }}
        initialTab="report"
      />
    </div>
  )
}
