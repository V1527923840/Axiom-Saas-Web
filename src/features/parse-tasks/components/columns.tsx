"use client"

import type { ColumnDef } from "@tanstack/react-table"
import type { ParseTaskItem } from "../types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useParseTaskStore } from "../hooks/use-parse-task"
import { format } from "date-fns"
import { zhCN } from "date-fns/locale"
import { Play, Trash2, Eye } from "lucide-react"

const statusConfig = {
  pending: { label: "待处理", variant: "secondary" as const },
  running: { label: "执行中", variant: "default" as const },
  success: { label: "成功", variant: "outline" as const },
  partial: { label: "部分成功", variant: "secondary" as const },
  failed: { label: "失败", variant: "destructive" as const },
}

function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return "-"
  try {
    return format(new Date(dateStr), "yyyy-MM-dd HH:mm:ss", { locale: zhCN })
  } catch {
    return dateStr
  }
}

export const columns: ColumnDef<ParseTaskItem>[] = [
  {
    accessorKey: "task_id",
    header: "任务ID",
    cell: ({ row }) => (
      <span className="font-mono text-xs truncate max-w-[200px] block" title={row.original.task_id}>
        {row.original.task_id}
      </span>
    ),
  },
  {
    accessorKey: "source",
    header: "数据源",
  },
  {
    accessorKey: "version",
    header: "版本",
    cell: ({ row }) => (
      <span className="font-mono text-xs" title={row.original.version}>
        {row.original.version}
      </span>
    ),
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
    accessorKey: "parser",
    header: "解析器",
    cell: ({ row }) => row.original.parser || "-",
  },
  {
    accessorKey: "entry_count",
    header: "条目数",
    cell: ({ row }) => row.original.entry_count ?? "-",
  },
  {
    accessorKey: "confidence",
    header: "置信度",
    cell: ({ row }) => {
      if (row.original.confidence === undefined) return "-"
      return `${(row.original.confidence * 100).toFixed(1)}%`
    },
  },
  {
    accessorKey: "created_at",
    header: "创建时间",
    cell: ({ row }) => formatDate(row.original.created_at),
  },
  {
    id: "actions",
    header: "操作",
    cell: ({ row }) => {
      const { executeTask, deleteTask, setSelectedTask, setDetailDialogOpen } = useParseTaskStore()

      const handleExecute = async (e: React.MouseEvent) => {
        e.stopPropagation()
        try {
          await executeTask(row.original.id)
        } catch (error) {
          console.error("Execute failed:", error)
        }
      }

      const handleDelete = async (e: React.MouseEvent) => {
        e.stopPropagation()
        if (window.confirm("确定要删除此任务吗？")) {
          try {
            await deleteTask(row.original.id)
          } catch (error) {
            console.error("Delete failed:", error)
          }
        }
      }

      const handleViewDetail = (e: React.MouseEvent) => {
        e.stopPropagation()
        setSelectedTask(row.original as any)
        setDetailDialogOpen(true)
      }

      return (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 cursor-pointer"
            onClick={handleViewDetail}
            title="查看详情"
          >
            <Eye className="size-4" />
          </Button>
          {row.original.status === "pending" && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 cursor-pointer"
              onClick={handleExecute}
              title="执行"
            >
              <Play className="size-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 cursor-pointer text-red-500 hover:text-red-600"
            onClick={handleDelete}
            title="删除"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      )
    },
  },
]