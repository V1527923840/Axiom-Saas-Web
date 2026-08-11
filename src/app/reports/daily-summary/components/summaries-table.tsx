"use client"

import { useEffect, useRef } from "react"
import { format } from "date-fns"
import { CalendarIcon, X } from "lucide-react"
import { DataTable } from "@/components/data-table"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
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
    dateRange,
    openReportId,
    fetchSummaries,
    setPage,
    setPageSize,
    setFrequency,
    setDateRange,
    resetFilters,
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

  // "搜索" button — the single trigger that applies the latest filter
  // values. setFrequency / setDateRange only mutate store state; the
  // page reads the saved values back inside fetchSummaries via store.get().
  const handleSearch = () => {
    void fetchSummaries({ page: 0 })
  }

  const handleReset = () => {
    resetFilters()
    void fetchSummaries({ page: 0 })
  }

  return (
    <div className="space-y-3 px-4 py-4 lg:px-6">
      {/* Filters — 报告类型 + 报告日期 range. UI mirrors the 情报精选 /
          机构研报 pattern; the DataTable's built-in "搜索..." input is
          disabled below because there's no title column to search on. */}
      <div className="flex flex-wrap items-end gap-3 rounded-lg bg-muted/30 px-4 py-2">
        <div className="space-y-1">
          <Label className="text-xs">报告类型</Label>
          <Select
            value={frequency ?? "all"}
            onValueChange={(v) => {
              const next = v === "all" ? undefined : (v as Frequency)
              setFrequency(next)
            }}
          >
            <SelectTrigger size="sm" className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="daily">日报</SelectItem>
              <SelectItem value="weekly">周报</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">报告日期</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-[280px] cursor-pointer justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 size-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "yyyy-MM-dd")} -{" "}
                      {format(dateRange.to, "yyyy-MM-dd")}
                    </>
                  ) : (
                    format(dateRange.from, "yyyy-MM-dd")
                  )
                ) : (
                  "选择报告日期范围"
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={
                  dateRange?.from
                    ? {
                        from: dateRange.from,
                        to: dateRange.to,
                      }
                    : undefined
                }
                onSelect={(range) => {
                  if (range?.from && range?.to) {
                    setDateRange({ from: range.from, to: range.to })
                  } else {
                    setDateRange(null)
                  }
                }}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        </div>

        <Button onClick={handleSearch} className="cursor-pointer">
          搜索
        </Button>
        <Button
          variant="outline"
          onClick={handleReset}
          className="cursor-pointer"
        >
          <X className="mr-2 size-4" />
          重置
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={items}
        loading={loading}
        error={error}
        showSearch={false}
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