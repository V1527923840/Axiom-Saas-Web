"use client"

import { useEffect, useRef } from "react"
import { DataTable } from "@/components/data-table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
    reportDate,
    openReportId,
    fetchSummaries,
    setPage,
    setPageSize,
    setFrequency,
    setReportDate,
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
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="summaries-filter-date" className="text-xs">
            报告日期
          </Label>
          <Input
            id="summaries-filter-date"
            type="date"
            value={reportDate ?? ""}
            onChange={(e) => {
              const v = e.target.value
              setReportDate(v === "" ? null : v)
            }}
            className="w-[160px]"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="summaries-filter-frequency" className="text-xs">
            报告类型
          </Label>
          <Select
            value={frequency ?? "all"}
            onValueChange={(v) => {
              const next = v === "all" ? undefined : (v as Frequency)
              setFrequency(next)
            }}
          >
            <SelectTrigger
              id="summaries-filter-frequency"
              size="sm"
              className="w-[140px]"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="daily">日报</SelectItem>
              <SelectItem value="weekly">周报</SelectItem>
            </SelectContent>
          </Select>
        </div>
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