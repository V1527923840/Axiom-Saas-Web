"use client"

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts"
import type { IntelligenceDetail as IntelligenceItem } from "../types"
import { DIMENSION_NAME_MAP } from "../types"

interface IntelligenceScoreRadarProps {
  item: IntelligenceItem
}

const RADIAN_DIMENSIONS = [
  'sourceCredibility',
  'timelinessScore',
  'dataDensity',
  'differentiationScore',
  'actionability',
  'riskDisclosure',
] as const

export function IntelligenceScoreRadar({ item }: IntelligenceScoreRadarProps) {
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