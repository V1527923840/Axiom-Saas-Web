"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { DailyNewsItem } from "@/features/content/types"

// Use the shared DetailDialog components
import { DetailDialog, ImageGrid, ScrollableText, RefinedSummary } from "@/features/content/components/detail-dialog"

export const columns: ColumnDef<DailyNewsItem>[] = [
  {
    accessorKey: "title",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="cursor-pointer p-0 hover:bg-transparent hover:text-foreground"
      >
        标题
        <ArrowUpDown className="ml-2 size-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="font-medium max-w-[300px] truncate">{row.getValue("title")}</div>
    ),
  },
  {
    accessorKey: "summary",
    header: "一句话总结",
    cell: ({ row }) => (
      <div className="text-muted-foreground max-w-[250px] truncate">
        {row.getValue("summary")}
      </div>
    ),
  },
  {
    accessorKey: "collectedAt",
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
      const date = new Date(row.getValue("collectedAt"))
      return (
        <div className="text-sm text-muted-foreground">
          {date.toLocaleString('zh-CN', {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      )
    },
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="cursor-pointer p-0 hover:bg-transparent hover:text-foreground"
      >
        创建时间
        <ArrowUpDown className="ml-2 size-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const date = new Date(row.getValue("createdAt"))
      return (
        <div className="text-sm text-muted-foreground">
          {date.toLocaleString('zh-CN', {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
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
            // Find the parent table's openDetail function via context or prop
            // Since we can't easily pass it here, we'll use a custom approach
            window.dispatchEvent(new CustomEvent('open-daily-news-detail', { detail: item }))
          }}
        >
          查看
        </Button>
      )
    },
  },
]

// Detail Dialog Component for Daily News
interface DailyNewsDetailDialogProps {
  item: DailyNewsItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DailyNewsDetailDialog({ item, open, onOpenChange }: DailyNewsDetailDialogProps) {
  if (!item) return null

  return (
    <DetailDialog
      open={open}
      onOpenChange={onOpenChange}
      title={item.title}
      collectedAt={item.collectedAt}
      createdAt={item.createdAt}
      summary={item.summary}
    >
      {/* Original Content */}
      <ScrollableText label="原文内容" content={item.originalContent} />

      {/* Image Grid */}
      {item.images.length > 0 && (
        <ImageGrid images={item.images} />
      )}

      {/* Refined Summary */}
      <RefinedSummary content={item.refinedSummary} />
    </DetailDialog>
  )
}