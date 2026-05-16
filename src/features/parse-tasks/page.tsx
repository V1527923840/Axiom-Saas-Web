"use client"

import { useEffect, useState } from "react"
import { BaseLayout } from "@/components/layouts/base-layout"
import { DataTable } from "@/components/data-table"
import { columns } from "./components/columns"
import { CreateTaskDialog } from "./components/create-task-dialog"
import { useParseTaskStore } from "./hooks/use-parse-task"
import { parseTaskApi } from "./services/parse-task"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Plus, RefreshCw } from "lucide-react"

export default function ParseTasksPage() {
  const {
    tasks,
    loading,
    pagination,
    createDialogOpen,
    setCreateDialogOpen,
    fetchTasks,
    setPage,
    setPageSize,
    resetFilters,
  } = useParseTaskStore()

  const [sourceFilter, setSourceFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [availableSources, setAvailableSources] = useState<string[]>([])

  useEffect(() => {
    fetchTasks()
    fetchSources()
  }, [fetchTasks])

  const fetchSources = async () => {
    try {
      const response = await parseTaskApi.getSources()
      setAvailableSources(response.sources)
    } catch (error) {
      console.error("Failed to fetch sources:", error)
    }
  }

  const handleSourceFilterChange = (value: string) => {
    setSourceFilter(value)
    if (value === "all") {
      setPage(0)
      fetchTasks({ status: statusFilter !== "all" ? statusFilter : undefined })
    } else {
      setPage(0)
      fetchTasks({ source: value, status: statusFilter !== "all" ? statusFilter : undefined })
    }
  }

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value)
    if (value === "all") {
      setPage(0)
      fetchTasks({ source: sourceFilter !== "all" ? sourceFilter : undefined })
    } else {
      setPage(0)
      fetchTasks({ source: sourceFilter !== "all" ? sourceFilter : undefined, status: value })
    }
  }

  const handleRefresh = () => {
    setPage(0)
    fetchTasks({
      source: sourceFilter !== "all" ? sourceFilter : undefined,
      status: statusFilter !== "all" ? statusFilter : undefined,
    })
  }

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
  }

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize)
  }

  return (
    <BaseLayout title="解析任务" description="管理文档解析任务">
      <div className="px-4 lg:px-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            共 {pagination.total} 个任务
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setCreateDialogOpen(true)}
              className="cursor-pointer"
            >
              <Plus className="size-4 mr-2" />
              新建任务
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-end gap-4 p-4 bg-muted/30 rounded-lg">
          <div className="space-y-1">
            <Label className="text-xs">数据源</Label>
            <Select
              value={sourceFilter}
              onValueChange={handleSourceFilterChange}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="全部数据源" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部数据源</SelectItem>
                {availableSources.map((source) => (
                  <SelectItem key={source} value={source}>{source}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
                <SelectItem value="partial">部分成功</SelectItem>
                <SelectItem value="failed">失败</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleRefresh} className="cursor-pointer">
            <RefreshCw className="size-4 mr-2" />
            刷新
          </Button>

          {(sourceFilter !== "all" || statusFilter !== "all") && (
            <Button onClick={resetFilters} variant="ghost" className="cursor-pointer">
              重置筛选
            </Button>
          )}
        </div>

        {/* Data Table */}
        <DataTable
          columns={columns}
          data={tasks}
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

        {/* Create Dialog */}
        <CreateTaskDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
        />
      </div>
    </BaseLayout>
  )
}