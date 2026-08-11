"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { DailySummary } from "@/services/daily-summary"

/** `2026-08-11T03:04:05.000Z` → `2026-08-11 03:04`; tolerates a missing value. */
function formatGeneratedAt(value: string | null | undefined) {
  if (!value) return "—"
  return value.slice(0, 16).replace("T", " ")
}

export const columns: ColumnDef<DailySummary>[] = [
  {
    accessorKey: "reportDate",
    // No sort button — the daily-summary backend does not accept
    // sortBy/sortOrder query params (verified against the live
    // controller in this session). Adding a sort header would create
    // a UI affordance that the API cannot fulfil, so we deliberately
    // match the controller's capability and stay unsorted server-side.
    // Rows are presented in the order the backend returns them
    // (latest first by default).
    header: "报告日期",
    cell: ({ row }) => <span className="text-sm">{row.original.reportDate}</span>,
  },
  {
    accessorKey: "frequency",
    header: "频率",
    cell: ({ row }) => (
      <span className="text-sm">
        {row.original.frequency === "weekly" ? "周报" : "日报"}
      </span>
    ),
  },
  {
    accessorKey: "revision",
    header: "版本",
    cell: ({ row }) => (
      <Badge variant="outline">Rev {row.original.revision}</Badge>
    ),
  },
  {
    accessorKey: "isFinal",
    header: "状态",
    cell: ({ row }) => {
      const v = row.original.isFinal
      return (
        <Badge variant={v ? "default" : "secondary"}>
          {v ? "终版" : "临时"}
        </Badge>
      )
    },
  },
  {
    accessorKey: "completenessRatio",
    header: "完整度",
    cell: ({ row }) => {
      const r = row.original
      return (
        <div className="flex items-center gap-1">
          <span className="text-sm">{Number(r.completenessRatio).toFixed(2)}</span>
          {r.hasDataWarning ? (
            <span className="text-destructive" title="数据不完整">
              ⚠️
            </span>
          ) : null}
        </div>
      )
    },
  },
  {
    id: "sources",
    header: "来源",
    cell: ({ row }) => {
      const r = row.original
      return (
        <span className="text-sm text-muted-foreground">
          {r.sourcePostCount} 帖 / {r.sourceResearchCount} 研报
        </span>
      )
    },
  },
  {
    accessorKey: "generatedAt",
    // Same rationale as `reportDate` — backend has no sort param,
    // so we don't expose a clickable sort header here either.
    header: "生成时间",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {formatGeneratedAt(row.original.generatedAt)}
      </span>
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <Button
        variant="outline"
        size="sm"
        className="cursor-pointer"
        data-testid="summaries-view-button"
        data-report-id={row.original.reportId}
      >
        查看
      </Button>
    ),
  },
]
