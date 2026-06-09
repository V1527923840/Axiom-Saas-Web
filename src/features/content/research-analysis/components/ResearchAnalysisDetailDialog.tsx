"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import type { ResearchAnalysisDetail } from "../types"
import { DIMENSION_NAME_MAP } from "../types"
import { PdfRenderer } from "./PdfRenderer"
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts"

const RADIAN_DIMENSIONS = [
  'sourceCredibility',
  'timelinessScore',
  'dataDensity',
  'differentiationScore',
  'actionability',
  'riskDisclosure',
] as const

const OSS_BASE_URL = (import.meta.env.VITE_OSS_BASE_URL || "").replace(/%2F/g, "/")

function ResearchScoreRadar({ item }: { item: ResearchAnalysisDetail }) {
  const chartData = RADIAN_DIMENSIONS.map((key) => ({
    dimension: DIMENSION_NAME_MAP[key] || key,
    value: item[key] as number,
    fullMark: 10,
  }))

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-muted-foreground">六维评分</h3>
      <ResponsiveContainer width="100%" height={300}>
        <RadarChart data={chartData}>
          <PolarGrid stroke="hsl(var(--border))" />
          <PolarAngleAxis
            dataKey="dimension"
            tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 10]}
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          />
          <Radar
            name="评分"
            dataKey="value"
            stroke="hsl(var(--primary))"
            fill="hsl(var(--primary))"
            fillOpacity={0.3}
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>

      {/* Legend with individual scores */}
      <div className="grid grid-cols-2 gap-2 pt-2">
        {RADIAN_DIMENSIONS.map((key) => (
          <div key={key} className="flex justify-between text-sm">
            <span className="text-muted-foreground">{DIMENSION_NAME_MAP[key]}</span>
            <span className="font-mono">{item[key] as number}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

interface ResearchAnalysisDetailDialogProps {
  item: ResearchAnalysisDetail | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

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

  const valueRatingConfig: Record<string, { label: string; className: string }> = {
    高: { label: "高价值", className: "bg-green-100 text-green-800" },
    中: { label: "中价值", className: "bg-yellow-100 text-yellow-800" },
    低: { label: "低价值", className: "bg-orange-100 text-orange-800" },
    高风险: { label: "高风险", className: "bg-red-100 text-red-800" },
  }

  const ratingConfig = valueRatingConfig[item.valueRating] || valueRatingConfig["中"]

  // Extract mentioned stocks names
  const mentionedStocks = item.mentionedStocks?.map((s: Record<string, any>) => s.name).filter(Boolean) || []
  const swIndustryTags = item.swIndustryTag?.map((t: Record<string, any>) => t.name || t.industry || String(t)).filter(Boolean) || []

  // Build PDF URL from ossUrl (preferred) or fallback to sourceFileKey
  const pdfKey = item.ossUrl || item.sourceFileKey
  const pdfUrl = pdfKey ? `${OSS_BASE_URL}/${pdfKey}` : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] flex flex-col lg:max-w-6xl xl:max-w-7xl md:max-w-4xl sm:max-w-2xl">
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-xl leading-tight pr-8">{item.documentName}</DialogTitle>
          <div className="flex gap-2 mt-2 flex-wrap items-center">
            {/* Analyzed Date Badge */}
            {item.analyzedAt && (
              <Badge variant="secondary">
                分析: {formatDate(item.analyzedAt)}
              </Badge>
            )}
            {/* Value Rating Badge */}
            <Badge className={ratingConfig.className}>
              {ratingConfig.label}
            </Badge>
            {/* Recommendation Badge */}
            {item.recommendation && (
              <Badge variant="outline">
                建议: {item.recommendation}
              </Badge>
            )}
            {/* Target Price Badge */}
            {item.targetPrice && (
              <Badge variant="outline">
                目标价: {item.targetPrice}
              </Badge>
            )}
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
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
            {/* Left Column - Details */}
            <div className="space-y-4 overflow-y-auto min-h-0">
              {/* Key Thesis Section */}
              {item.keyThesis && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-muted-foreground">核心观点</h3>
                  <p className="text-sm leading-relaxed">{item.keyThesis}</p>
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
                      <span className="font-mono text-lg">{item.overallScore}</span>
                    </span>
                    {item.confidenceFactor && (
                      <span className="text-sm">
                        <span className="text-muted-foreground">置信度: </span>
                        <span className="font-mono">{(Number(item.confidenceFactor) * 100).toFixed(0)}%</span>
                      </span>
                    )}
                  </div>
                </div>
                <ResearchScoreRadar item={item} />
              </div>

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

              {/* Investment Info */}
              {(item.investmentHorizon || item.impactLevel || item.marketSentiment) && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-muted-foreground">投资信息</h3>
                  <div className="flex flex-wrap gap-2">
                    {item.investmentHorizon && (
                      <Badge variant="outline">投资周期: {item.investmentHorizon}</Badge>
                    )}
                    {item.impactLevel && (
                      <Badge variant="outline">影响级别: {item.impactLevel}</Badge>
                    )}
                    {item.marketSentiment && (
                      <Badge variant="outline">市场情绪: {item.marketSentiment}</Badge>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Original Content */}
            <div className="space-y-2 flex-1 min-h-0 flex flex-col">
              <div className="flex items-center justify-between shrink-0">
                <h3 className="text-sm font-semibold text-muted-foreground">原文内容</h3>
              </div>

              {/* PDF Preview */}
              {pdfUrl && (
                <div className="flex-1 min-h-0">
                  <PdfRenderer url={pdfUrl} className="h-full" />
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}