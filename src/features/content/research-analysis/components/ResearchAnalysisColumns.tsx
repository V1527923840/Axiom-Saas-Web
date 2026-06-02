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
    accessorKey: "valueRating",
    header: "价值评级",
    cell: ({ row }) => {
      const rating = row.getValue("valueRating") as string
      const ratingConfig: Record<string, { label: string; className: string }> = {
        高: { label: "高", className: "bg-green-100 text-green-800" },
        中: { label: "中", className: "bg-yellow-100 text-yellow-800" },
        低: { label: "低", className: "bg-orange-100 text-orange-800" },
        高风险: { label: "高风险", className: "bg-red-100 text-red-800" },
      }
      const config = ratingConfig[rating] || ratingConfig["中"]
      return <Badge className={config.className}>{config.label}</Badge>
    },
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
    accessorKey: "overallScore",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="cursor-pointer p-0 hover:bg-transparent hover:text-foreground"
      >
        综合评分
        <ArrowUpDown className="ml-2 size-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const score = row.getValue("overallScore") as number
      return <span className="font-mono">{score ?? "-"}</span>
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const item = row.original
      return (
        <Button
          variant="outline"
          size="sm"
          className="cursor-pointer"
          onClick={() => {
            window.dispatchEvent(
              new CustomEvent("open-research-detail", { detail: item })
            )
          }}
        >
          查看
        </Button>
      )
    },
  },
]