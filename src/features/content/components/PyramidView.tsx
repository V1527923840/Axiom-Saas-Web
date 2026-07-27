"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronRight, PyramidIcon } from "lucide-react"

/**
 * PyramidView — visualizes the 6-layer pyramid protocol
 *
 * Layer 1 — rawFacts      : 原始事实
 * Layer 2 — inductionGroups : 归纳分组
 * Layer 3 — baseView       : 基础观点
 * Layer 4 — midView        : 中层观点
 * Layer 5 — coreView       : 核心观点 (含 deduction_formula)
 * Layer 6 — pyramidJudgement : 研判
 *
 * Each layer is collapsible. JSONB payloads are rendered as a formatted
 * tree (no fancy markdown — this data is structured, not narrative).
 */

type PyramidLayerKey =
  | "rawFacts"
  | "inductionGroups"
  | "baseView"
  | "midView"
  | "coreView"
  | "pyramidJudgement"

const LAYER_META: Array<{
  key: PyramidLayerKey
  index: number
  title: string
  subtitle: string
}> = [
  { key: "rawFacts", index: 1, title: "原始事实", subtitle: "rawFacts" },
  { key: "inductionGroups", index: 2, title: "归纳分组", subtitle: "inductionGroups" },
  { key: "baseView", index: 3, title: "基础观点", subtitle: "baseView" },
  { key: "midView", index: 4, title: "中层观点", subtitle: "midView" },
  { key: "coreView", index: 5, title: "核心观点", subtitle: "coreView" },
  { key: "pyramidJudgement", index: 6, title: "研判", subtitle: "pyramidJudgement" },
]

function isEmpty(value: unknown): boolean {
  if (value == null) return true
  if (typeof value === "string") return value.trim() === ""
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === "object") return Object.keys(value as object).length === 0
  return false
}

function JsonTree({ value, depth = 0 }: { value: unknown; depth?: number }) {
  if (value == null) return <span className="text-muted-foreground">null</span>
  if (typeof value === "string")
    return <span className="text-green-700 dark:text-green-400">&quot;{value}&quot;</span>
  if (typeof value === "number" || typeof value === "boolean")
    return <span className="text-blue-700 dark:text-blue-400">{String(value)}</span>
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-muted-foreground">[]</span>
    return (
      <ul className="space-y-1 pl-4 border-l border-border/40">
        {value.map((item, idx) => (
          <li key={idx} className="flex gap-2">
            <span className="text-muted-foreground font-mono text-xs">[{idx}]</span>
            <JsonTree value={item} depth={depth + 1} />
          </li>
        ))}
      </ul>
    )
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
    if (entries.length === 0) return <span className="text-muted-foreground">{"{}"}</span>
    return (
      <ul className="space-y-1 pl-4 border-l border-border/40">
        {entries.map(([k, v]) => (
          <li key={k} className="flex gap-2 flex-wrap">
            <span className="font-mono text-xs text-purple-700 dark:text-purple-400">
              {k}:
            </span>
            <JsonTree value={v} depth={depth + 1} />
          </li>
        ))}
      </ul>
    )
  }
  return <span>{String(value)}</span>
}

interface PyramidViewProps {
  pyramidVersion?: string | null
  classificationMethod?: string | null
  data: Partial<Record<PyramidLayerKey, unknown>>
}

export function PyramidView({
  pyramidVersion,
  classificationMethod,
  data,
}: PyramidViewProps) {
  // Open the top 3 layers by default (rawFacts, inductionGroups, baseView)
  const [open, setOpen] = useState<Record<PyramidLayerKey, boolean>>({
    rawFacts: true,
    inductionGroups: true,
    baseView: true,
    midView: false,
    coreView: true,
    pyramidJudgement: true,
  })

  const toggle = (k: PyramidLayerKey) =>
    setOpen((prev) => ({ ...prev, [k]: !prev[k] }))

  const populatedLayers = LAYER_META.filter((l) => !isEmpty(data[l.key]))
  if (populatedLayers.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <PyramidIcon className="size-4" />
              金字塔观点
            </CardTitle>
            {pyramidVersion && (
              <Badge variant="outline" className="text-xs">
                {pyramidVersion}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            该条目尚未填充金字塔分析数据
            {classificationMethod && (
              <>
                {" "}
                <span className="font-mono">({classificationMethod})</span>
              </>
            )}
            。
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <PyramidIcon className="size-4" />
            金字塔观点
          </CardTitle>
          <div className="flex items-center gap-2">
            {classificationMethod && (
              <Badge variant="outline" className="text-xs">
                {classificationMethod}
              </Badge>
            )}
            {pyramidVersion && (
              <Badge variant="default" className="text-xs">
                {pyramidVersion}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {LAYER_META.map((layer) => {
          const value = data[layer.key]
          if (isEmpty(value)) return null
          const isOpen = open[layer.key]
          return (
            <div key={layer.key} className="border rounded-md">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => toggle(layer.key)}
                className="w-full justify-between cursor-pointer hover:bg-muted/40 px-3 py-2 h-auto"
              >
                <div className="flex items-center gap-2 text-left">
                  {isOpen ? (
                    <ChevronDown className="size-4 shrink-0" />
                  ) : (
                    <ChevronRight className="size-4 shrink-0" />
                  )}
                  <span className="text-xs font-mono text-muted-foreground">
                    L{layer.index}
                  </span>
                  <span className="text-sm font-medium">{layer.title}</span>
                </div>
                <span className="text-xs text-muted-foreground font-mono">
                  {layer.subtitle}
                </span>
              </Button>
              {isOpen && (
                <div className="px-3 pb-3 text-xs leading-relaxed">
                  <JsonTree value={value} />
                </div>
              )}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}