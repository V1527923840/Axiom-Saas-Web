"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SentimentBadge } from "./SentimentBadge"
import { CompanyTags } from "./CompanyTags"
import type { SentimentPostItem } from "../types"

// Use the shared DetailDialog components
import {
  DetailDialog,
  ScrollableText,
  RefinedSummary,
} from "@/features/content/components/detail-dialog"

export const columns: ColumnDef<SentimentPostItem>[] = [
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
      <div className="font-medium max-w-[250px] truncate">{row.getValue("title")}</div>
    ),
  },
  {
    accessorKey: "summary",
    header: "一句话总结",
    cell: ({ row }) => (
      <div className="text-muted-foreground max-w-[200px] truncate">
        {row.getValue("summary") || "-"}
      </div>
    ),
  },
  {
    accessorKey: "contentTimestamp",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="cursor-pointer p-0 hover:bg-transparent hover:text-foreground"
      >
        发布时间
        <ArrowUpDown className="ml-2 size-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const timestamp = row.getValue("contentTimestamp")
      if (!timestamp) return <span className="text-muted-foreground">-</span>
      const date = new Date(timestamp)
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
    accessorKey: "sentiment",
    header: "情感",
    cell: ({ row }) => {
      const sentiment = row.getValue("sentiment") as "positive" | "negative" | "neutral" | undefined
      if (!sentiment) return <span className="text-muted-foreground">-</span>
      return <SentimentBadge sentiment={sentiment} />
    },
  },
  {
    accessorKey: "companies",
    header: "提及公司",
    cell: ({ row }) => {
      const companies = row.getValue("companies") as SentimentPostItem["companies"]
      return <CompanyTags companies={companies || []} />
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
            window.dispatchEvent(new CustomEvent('open-sentiment-post-detail', { detail: item }))
          }}
        >
          查看
        </Button>
      )
    },
  },
]

// Detail Dialog Component for Sentiment Posts
interface SentimentPostDetailDialogProps {
  item: SentimentPostItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SentimentPostDetailDialog({ item, open, onOpenChange }: SentimentPostDetailDialogProps) {
  if (!item) return null

  return (
    <DetailDialog
      open={open}
      onOpenChange={onOpenChange}
      title={item.title}
      collectedAt={item.collectedAt}
      createdAt={item.createdAt}
      summary={item.summary || ""}
    >
      {/* Sentiment & Classification Tags */}
      <div className="space-y-2">
        <div className="flex items-center gap-4">
          {item.sentiment && <SentimentBadge sentiment={item.sentiment} />}
          {item.classifications && item.classifications.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {item.classifications.map((cls, idx) => (
                <span
                  key={idx}
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${
                    cls.layer === 'carrier' ? 'bg-blue-100 text-blue-800' :
                    cls.layer === 'info_type' ? 'bg-purple-100 text-purple-800' :
                    'bg-green-100 text-green-800'
                  }`}
                >
                  {cls.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Original Content */}
      {item.originalContent && (
        <ScrollableText label="原文内容" content={item.originalContent} />
      )}

      {/* Companies */}
      {item.companies && item.companies.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">提及公司</h3>
          <CompanyTags companies={item.companies} />
        </div>
      )}

      {/* Metadata */}
      {item.metadata && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">元信息</h3>
          <div className="text-sm space-y-1">
            {item.parser && (
              <div className="flex gap-2">
                <span className="text-muted-foreground">解析器:</span>
                <span className="font-mono">{item.parser}</span>
              </div>
            )}
            {item.entryId && (
              <div className="flex gap-2">
                <span className="text-muted-foreground">条目ID:</span>
                <span className="font-mono">{item.entryId}</span>
              </div>
            )}
            {item.sourceFile && (
              <div className="flex gap-2">
                <span className="text-muted-foreground">来源文件:</span>
                <span className="text-xs break-all">{item.sourceFile}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </DetailDialog>
  )
}