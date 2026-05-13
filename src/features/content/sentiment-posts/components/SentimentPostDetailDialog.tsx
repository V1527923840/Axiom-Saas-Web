"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import type { SentimentPostItem } from "../types"
import { SentimentBadge } from "./SentimentBadge"
import { CompanyTags } from "./CompanyTags"

interface SentimentPostDetailDialogProps {
  item: SentimentPostItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SentimentPostDetailDialog({ item, open, onOpenChange }: SentimentPostDetailDialogProps) {
  if (!item) return null

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-xl leading-tight pr-8">{item.title}</DialogTitle>
          <div className="flex gap-2 mt-2 flex-wrap">
            {item.sentiment && <SentimentBadge sentiment={item.sentiment} />}
            {item.contentTimestamp && (
              <Badge variant="outline">
                发布时间: {formatDate(item.contentTimestamp)}
              </Badge>
            )}
            <Badge variant="secondary">
              收录: {formatDate(item.collectedAt)}
            </Badge>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 min-h-0">
          {/* Classification Tags */}
          {item.classifications && item.classifications.length > 0 && (
            <>
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground">分类标签</h3>
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
              </div>
              <Separator />
            </>
          )}

          {/* Summary Section */}
          {item.summary && (
            <>
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground">一句话总结</h3>
                <p className="text-sm leading-relaxed">{item.summary}</p>
              </div>
              <Separator />
            </>
          )}

          {/* Original Content */}
          {item.originalContent && (
            <>
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground">原文内容</h3>
                <ScrollArea className="h-48 w-full rounded-md border p-4">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{item.originalContent}</p>
                </ScrollArea>
              </div>
              <Separator />
            </>
          )}

          {/* Companies */}
          {item.companies && item.companies.length > 0 && (
            <>
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground">提及公司</h3>
                <CompanyTags companies={item.companies} />
              </div>
              <Separator />
            </>
          )}

          {/* Metadata */}
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
        </div>
      </DialogContent>
    </Dialog>
  )
}