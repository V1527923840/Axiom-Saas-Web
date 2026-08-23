"use client"

import { useEffect, useCallback, useState } from "react"
import { format } from "date-fns"
import { BaseLayout } from "@/components/layouts/base-layout"
import { DataTable } from "@/components/data-table"
import { columns } from "./components/ResearchAnalysisColumns"
import { ResearchAnalysisDetailDialog } from "./components/ResearchAnalysisDetailDialog"
import {
  useResearchAnalysisList,
  useResearchAnalysisDetail,
} from "./hooks/use-research-analysis"
import type { ResearchAnalysisItem } from "./types"
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
  // Search-bar filters — UI-only state. The list query subscribes to
  // `searchParams`; setting it triggers a refetch.
  const [keyword, setKeyword] = useState("")
  const [dateRange, setDateRange] = useState<
    { from: Date | undefined; to: Date | undefined } | undefined
  >(undefined)

  // What the user has actively filtered/sorted by. The DataTable drives
  // pagination via page/pageSize; filters + sort live in `searchParams`
  // and `appliedSort`.
  const [searchParams, setSearchParams] = useState<
    | {
        keyword?: string
        dateFrom?: string
        dateTo?: string
      }
    | undefined
  >(undefined)
  const [appliedSort, setAppliedSort] = useState<
    { sortBy: "createdAt"; sortOrder: "asc" | "desc" } | undefined
  >({ sortBy: "createdAt", sortOrder: "desc" })

  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)

  const { items, isLoading: loading, pagination } = useResearchAnalysisList({
    page,
    pageSize,
    ...(searchParams ?? {}),
    ...(appliedSort ?? {}),
  })

  // Detail dialog state — component-local, not server state.
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const { detail: selectedItem } = useResearchAnalysisDetail(selectedId)

  // Open dialog whenever a detail lands (covers both initial fetch and
  // refetch via a different id).
  useEffect(() => {
    if (selectedItem) setDetailDialogOpen(true)
  }, [selectedItem])

  const handleSortingChange = useCallback(
    (sorting: { id: string; desc: boolean }[]) => {
      const sortItem = sorting[0]
      if (sortItem) {
        setAppliedSort({
          sortBy: "createdAt",
          sortOrder: sortItem.desc ? "desc" : "asc",
        })
      } else {
        setAppliedSort(undefined)
      }
    },
    [],
  )

  const handleSearch = useCallback(() => {
    setPage(0)
    setSearchParams({
      keyword: keyword || undefined,
      dateFrom: dateRange?.from ? formatLocalDate(dateRange.from) : undefined,
      dateTo: dateRange?.to ? formatLocalDate(dateRange.to) : undefined,
    })
  }, [keyword, dateRange])

  const handleReset = useCallback(() => {
    setKeyword("")
    setDateRange(undefined)
    setPage(0)
    setSearchParams(undefined)
    setAppliedSort({ sortBy: "createdAt", sortOrder: "desc" })
  }, [])

  const handlePageChange = useCallback((next: number) => {
    setPage(next)
  }, [])

  const handlePageSizeChange = useCallback((next: number) => {
    setPage(0)
    setPageSize(next)
  }, [])

  const openDetail = useCallback((item: ResearchAnalysisItem) => {
    setSelectedId(item.id)
  }, [])

  const closeDetail = useCallback(() => {
    setDetailDialogOpen(false)
  }, [])

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
              value={keyword}
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
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "yyyy-MM-dd")} - {format(dateRange.to, "yyyy-MM-dd")}
                      </>
                    ) : (
                      format(dateRange.from, "yyyy-MM-dd")
                    )
                  ) : (
                    "选择收录日期范围"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={dateRange}
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
            onPageChange: handlePageChange,
            onPageSizeChange: handlePageSizeChange,
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