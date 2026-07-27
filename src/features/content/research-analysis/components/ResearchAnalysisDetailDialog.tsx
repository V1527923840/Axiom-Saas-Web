"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import type { ResearchAnalysisDetail } from "../types"
import { PyramidView } from "@/features/content/components/PyramidView"
import { PdfRenderer } from "./PdfRenderer"

interface ResearchAnalysisDetailDialogProps {
  item: ResearchAnalysisDetail | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const OSS_BASE_URL = (import.meta.env.VITE_OSS_BASE_URL || "").replace(/%2F/g, "/")

export function ResearchAnalysisDetailDialog({
  item,
  open,
  onOpenChange,
}: ResearchAnalysisDetailDialogProps) {
  if (!item) return null

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return null
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return null
    return date.toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  // Extract mentioned stocks names
  const mentionedStocks =
    item.mentionedStocks
      ?.map((s: Record<string, any>) => s.name)
      .filter(Boolean) || []
  const swIndustryTags =
    item.swIndustryTag
      ?.map((t: Record<string, any>) => t.name || t.industry || String(t))
      .filter(Boolean) || []

  // Build PDF URL from ossUrl (preferred) or fallback to sourceFileKey
  const pdfKey = item.ossUrl || item.sourceFileKey
  const pdfUrl = pdfKey ? `${OSS_BASE_URL}/${pdfKey}` : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] flex flex-col lg:max-w-6xl xl:max-w-7xl md:max-w-4xl sm:max-w-2xl">
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-xl leading-tight pr-8">{item.documentName}</DialogTitle>
          <div className="flex gap-2 mt-2 flex-wrap items-center">
            {item.analyzedAt && (
              <Badge variant="secondary">
                分析: {formatDate(item.analyzedAt)}
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
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
            {/* Left Column - Details */}
            <div className="space-y-4 overflow-y-auto min-h-0 pr-2">
              {/* Key Thesis Section */}
              {item.keyThesis && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-muted-foreground">核心观点</h3>
                  <p className="text-sm leading-relaxed">{item.keyThesis}</p>
                </div>
              )}

              {/* Pyramid View */}
              <PyramidView
                pyramidVersion={item.pyramidVersion}
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
                        {stock}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* SW Industry Tags */}
              {swIndustryTags.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-muted-foreground">申万行业</h3>
                  <div className="flex flex-wrap gap-2">
                    {swIndustryTags.map((tag, idx) => (
                      <Badge key={idx} variant="outline" className="bg-teal-50 text-teal-700 border-teal-200">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - PDF Preview */}
            <div className="space-y-2 flex-1 min-h-0 flex flex-col">
              <div className="flex items-center justify-between shrink-0">
                <h3 className="text-sm font-semibold text-muted-foreground">原文 PDF</h3>
              </div>
              {pdfUrl ? (
                <div className="flex-1 min-h-0">
                  <PdfRenderer url={pdfUrl} className="h-full" />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">未提供 PDF 链接</p>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}