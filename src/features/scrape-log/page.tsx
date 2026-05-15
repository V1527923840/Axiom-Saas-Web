"use client"

import { useEffect, useState } from "react"
import { BaseLayout } from "@/components/layouts/base-layout"
import { DataTable } from "@/components/data-table"
import { columns, ScrapeLogDetailDialog } from "./components/columns"
import { useScrapeLogStore } from "./hooks/use-scrape-log"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { RefreshCw } from "lucide-react"

export default function ScrapeLogPage() {
  const {
    logs,
    loading,
    pagination,
    fetchLogs,
    setPage,
    setPageSize,
  } = useScrapeLogStore()

  const [statusFilter, setStatusFilter] = useState<string>("all")

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value)
    if (value === "all") {
      setPage(0)
      fetchLogs({})
    } else {
      setPage(0)
      fetchLogs({ status: value })
    }
  }

  const handleRefresh = () => {
    setPage(0)
    if (statusFilter === "all") {
      fetchLogs({})
    } else {
      fetchLogs({ status: statusFilter })
    }
  }

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
  }

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize)
  }

  return (
    <BaseLayout title="爬虫日志" description="查看和管理爬虫执行日志">
      <div className="px-4 lg:px-6 space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap items-end gap-4 p-4 bg-muted/30 rounded-lg">
          <div className="space-y-1">
            <Label className="text-xs">状态</Label>
            <Select
              value={statusFilter}
              onValueChange={handleStatusFilterChange}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="全部状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="pending">待处理</SelectItem>
                <SelectItem value="running">执行中</SelectItem>
                <SelectItem value="success">成功</SelectItem>
                <SelectItem value="failed">失败</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleRefresh} className="cursor-pointer">
            <RefreshCw className="size-4 mr-2" />
            刷新
          </Button>
        </div>

        {/* Data Table */}
        <DataTable
          columns={columns}
          data={logs}
          loading={loading}
          showToolbar={false}
          pagination={{
            page: pagination.page,
            pageSize: pagination.pageSize,
            total: pagination.total,
            onPageChange: handlePageChange,
            onPageSizeChange: handlePageSizeChange,
          }}
        />

        {/* Detail Dialog */}
        <ScrapeLogDetailDialog />
      </div>
    </BaseLayout>
  )
}