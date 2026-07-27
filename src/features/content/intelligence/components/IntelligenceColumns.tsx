"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { IntelligenceItem } from "../types"

export const columns: ColumnDef<IntelligenceItem>[] = [
  {
    accessorKey: "title",
    header: "标题",
    cell: ({ row }) => (
      <div className="font-medium max-w-[250px] truncate">{row.getValue("title")}</div>
    ),
    meta: { tooltip: true },
  },
  {
    accessorKey: "author",
    header: "作者",
    cell: ({ row }) => {
      const author = row.getValue("author") as string | undefined
      return <span className="text-sm">{author || "-"}</span>
    },
  },
  {
    accessorKey: "groupName",
    header: "群组名称",
    cell: ({ row }) => {
      const groupName = row.getValue("groupName") as string | undefined
      return <span className="text-sm text-muted-foreground">{groupName || "-"}</span>
    },
  },
  {
    accessorKey: "summary",
    header: "一句话总结",
    cell: ({ row }) => (
      <div className="text-muted-foreground max-w-[200px] truncate">
        {row.getValue("summary") || "-"}
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
    accessorKey: "postDate",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="cursor-pointer p-0 hover:bg-transparent hover:text-foreground"
      >
        发布日期
        <ArrowUpDown className="ml-2 size-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const date = new Date(row.getValue("postDate"))
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
    accessorKey: "originalTextRaw",
    header: "原文",
    cell: ({ row }) => {
      const text = row.original.originalTextRaw
      if (!text) return <span className="text-muted-foreground">-</span>
      return (
        <span className="text-sm text-muted-foreground max-w-[200px] truncate block" title={text}>
          {text.slice(0, 50)}...
        </span>
      )
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
              new CustomEvent("open-intelligence-detail", { detail: item })
            )
          }}
        >
          查看
        </Button>
      )
    },
  },
]