"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { JobStatus } from "./JobStatus"
import type { EtlJob } from "../types"

interface JobHistoryProps {
  jobs: EtlJob[]
  loading: boolean
  pagination: {
    page: number
    pageSize: number
    total: number
  }
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
}

export function JobHistory({ jobs, loading, pagination, onPageChange, onPageSizeChange }: JobHistoryProps) {
  const [selectedJob, setSelectedJob] = useState<EtlJob | null>(null)

  const formatDuration = (startedAt?: string, completedAt?: string) => {
    if (!startedAt || !completedAt) return "-"
    const start = new Date(startedAt).getTime()
    const end = new Date(completedAt).getTime()
    const seconds = Math.round((end - start) / 1000)
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">任务历史</h3>

      {jobs.length === 0 && !loading ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>暂无任务记录</p>
        </div>
      ) : (
        <>
          <div className="rounded-md border">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="py-3 px-4 text-left font-medium">任务ID</th>
                  <th className="py-3 px-4 text-left font-medium">文件名</th>
                  <th className="py-3 px-4 text-left font-medium">解析器</th>
                  <th className="py-3 px-4 text-left font-medium">条数</th>
                  <th className="py-3 px-4 text-left font-medium">耗时</th>
                  <th className="py-3 px-4 text-left font-medium">状态</th>
                  <th className="py-3 px-4 text-left font-medium">开始时间</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i} className="border-b">
                      <td className="py-3 px-4"><div className="h-4 w-32 bg-muted animate-pulse rounded" /></td>
                      <td className="py-3 px-4"><div className="h-4 w-48 bg-muted animate-pulse rounded" /></td>
                      <td className="py-3 px-4"><div className="h-4 w-24 bg-muted animate-pulse rounded" /></td>
                      <td className="py-3 px-4"><div className="h-4 w-16 bg-muted animate-pulse rounded" /></td>
                      <td className="py-3 px-4"><div className="h-4 w-20 bg-muted animate-pulse rounded" /></td>
                      <td className="py-3 px-4"><div className="h-4 w-20 bg-muted animate-pulse rounded" /></td>
                      <td className="py-3 px-4"><div className="h-4 w-28 bg-muted animate-pulse rounded" /></td>
                    </tr>
                  ))
                ) : (
                  jobs.map((job) => (
                    <tr
                      key={job.id}
                      className="border-b hover:bg-muted/30 cursor-pointer"
                      onClick={() => setSelectedJob(job)}
                    >
                      <td className="py-3 px-4 font-mono text-sm text-muted-foreground">{job.id.slice(0, 8)}...</td>
                      <td className="py-3 px-4 max-w-[200px] truncate">{job.sourceFile}</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-muted">
                          {job.parser || "-"}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono">
                        {job.successItems}/{job.totalItems}
                        {job.failedItems > 0 && (
                          <span className="text-destructive ml-1">({job.failedItems} 失败)</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">{formatDuration(job.startedAt, job.completedAt)}</td>
                      <td className="py-3 px-4"><JobStatus status={job.status} /></td>
                      <td className="py-3 px-4 text-muted-foreground text-sm">{formatDate(job.createdAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-2">
            <div className="text-sm text-muted-foreground">
              共 {pagination.total} 条记录
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">每页</span>
                <select
                  className="h-8 w-[70px] rounded-md border border-input bg-background px-2"
                  value={pagination.pageSize}
                  onChange={(e) => onPageSizeChange(Number(e.target.value))}
                >
                  {[10, 20, 50, 100].map((size) => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="cursor-pointer"
                >
                  上一页
                </Button>
                <span className="px-2 text-sm">
                  第 {pagination.page} 页
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(pagination.page + 1)}
                  disabled={pagination.page * pagination.pageSize >= pagination.total}
                  className="cursor-pointer"
                >
                  下一页
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Job Detail Dialog could be added here */}
      {selectedJob && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setSelectedJob(null)}
        >
          <div
            className="bg-background rounded-lg shadow-lg max-w-lg w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="text-lg font-medium mb-4">任务详情</h4>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <span className="text-muted-foreground">任务ID:</span>
                <span className="font-mono break-all">{selectedJob.id}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <span className="text-muted-foreground">文件名:</span>
                <span className="break-all">{selectedJob.sourceFile}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <span className="text-muted-foreground">状态:</span>
                <JobStatus status={selectedJob.status} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <span className="text-muted-foreground">成功/总计:</span>
                <span>{selectedJob.successItems} / {selectedJob.totalItems}</span>
              </div>
              {selectedJob.errorMessage && (
                <div className="grid grid-cols-1 gap-2">
                  <span className="text-muted-foreground">错误信息:</span>
                  <span className="text-destructive break-all">{selectedJob.errorMessage}</span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <span className="text-muted-foreground">开始时间:</span>
                <span>{selectedJob.startedAt ? formatDate(selectedJob.startedAt) : "-"}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <span className="text-muted-foreground">完成时间:</span>
                <span>{selectedJob.completedAt ? formatDate(selectedJob.completedAt) : "-"}</span>
              </div>
            </div>
            <Button variant="outline" className="mt-4 w-full cursor-pointer" onClick={() => setSelectedJob(null)}>
              关闭
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}