"use client"

import { Badge } from "@/components/ui/badge"
import type { Sentiment } from "../types"

interface SentimentBadgeProps {
  sentiment: Sentiment
}

const sentimentConfig: Record<Sentiment, { label: string; className: string }> = {
  positive: { label: "正面", className: "bg-green-100 text-green-800" },
  negative: { label: "负面", className: "bg-red-100 text-red-800" },
  neutral: { label: "中性", className: "bg-gray-100 text-gray-800" },
}

export function SentimentBadge({ sentiment }: SentimentBadgeProps) {
  const config = sentimentConfig[sentiment] || sentimentConfig.neutral
  return <Badge className={config.className}>{config.label}</Badge>
}