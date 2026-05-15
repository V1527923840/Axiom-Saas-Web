"use client"

import type { ColumnDef } from "@tanstack/react-table"
import type { ScrapeLogItem } from "../types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useScrapeLogStore } from "../hooks/use-scrape-log"
import { format } from "date-fns"
import { zhCN } from "date-fns/locale"

const statusConfig = {
  pending: { label: "待处理", variant: "secondary" as const },
  running: { label: "执行中", variant: "default" as const },
  success: { label: "成功", variant: "outline" as const },
  failed: { label: "失败", variant: "destructive" as const },
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-"
  try {
    return format(new Date(dateStr), "yyyy-MM-dd HH:mm:ss", { locale: zhCN })
  } catch {
    return dateStr
  }
}

export const columns: ColumnDef<ScrapeLogItem>[] = [
  {
    accessorKey: "createdat",
    header: "创建时间",
    cell: ({ row }) => formatDate(row.original.createdat),
  },
  {
    accessorKey: "source",
    header: "数据源",
  },
  {
    accessorKey: "targettime",
    header: "目标时间",
    cell: ({ row }) => formatDate(row.original.targettime),
  },
  {
    accessorKey: "status",
    header: "状态",
    cell: ({ row }) => {
      const config = statusConfig[row.original.status as keyof typeof statusConfig]
      return <Badge variant={config.variant}>{config.label}</Badge>
    },
  },
  {
    accessorKey: "postcount",
    header: "帖子数",
  },
  {
    accessorKey: "filecount",
    header: "文件数",
  },
  {
    accessorKey: "latestposttime",
    header: "最新帖子时间",
    cell: ({ row }) => formatDate(row.original.latestposttime),
  },
  {
    accessorKey: "completedat",
    header: "完成时间",
    cell: ({ row }) => formatDate(row.original.completedat),
  },
]

export function ScrapeLogDetailDialog() {
  const { selectedItem, detailDialogOpen, closeDetail } = useScrapeLogStore()

  if (!detailDialogOpen || !selectedItem) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background w-full max-w-2xl rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold mb-4">爬虫日志详情</h2>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-sm text-muted-foreground">ID</span>
              <p className="font-mono text-sm">{selectedItem.id}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">数据源</span>
              <p>{selectedItem.source}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">目标时间</span>
              <p>{formatDate(selectedItem.targettime)}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">状态</span>
              <p>{statusConfig[selectedItem.status as keyof typeof statusConfig]?.label || selectedItem.status}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">帖子数</span>
              <p>{selectedItem.postcount}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">文件数</span>
              <p>{selectedItem.filecount}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">最新帖子时间</span>
              <p>{formatDate(selectedItem.latestposttime)}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">开始时间</span>
              <p>{formatDate(selectedItem.startedat)}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">完成时间</span>
              <p>{formatDate(selectedItem.completedat)}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">OSS路径</span>
              <p className="truncate">{selectedItem.osspath || "-"}</p>
            </div>
          </div>
          {selectedItem.errormessage && (
            <div>
              <span className="text-sm text-muted-foreground">错误信息</span>
              <p className="text-red-500 bg-red-50 p-2 rounded mt-1">{selectedItem.errormessage}</p>
            </div>
          )}
        </div>
        <div className="mt-6 flex justify-end">
          <Button onClick={closeDetail}>关闭</Button>
        </div>
      </div>
    </div>
  )
}