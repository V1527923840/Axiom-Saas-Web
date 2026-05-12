"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { InstitutionReportsItem } from "@/features/content/types"
import {
  DetailDialog,
  ScrollableText,
  RefinedSummary,
  PDFSection,
} from "@/features/content/components/detail-dialog"

// Use the shared DetailDialog components

export const columns: ColumnDef<InstitutionReportsItem>[] = [
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
            window.dispatchEvent(new CustomEvent('open-reports-detail', { detail: item }))
          }}
        >
          查看
        </Button>
      )
    },
  },
]

// Detail Dialog Component for Institution Reports
interface InstitutionReportsDetailDialogProps {
  item: InstitutionReportsItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function InstitutionReportsDetailDialog({ item, open, onOpenChange }: InstitutionReportsDetailDialogProps) {
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
      {/* Transcript */}
      <ScrollableText label="解析原文" content={item.transcript} />

      {/* Refined Summary */}
      <RefinedSummary content={item.refinedSummary} />

      {/* PDF Section */}
      <PDFSection pdfUrl={item.pdfUrl} />
    </DetailDialog>
  )
}