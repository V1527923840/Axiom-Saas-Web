"use client"

import type { ColumnDef } from "@tanstack/react-table"
import type { VersionItem } from "../types"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { zhCN } from "date-fns/locale"

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

export const columns: ColumnDef<VersionItem>[] = [
  {
    accessorKey: "source",
    header: "数据源",
  },
  {
    accessorKey: "version",
    header: "版本号",
    cell: ({ row }) => (
      <span className="font-mono text-xs" title={row.original.version}>
        {row.original.version}
      </span>
    ),
  },
  {
    accessorKey: "fileCount",
    header: "文件数",
  },
  {
    accessorKey: "latestParseStatus",
    header: "解析状态",
    cell: ({ row }) => {
      const status = row.original.latestParseStatus
      if (!status) return "-"
      const config = statusConfig[status as keyof typeof statusConfig]
      return config ? <Badge variant={config.variant}>{config.label}</Badge> : status
    },
  },
  {
    accessorKey: "createdAt",
    header: "创建时间",
    cell: ({ row }) => formatDate(row.original.createdAt),
  },
]