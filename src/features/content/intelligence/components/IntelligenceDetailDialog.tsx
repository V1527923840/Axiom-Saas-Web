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
import { processMarkdownImages } from "@/lib/oss-url"
import type { IntelligenceDetail } from "../types"
import { PyramidView } from "@/features/content/components/PyramidView"

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

  const mentionedStocks = item.stockMapping?.mentionedStocks || []
  const swIndustryTags = item.swIndustryTag || []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] flex flex-col" size="70vw">
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-xl leading-tight pr-8">{item.title}</DialogTitle>
          <div className="flex gap-2 mt-2 flex-wrap items-center">
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
            {item.postDate && (
              <Badge variant="secondary">
                发布: {formatDate(item.postDate)}
              </Badge>
            )}
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
            <div className="space-y-4 overflow-y-auto pr-2">
              {/* Summary Section */}
              {item.summary && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-muted-foreground">一句话总结</h3>
                  <p className="text-sm leading-relaxed">{item.summary}</p>
                </div>
              )}

              {/* Pyramid View */}
              <PyramidView
                pyramidVersion={item.pyramidVersion}
                classificationMethod={item.classificationMethod}
                rawFacts={item.rawFacts}
                inductionGroups={item.inductionGroups}
                baseView={item.baseView}
                midView={item.midView}
                coreView={item.coreView}
                pyramidJudgement={item.pyramidJudgement}
              />

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
            </div>

            {/* Right Column - Original Content */}
            <div className="space-y-3 h-full flex flex-col">
              {(item.originalText || item.originalTextRaw) && (
                <div className="space-y-2 flex-1 min-h-0 flex flex-col">
                  <h3 className="text-sm font-semibold text-muted-foreground shrink-0">原文内容</h3>
                  <ScrollArea className="flex-1 w-full rounded-md border p-4">
                    {item.originalTextRaw ? (
                      <div className="text-sm leading-relaxed prose prose-sm max-w-none dark:prose-invert">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {processMarkdownImages(item.originalTextRaw)}
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
        </div>
      </DialogContent>
    </Dialog>
  )
}