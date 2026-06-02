"use client"

import { useEffect, useCallback, useRef } from "react"
import { format } from "date-fns"
import { BaseLayout } from "@/components/layouts/base-layout"
import { DataTable } from "@/components/data-table"
import { columns } from "./components/IntelligenceColumns"
import { IntelligenceDetailDialog } from "./components/IntelligenceDetailDialog"
import { useIntelligencePostsStore } from "./hooks/use-intelligence-posts"
import { useIntelligenceFilters } from "./hooks/use-intelligence-filters"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calendar } from "@/components/ui/calendar"
import { CalendarIcon } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { X } from "lucide-react"
import { CATEGORY_L1_OPTIONS, VALUE_RATING_OPTIONS } from "./types"
import { formatLocalDate } from "@/lib/utils"

export default function IntelligencePostsPage() {
  const {
    posts,
    loading,
    pagination,
    selectedItem,
    detailDialogOpen,
    fetchPosts,
    setPage,
    setPageSize,
    openDetail,
    closeDetail,
  } = useIntelligencePostsStore()

  const { filters, setCategoryL1, setCategoryL2, setValueRating, setTitle, setDateRange, resetFilters } = useIntelligenceFilters()

  // Initial fetch - only on mount using ref to track
  const initialized = useRef(false)
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true
      fetchPosts(0, { sortBy: "postDate", sortOrder: "desc" })
    }
  }, []) // Empty deps - only run once on mount

  // Listen for custom event to open detail
  useEffect(() => {
    const handleOpenDetail = (event: CustomEvent) => {
      openDetail(event.detail)
    }

    window.addEventListener("open-intelligence-detail", handleOpenDetail as EventListener)
    return () => {
      window.removeEventListener("open-intelligence-detail", handleOpenDetail as EventListener)
    }
  }, [openDetail])

  const handleSortingChange = useCallback((sorting: { id: string; desc: boolean }[]) => {
    const sortItem = sorting[0]
    if (sortItem) {
      fetchPosts(pagination.page, { sortBy: sortItem.id, sortOrder: sortItem.desc ? "desc" : "asc" })
    } else {
      fetchPosts(pagination.page, {})
    }
  }, [fetchPosts, pagination.page])

  const handleSearch = useCallback(() => {
    fetchPosts(0, {
      categoryL1: filters.categoryL1 || undefined,
      categoryL2: filters.categoryL2 || undefined,
      valueRating: filters.valueRating || undefined,
      title: filters.title || undefined,
      dateFrom: filters.dateRange?.from ? formatLocalDate(filters.dateRange.from) : undefined,
      dateTo: filters.dateRange?.to ? formatLocalDate(filters.dateRange.to) : undefined,
    })
  }, [fetchPosts, filters])

  const handleReset = useCallback(() => {
    resetFilters()
    fetchPosts(0, { sortBy: "postDate", sortOrder: "desc" })
  }, [resetFilters, fetchPosts])

  return (
    <BaseLayout title="情报精选" description="浏览和筛选知识星球高价值内容">
      <div className="px-4 lg:px-6 space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap items-end gap-4 p-4 bg-muted/30 rounded-lg">
          <div className="space-y-1">
            <Label className="text-xs">一级分类</Label>
            <Select
              value={filters.categoryL1 || "all"}
              onValueChange={(value) => setCategoryL1(value === "all" ? null : value as typeof CATEGORY_L1_OPTIONS[number])}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="全部" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                {CATEGORY_L1_OPTIONS.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">二级分类</Label>
            <Input
              placeholder="搜索二级分类..."
              value={filters.categoryL2}
              onChange={(e) => setCategoryL2(e.target.value)}
              className="w-[140px]"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">价值评级</Label>
            <Select
              value={filters.valueRating || "all"}
              onValueChange={(value) => setValueRating(value === "all" ? null : value as typeof VALUE_RATING_OPTIONS[number])}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="全部" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                {VALUE_RATING_OPTIONS.map((rating) => (
                  <SelectItem key={rating} value={rating}>
                    {rating}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
            <Label className="text-xs">日期范围</Label>
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
                    "选择日期范围"
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
          data={posts}
          loading={loading}
          showSearch={false}
          onSortingChange={handleSortingChange}
          initialSorting={[{ id: "postDate", desc: true }]}
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