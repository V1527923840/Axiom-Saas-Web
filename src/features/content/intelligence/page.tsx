"use client"

import { useEffect, useCallback, useRef } from "react"
import { format } from "date-fns"
import { BaseLayout } from "@/components/layouts/base-layout"
import { DataTable } from "@/components/data-table"
import { columns } from "./components/IntelligenceColumns"
import { IntelligenceDetailDialog } from "./components/IntelligenceDetailDialog"
import { useIntelligencePostsStore } from "./hooks/use-intelligence-posts"
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

export default function IntelligencePostsPage() {
  // Filter state moved from a separate useIntelligenceFilters hook into
  // the store below — pagination (setPage/setPageSize) now picks up the
  // latest saved filters automatically, instead of silently dropping them
  // when the operator clicks prev/next without re-running 搜索.
  const {
    posts,
    loading,
    pagination,
    selectedItem,
    detailDialogOpen,
    filters,
    fetchPosts,
    setPage,
    setPageSize,
    openDetail,
    closeDetail,
    setTitle,
    setDateRange,
    resetFilters,
  } = useIntelligencePostsStore()

  // Initial fetch — guard against React 19 strict-mode double-fire
  const initialized = useRef(false)
  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
    void fetchPosts(0, { sortBy: "postDate", sortOrder: "desc" })
  }, [fetchPosts])

  const handleSortingChange = useCallback(
    (sorting: { id: string; desc: boolean }[]) => {
      const sortItem = sorting[0]
      if (sortItem) {
        void fetchPosts(pagination.page, {
          sortBy: sortItem.id,
          sortOrder: sortItem.desc ? "desc" : "asc",
        })
      } else {
        void fetchPosts(pagination.page, {})
      }
    },
    [fetchPosts, pagination.page],
  )

  // 搜索 button: reset to page 0 and re-fetch. We pass empty params —
  // the store's fetchPosts will then read from filtersRef and re-attach
  // the latest title / dateRange values the operator typed into the
  // search bar. The page doesn't need to construct the query manually.
  const handleSearch = useCallback(() => {
    void fetchPosts(0, {})
  }, [fetchPosts])

  const handleReset = useCallback(() => {
    resetFilters()
    void fetchPosts(0, { sortBy: "postDate", sortOrder: "desc" })
  }, [resetFilters, fetchPosts])

  return (
    <BaseLayout title="情报精选" description="浏览和筛选知识星球高价值内容">
      <div className="px-4 lg:px-6 space-y-4">
        {/* Filters — 标题 + 发布日期 are the only search criteria; the
            previous 一级分类 / 二级分类 selects were dropped per UX
            request because the same data is already broken out as
            dedicated table columns and rarely needed as a filter. */}
        <div className="flex flex-wrap items-end gap-4 p-4 bg-muted/30 rounded-lg">
          <div className="space-y-1">
            <Label className="text-xs">标题</Label>
            <Input
              placeholder="搜索标题..."
              value={filters.title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-[150px]"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">发布日期</Label>
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
                    "选择发布日期范围"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={
                    filters.dateRange?.from && filters.dateRange?.to
                      ? { from: filters.dateRange.from, to: filters.dateRange.to }
                      : undefined
                  }
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
          data={posts}
          loading={loading}
          showSearch={false}
          onSortingChange={handleSortingChange}
          initialSorting={[{ id: "postDate", desc: true }]}
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
        <IntelligenceDetailDialog
          item={selectedItem}
          open={detailDialogOpen}
          onOpenChange={closeDetail}
        />
      </div>
    </BaseLayout>
  )
}
