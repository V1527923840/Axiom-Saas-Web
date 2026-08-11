"use client"

import { useEffect, useRef } from "react"
import { DataTable } from "@/components/data-table"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"
import { ReportDrawer } from "@/app/dashboard/components/report-drawer"
import { useSummariesPage } from "../hooks/use-summaries-store"
import { columns } from "./SummariesColumns"
import type { Frequency } from "@/services/daily-summary"

export function SummariesTable() {
  const {
    items,
    loading,
    error,
    pagination,
    frequency,
    openReportId,
    fetchSummaries,
    setPage,
    setPageSize,
    setFrequency,
    openReport,
    closeReport,
  } = useSummariesPage()

  // Initial fetch — guard against React 19 strict-mode double-fire.
  const initialized = useRef(false)
  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
    void fetchSummaries()
  }, [fetchSummaries])

  return (
    <div className="space-y-4 px-4 py-6 lg:px-6">
      <div className="flex items-center justify-between">
        <ToggleGroup
          type="single"
          value={frequency ?? "all"}
          onValueChange={(v) => {
            const next = v === "all" ? undefined : (v as Frequency)
            setFrequency(next)
          }}
          variant="outline"
          size="sm"
        >
          <ToggleGroupItem value="all" aria-label="全部">
            全部
          </ToggleGroupItem>
          <ToggleGroupItem value="daily" aria-label="日报">
            日报
          </ToggleGroupItem>
          <ToggleGroupItem value="weekly" aria-label="周报">
            周报
          </ToggleGroupItem>
        </ToggleGroup>
        <span className="text-muted-foreground text-sm">
          第 {pagination.page + 1} / {Math.max(1, Math.ceil(pagination.total / pagination.pageSize))} 页 · 共 {pagination.total} 条
        </span>
      </div>

      <DataTable
        columns={columns}
        data={items}
        loading={loading}
        error={error}
        onRowClick={(row) => openReport(row.reportId)}
        // onSortingChange intentionally not passed — the daily-summary
        // list endpoint does not accept sortBy/sortOrder (verified against
        // the live controller in this session). Columns are unsorted on
        // the client side. When the backend gains sort support, drop the
        // comment block below and re-introduce the handler that calls
        // fetchSummaries({ sortBy, sortOrder }).
        initialSorting={[]}
        pagination={{
          page: pagination.page,
          pageSize: pagination.pageSize,
          total: pagination.total,
          onPageChange: setPage,
          onPageSizeChange: setPageSize,
        }}
      />

      <ReportDrawer
        reportId={openReportId}
        open={!!openReportId}
        onOpenChange={(b) => {
          if (!b) closeReport()
        }}
        initialTab="report"
      />
    </div>
  )
}
