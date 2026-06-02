"use client"

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { IntelligenceDetail } from "../types"
import { IntelligenceScoreRadar } from "./IntelligenceScoreRadar"

const OSS_BASE_URL = (import.meta.env.VITE_OSS_BASE_URL || "").replace(/%2F/g, "/")

function processMarkdownImages(content: string, version?: string | null): string {
  if (!content) return ""
  // Replace local image paths like ![alt](pictures/xxx.jpg) with ![alt](${OSS_BASE_URL}/${version}/pictures/xxx.jpg)
  if (OSS_BASE_URL && version) {
    return content.replace(/!\[([^\]]*)\]\((pictures\/[^)]+)\)/gu, (_, alt, path) => {
      return `![${alt}](${OSS_BASE_URL}/${version}/${path})`
    })
  }
  return content
}

interface IntelligenceDetailDialogProps {
  item: IntelligenceDetail | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function IntelligenceDetailDialog({
  item,
  open,
  onOpenChange,
}: IntelligenceDetailDialogProps) {
  if (!item) return null

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const valueRatingConfig: Record<string, { label: string; className: string }> = {
    高: { label: "高价值", className: "bg-green-100 text-green-800" },
    中: { label: "中价值", className: "bg-yellow-100 text-yellow-800" },
    低: { label: "低价值", className: "bg-orange-100 text-orange-800" },
    高风险: { label: "高风险", className: "bg-red-100 text-red-800" },
  }

  const ratingConfig = valueRatingConfig[item.valueRating] || valueRatingConfig["中"]

  // Stock mapping - mentioned stocks
  const mentionedStocks = item.stockMapping?.mentionedStocks || []
  const swIndustryTags = item.swIndustryTag || []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] flex flex-col" size="70vw">
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-xl leading-tight pr-8">{item.title}</DialogTitle>
          <div className="flex gap-2 mt-2 flex-wrap items-center">
            {/* Author and Group */}
            {item.author && (
              <Badge variant="outline">
                作者: {item.author}
              </Badge>
            )}
            {item.groupName && (
              <Badge variant="outline">
                群组: {item.groupName}
              </Badge>
            )}
            {/* Post Date Badge */}
            {item.postDate && (
              <Badge variant="secondary">
                发布: {formatDate(item.postDate)}
              </Badge>
            )}
            {/* Value Rating Badge */}
            <Badge className={ratingConfig.className}>
              {ratingConfig.label}
            </Badge>
            {/* Classification Tags */}
            {item.categoryL1 && (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                {item.categoryL1}
              </Badge>
            )}
            {item.categoryL2 && (
              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                {item.categoryL2}
              </Badge>
            )}
            {swIndustryTags.map((tag, idx) => (
              <Badge key={idx} variant="outline" className="bg-teal-50 text-teal-700 border-teal-200">
                {tag}
              </Badge>
            ))}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="grid grid-cols-2 gap-6 h-full">
            {/* Left Column - Details */}
            <div className="space-y-4 overflow-y-auto">
              {/* Summary Section */}
              {item.summary && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-muted-foreground">一句话总结</h3>
                  <p className="text-sm leading-relaxed">{item.summary}</p>
                </div>
              )}

              {/* Summary Points */}
              {item.summaryPoints && item.summaryPoints.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-muted-foreground">核心要点</h3>
                  <ul className="space-y-2">
                    {item.summaryPoints.map((point, idx) => (
                      <li key={idx} className="flex gap-3 text-sm">
                        <span className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-medium">
                          {idx + 1}
                        </span>
                        <span className="leading-relaxed">{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Score Section - Radar Chart */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-muted-foreground">综合评分</h3>
                  <div className="flex items-center gap-4">
                    <span className="text-sm">
                      <span className="text-muted-foreground">总分: </span>
                      <span className="font-mono text-lg">{item.totalScore}</span>
                    </span>
                    <span className="text-sm">
                      <span className="text-muted-foreground">置信度: </span>
                      <span className="font-mono">{(item.confidenceFactor * 100).toFixed(0)}%</span>
                    </span>
                  </div>
                </div>
                <IntelligenceScoreRadar item={item} />
              </div>

              {/* Stock Mapping */}
              {mentionedStocks.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-muted-foreground">提及股票</h3>
                  <div className="flex flex-wrap gap-2">
                    {mentionedStocks.map((stock, idx) => (
                      <Badge key={idx} variant="outline" className="bg-sky-50 text-sky-700 border-sky-200">
                        {stock.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Metadata */}
            </div>

            {/* Right Column - Original Content */}
            {(item.originalText || item.originalTextRaw) && (
              <div className="space-y-2 h-full flex flex-col">
                <h3 className="text-sm font-semibold text-muted-foreground shrink-0">原文内容</h3>
                <ScrollArea className="flex-1 w-full rounded-md border p-4">
                  {item.originalTextRaw ? (
                    <div className="text-sm leading-relaxed prose prose-sm max-w-none dark:prose-invert">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {processMarkdownImages(item.originalTextRaw, item.version)}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {item.originalText}
                    </p>
                  )}
                </ScrollArea>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}