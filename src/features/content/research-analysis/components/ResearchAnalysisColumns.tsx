"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { ResearchAnalysisItem } from "../types"

export const columns: ColumnDef<ResearchAnalysisItem>[] = [
  {
    accessorKey: "documentName",
    header: "文档名称",
    cell: ({ row }) => (
      <div className="font-medium max-w-[250px] truncate">{row.getValue("documentName")}</div>
    ),
    meta: { tooltip: true },
  },
  {
    accessorKey: "keyThesis",
    header: "核心观点",
    cell: ({ row }) => (
      <div className="text-muted-foreground max-w-[200px] truncate">
        {row.getValue("keyThesis") || "-"}
      </div>
    ),
    meta: { tooltip: true },
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="cursor-pointer p-0 hover:bg-transparent hover:text-foreground"
      >
        收录时间
        <ArrowUpDown className="ml-2 size-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const date = new Date(row.getValue("createdAt"))
      return (
        <div className="text-sm text-muted-foreground">
          {date.toLocaleString("zh-CN", {
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      )
    },
  },
  {
    accessorKey: "analyzedAt",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="cursor-pointer p-0 hover:bg-transparent hover:text-foreground"
      >
        分析日期
        <ArrowUpDown className="ml-2 size-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const date = new Date(row.getValue("analyzedAt"))
      if (isNaN(date.getTime())) return <span className="text-muted-foreground">-</span>
      return (
        <div className="text-sm text-muted-foreground">
          {date.toLocaleDateString("zh-CN", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          })}
        </div>
      )
    },
    sortingFn: "datetime",
  },
  {
    accessorKey: "categoryL1",
    header: "一级分类",
    cell: ({ row }) => {
      const category = row.getValue("categoryL1") as string
      return <span className="text-sm">{category || "-"}</span>
    },
  },
  {
    accessorKey: "pyramidVersion",
    header: "金字塔版本",
    cell: ({ row }) => {
      const version = row.getValue("pyramidVersion") as string | undefined
      if (!version) return <span className="text-muted-foreground">-</span>
      const variant = version === "v2.0" ? "default" : "outline"
      return <Badge variant={variant}>{version}</Badge>
    },
  },
  {
    id: "actions",
    cell: () => (
      <Button
        variant="outline"
        size="sm"
        className="cursor-pointer"
        data-testid="research-view-button"
      >
        查看
      </Button>
    ),
  },
]