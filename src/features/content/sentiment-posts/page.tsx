"use client"

import { useEffect } from "react"
import { BaseLayout } from "@/components/layouts/base-layout"
import { DataTable } from "@/components/data-table"
import { columns, SentimentPostDetailDialog } from "./components/columns"
import { useSentimentPostsStore, usePostFilters } from "./hooks/use-sentiment-posts"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, X } from "lucide-react"

export default function SentimentPostsPage() {
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
  } = useSentimentPostsStore()

  const { filters, setSentiment, setCompany, setKeyword, setDateFrom, setDateTo, resetFilters } = usePostFilters()

  // Initial fetch
  useEffect(() => {
    fetchPosts({
      sentiment: filters.sentiment || undefined,
      company: filters.company || undefined,
      keyword: filters.keyword || undefined,
      dateFrom: filters.dateFrom || undefined,
      dateTo: filters.dateTo || undefined,
    })
  }, [fetchPosts])

  // Listen for custom event to open detail
  useEffect(() => {
    const handleOpenDetail = (event: CustomEvent) => {
      openDetail(event.detail)
    }

    window.addEventListener('open-sentiment-post-detail', handleOpenDetail as EventListener)
    return () => {
      window.removeEventListener('open-sentiment-post-detail', handleOpenDetail as EventListener)
    }
  }, [openDetail])

  const handleSearch = () => {
    fetchPosts({
      sentiment: filters.sentiment || undefined,
      company: filters.company || undefined,
      keyword: filters.keyword || undefined,
      dateFrom: filters.dateFrom || undefined,
      dateTo: filters.dateTo || undefined,
    })
  }

  const handleReset = () => {
    resetFilters()
    fetchPosts({})
  }

  return (
    <BaseLayout title="舆情帖子" description="浏览和搜索舆情帖子内容">
      <div className="px-4 lg:px-6 space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap items-end gap-4 p-4 bg-muted/30 rounded-lg">
          <div className="space-y-1">
            <Label className="text-xs">情感</Label>
            <Select
              value={filters.sentiment || "all"}
              onValueChange={(value) => setSentiment(value === "all" ? null : value as "positive" | "negative" | "neutral")}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="全部" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="positive">正面</SelectItem>
                <SelectItem value="negative">负面</SelectItem>
                <SelectItem value="neutral">中性</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">公司名称</Label>
            <Input
              placeholder="搜索公司..."
              value={filters.company}
              onChange={(e) => setCompany(e.target.value)}
              className="w-[150px]"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">关键词</Label>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="搜索关键词..."
                value={filters.keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="pl-8 w-[200px]"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">开始日期</Label>
            <Input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-[150px]"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">结束日期</Label>
            <Input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-[150px]"
            />
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
          pagination={{
            page: pagination.page,
            pageSize: pagination.pageSize,
            total: pagination.total,
            onPageChange: setPage,
            onPageSizeChange: setPageSize,
          }}
        />

        {/* Detail Dialog - use the store-based dialog */}
        <SentimentPostDetailDialog
          item={selectedItem}
          open={detailDialogOpen}
          onOpenChange={closeDetail}
        />
      </div>
    </BaseLayout>
  )
}