// src/features/industry-chain/components/columns.tsx
"use client"

import type { ColumnDef, Row } from "@tanstack/react-table"
import { ChevronDown, ChevronRight, Eye, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { zhCN } from "date-fns/locale"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { TreeNode } from "../hooks/use-tree"

function formatDate(dateStr?: string): string {
  if (!dateStr) return "-"
  try {
    return format(new Date(dateStr), "yyyy-MM-dd HH:mm", { locale: zhCN })
  } catch {
    return dateStr
  }
}

interface BuildColumnsArgs {
  expandedIds: Set<string>
  onToggle: (id: string) => void
  onPreview: (node: TreeNode) => void
}

export function buildColumns({
  expandedIds,
  onToggle,
  onPreview,
}: BuildColumnsArgs): ColumnDef<TreeNode>[] {
  return [
    {
      id: "name",
      header: () => <span className="font-medium">名称</span>,
      cell: ({ row }: { row: Row<TreeNode> }) => {
        const node = row.original
        const isExpanded = expandedIds.has(node.id)
        const hasChildren = node.level < 4
        const indentPx = (node.level - 1) * 24

        return (
          <div
            className="flex items-center gap-2 py-1"
            style={{ paddingLeft: `${indentPx}px` }}
          >
            {hasChildren ? (
              <button
                type="button"
                onClick={() => onToggle(node.id)}
                className="inline-flex items-center justify-center size-5 rounded hover:bg-muted"
                aria-label={isExpanded ? "折叠" : "展开"}
              >
                {node.loading ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : isExpanded ? (
                  <ChevronDown className="size-3.5" />
                ) : (
                  <ChevronRight className="size-3.5" />
                )}
              </button>
            ) : (
              <span className="inline-block size-5" />
            )}
            <span
              className="cursor-pointer select-none"
              onClick={() => hasChildren && onToggle(node.id)}
            >
              {node.name}
            </span>
            {node.level === 3 && node.versionCount !== undefined && (
              <Badge variant="secondary" className="ml-1">
                {node.versionCount} 个版本
              </Badge>
            )}
            {node.error && (
              <span className="text-xs text-destructive ml-2">
                {node.error}
              </span>
            )}
          </div>
        )
      },
    },
    {
      id: "createTime",
      header: () => <span className="font-medium">创建日期</span>,
      cell: ({ row }: { row: Row<TreeNode> }) => {
        const node = row.original
        if (node.level !== 3 && node.level !== 4) return null
        return (
          <span className="text-sm text-muted-foreground">
            {formatDate(node.createTime)}
          </span>
        )
      },
    },
    {
      id: "actions",
      header: () => <span className="sr-only">操作</span>,
      cell: ({ row }: { row: Row<TreeNode> }) => {
        const node = row.original
        if (node.level !== 4) return null
        return (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onPreview(node)}
            className="cursor-pointer"
          >
            <Eye className="size-4 mr-1" />
            查看
          </Button>
        )
      },
    },
  ]
}
