"use client"

import { useEffect, useCallback, useRef } from "react"
import { format } from "date-fns"
import { BaseLayout } from "@/components/layouts/base-layout"
import { DataTable } from "@/components/data-table"
import { columns } from "./components/ResearchAnalysisColumns"
import { ResearchAnalysisDetailDialog } from "./components/ResearchAnalysisDetailDialog"
import { useResearchAnalysisStore } from "./hooks/use-research-analysis"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calendar } from "@/components/ui/calendar"
import { CalendarIcon } from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { X } from "lucide-react"
import { formatLocalDate } from "@/lib/utils"

export default function ResearchAnalysisPage() {
  const {
    items,
    loading,
    pagination,
    selectedItem,
    detailDialogOpen,
    filters,
    fetchItems,
    setPage,
    setPageSize,
    openDetail,
    closeDetail,
    setKeyword,
    setDateRange,
    resetFilters,
  } = useResearchAnalysisStore()

  // Initial fetch — guard against React 19 strict-mode double-fire
  const initialized = useRef(false)
  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
    void fetchItems(0, { sortBy: "createdAt", sortOrder: "desc" })
  }, [fetchItems])

  const handleSortingChange = useCallback(
    (sorting: { id: string; desc: boolean }[]) => {
      const sortItem = sorting[0]
      if (sortItem) {
        void fetchItems(pagination.page, {
          sortBy: sortItem.id,
          sortOrder: sortItem.desc ? "desc" : "asc",
        })
      } else {
        void fetchItems(pagination.page, {})
      }
    },
    [fetchItems, pagination.page],
  )

  const handleSearch = useCallback(() => {
    void fetchItems(0, {
      keyword: filters.keyword || undefined,
      dateFrom: filters.dateRange?.from
        ? formatLocalDate(filters.dateRange.from)
        : undefined,
      dateTo: filters.dateRange?.to
        ? formatLocalDate(filters.dateRange.to)
        : undefined,
    })
  }, [fetchItems, filters])

  const handleReset = useCallback(() => {
    resetFilters()
    void fetchItems(0, { sortBy: "createdAt", sortOrder: "desc" })
  }, [resetFilters, fetchItems])

  return (
    <BaseLayout title="机构研报" description="浏览和筛选机构研究报告">
      <div className="px-4 lg:px-6 space-y-4">
        {/* Filters — only 文档名称 + 发布日期 remain. The previous
            一级/二级分类 selects were dropped per UX request. */}
        <div className="flex flex-wrap items-end gap-4 p-4 bg-muted/30 rounded-lg">
          <div className="space-y-1">
            <Label className="text-xs">文档名称</Label>
            <Input
              placeholder="搜索文档名..."
              value={filters.keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="w-[150px]"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">收录日期</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-[280px] justify-start text-left font-normal cursor-pointer"
                >
                  <CalendarIcon className="mr-2 size-4" />
                  {filters.dateRange?.from ? (
                    filters.dateRange.to ? (
                      <>
                        {format(filters.dateRange.from, "yyyy-MM-dd")} - {format(filters.dateRange.to, "yyyy-MM-dd")}
                      </>
                    ) : (
                      format(filters.dateRange.from, "yyyy-MM-dd")
                    )
                  ) : (
                    "选择收录日期范围"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={filters.dateRange}
                  onSelect={(range) => {
                    if (range?.from && range?.to) {
                      setDateRange({ from: range.from, to: range.to })
                    } else {
                      setDateRange(undefined)
                    }
                  }}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSearch} className="cursor-pointer">
              搜索
            </Button>
            <Button variant="outline" onClick={handleReset} className="cursor-pointer">
              <X className="size-4 mr-2" />
              重置
            </Button>
          </div>
        </div>

        {/* Data Table */}
        <DataTable
          columns={columns}
          data={items}
          loading={loading}
          showSearch={false}
          onSortingChange={handleSortingChange}
          initialSorting={[{ id: "createdAt", desc: true }]}
          onRowClick={openDetail}
          pagination={{
            page: pagination.page,
            pageSize: pagination.pageSize,
            total: pagination.total,
            onPageChange: setPage,
            onPageSizeChange: setPageSize,
          }}
        />

        {/* Detail Dialog */}
        <ResearchAnalysisDetailDialog
          item={selectedItem}
          open={detailDialogOpen}
          onOpenChange={closeDetail}
        />
      </div>
    </BaseLayout>
  )
}
