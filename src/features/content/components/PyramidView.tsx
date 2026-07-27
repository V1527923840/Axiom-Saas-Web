"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  PyramidIcon,
  Lightbulb,
  CheckCircle2,
  Quote,
  Layers,
  Filter,
  FileText,
} from "lucide-react"

/**
 * PyramidView — visualizes the 6-layer pyramid protocol as an actual
 * pyramid (top = core, base = facts). Shows:
 *
 *   ▲ core_view (核心观点)         ← top, smallest
 *  ▲▲ mid_view (中层观点)
 * ▲▲▲ base_view (基础观点)
 * facts (原始事实)                 ← bottom, widest
 *
 * Each layer is rendered as a horizontal "band" — width grows as you
 * descend, mimicking pyramid shape. Cross-layer IDs are bound: hovering
 * or scrolling reveals the linked items in adjacent layers.
 */

type Fact = { id: string; text: string }
type InductionGroup = {
  id: string
  facts: string[]
  dimension?: string
  common_pattern?: string
}
type BaseView = {
  id: string
  content: string
  source_fact_refs?: string[]
}
type MidView = {
  id: string
  content: string
  reasoning_dimension?: string
  supporting_base_ids?: string[]
}
type CoreView = {
  id: string
  content: string
  premises?: string[]
  conclusion?: string
  deduction_formula?: string
  supporting_mid_ids?: string[]
}
type PyramidJudgement = {
  feedback?: string
  judged_at?: string
  depth_score?: number
  logic_score?: number
}

interface PyramidViewProps {
  pyramidVersion?: string | null
  classificationMethod?: string | null
  rawFacts?: unknown
  inductionGroups?: unknown
  baseView?: unknown
  midView?: unknown
  coreView?: unknown
  pyramidJudgement?: unknown
}

function isEmpty(value: unknown): boolean {
  if (value == null) return true
  if (typeof value === "string") return value.trim() === ""
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === "object") return Object.keys(value as object).length === 0
  return false
}

function normalizeFacts(value: unknown): Fact[] {
  if (!Array.isArray(value)) return []
  return value
    .filter(
      (item): item is Record<string, unknown> =>
        typeof item === "object" && item !== null,
    )
    .map((item) => ({
      id: String(item.id ?? ""),
      text: String(item.text ?? ""),
    }))
    .filter((f) => f.id || f.text)
}

function normalizeGroups(value: unknown): InductionGroup[] {
  if (!Array.isArray(value)) return []
  return value
    .filter(
      (item): item is Record<string, unknown> =>
        typeof item === "object" && item !== null,
    )
    .map((item) => ({
      id: String(item.id ?? ""),
      facts: Array.isArray(item.facts)
        ? (item.facts as unknown[]).map((f) => String(f))
        : [],
      dimension: item.dimension ? String(item.dimension) : undefined,
      common_pattern: item.common_pattern
        ? String(item.common_pattern)
        : undefined,
    }))
    .filter((g) => g.id)
}

function normalizeBaseView(value: unknown): BaseView[] {
  if (!Array.isArray(value)) return []
  return value
    .filter(
      (item): item is Record<string, unknown> =>
        typeof item === "object" && item !== null,
    )
    .map((item) => ({
      id: String(item.id ?? ""),
      content: String(item.content ?? ""),
      source_fact_refs: Array.isArray(item.source_fact_refs)
        ? (item.source_fact_refs as unknown[]).map((s) => String(s))
        : undefined,
    }))
    .filter((b) => b.id)
}

function normalizeMidView(value: unknown): MidView[] {
  if (!Array.isArray(value)) return []
  return value
    .filter(
      (item): item is Record<string, unknown> =>
        typeof item === "object" && item !== null,
    )
    .map((item) => ({
      id: String(item.id ?? ""),
      content: String(item.content ?? ""),
      reasoning_dimension: item.reasoning_dimension
        ? String(item.reasoning_dimension)
        : undefined,
      supporting_base_ids: Array.isArray(item.supporting_base_ids)
        ? (item.supporting_base_ids as unknown[]).map((s) => String(s))
        : undefined,
    }))
    .filter((m) => m.id)
}

function normalizeCoreView(value: unknown): CoreView | null {
  if (typeof value !== "object" || value === null) return null
  const v = value as Record<string, unknown>
  if (!v.id) return null
  return {
    id: String(v.id),
    content: String(v.content ?? ""),
    premises: Array.isArray(v.premises)
      ? (v.premises as unknown[]).map((p) => String(p))
      : undefined,
    conclusion: v.conclusion ? String(v.conclusion) : undefined,
    deduction_formula: v.deduction_formula
      ? String(v.deduction_formula)
      : undefined,
    supporting_mid_ids: Array.isArray(v.supporting_mid_ids)
      ? (v.supporting_mid_ids as unknown[]).map((s) => String(s))
      : undefined,
  }
}

function normalizeJudgement(value: unknown): PyramidJudgement | null {
  if (typeof value !== "object" || value === null) return null
  const v = value as Record<string, unknown>
  return {
    feedback: v.feedback ? String(v.feedback) : undefined,
    judged_at: v.judged_at ? String(v.judged_at) : undefined,
    depth_score: typeof v.depth_score === "number" ? v.depth_score : undefined,
    logic_score: typeof v.logic_score === "number" ? v.logic_score : undefined,
  }
}

/* -------------------------------------------------------------------- */
/* Pyramid-shaped layout (trapezoid bands)                                */
/* -------------------------------------------------------------------- */

function PyramidLayout({
  facts,
  bases,
  mids,
  core,
  factById,
  baseById,
  midById,
}: {
  facts: Fact[]
  bases: BaseView[]
  mids: MidView[]
  core: CoreView | null
  factById: Map<string, Fact>
  baseById: Map<string, BaseView>
  midById: Map<string, MidView>
}) {
  // Pyramid widths (CSS % of parent) — top is narrowest
  const WIDTH = {
    core: 40,
    mid: 60,
    base: 85,
  }

  return (
    <div className="flex flex-col items-center gap-3 py-4">
      {/* Top: Core view (narrowest) */}
      {core && (
        <div
          className="relative bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-300 dark:border-amber-700 rounded-lg p-4 shadow-sm"
          style={{ width: `${WIDTH.core}%`, minWidth: "320px" }}
        >
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full font-mono">
            c
          </div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Lightbulb className="size-4 text-amber-600" />
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">
              核心观点
            </span>
            <span className="text-xs font-mono text-muted-foreground">
              {core.id}
            </span>
            {core.deduction_formula && (
              <Badge variant="default" className="text-[10px] font-mono">
                {core.deduction_formula}
              </Badge>
            )}
          </div>
          <p className="text-sm leading-relaxed font-medium">{core.content}</p>
          {core.premises && core.premises.length > 0 && (
            <div className="mt-2 pt-2 border-t border-amber-200 dark:border-amber-800">
              <div className="text-xs font-semibold text-amber-700 dark:text-amber-300 mb-1">
                推理前提
              </div>
              <ol className="space-y-1">
                {core.premises.map((p, idx) => (
                  <li key={idx} className="flex gap-2 text-xs">
                    <span className="shrink-0 w-4 h-4 flex items-center justify-center rounded-full bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100 text-[10px] font-medium">
                      {idx + 1}
                    </span>
                    <span className="leading-relaxed">{p}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
          {core.conclusion && (
            <div className="mt-2 pt-2 border-t border-amber-200 dark:border-amber-800">
              <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1">
                结论
              </div>
              <p className="text-xs leading-relaxed bg-emerald-50 dark:bg-emerald-950/30 border-l-2 border-emerald-500 p-1.5 rounded">
                {core.conclusion}
              </p>
            </div>
          )}
          {core.supporting_mid_ids && core.supporting_mid_ids.length > 0 && (
            <div className="mt-2 pt-2 border-t border-amber-200 dark:border-amber-800">
              <div className="text-[10px] text-muted-foreground mb-1">
                ↑ 基于下方中层观点
              </div>
              <div className="flex flex-wrap gap-1">
                {core.supporting_mid_ids.map((midId) => (
                  <span
                    key={midId}
                    className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300"
                  >
                    ↑ {midId}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Connecting arrow ↓ */}
      {core && mids.length > 0 && (
        <div className="text-muted-foreground text-lg leading-none">↓</div>
      )}

      {/* Mid view */}
      {mids.length > 0 && (
        <div
          className="relative bg-indigo-50 dark:bg-indigo-950/30 border-2 border-indigo-200 dark:border-indigo-800 rounded-lg p-4 shadow-sm"
          style={{ width: `${WIDTH.mid}%`, minWidth: "320px" }}
        >
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-500 text-white text-xs px-2 py-0.5 rounded-full font-mono">
            m
          </div>
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <Layers className="size-4 text-indigo-600" />
            <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">
              中层观点
            </span>
            <Badge variant="outline" className="text-[10px]">
              {mids.length} 个
            </Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {mids.map((m) => (
              <div
                key={m.id}
                className="bg-white/70 dark:bg-black/20 rounded p-2 text-xs space-y-1 border border-indigo-100 dark:border-indigo-900"
              >
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-mono text-indigo-700 dark:text-indigo-300">
                    {m.id}
                  </span>
                  {m.reasoning_dimension && (
                    <Badge variant="outline" className="text-[10px]">
                      {m.reasoning_dimension}
                    </Badge>
                  )}
                </div>
                <p className="leading-relaxed">{m.content}</p>
                {m.supporting_base_ids &&
                  m.supporting_base_ids.length > 0 && (
                    <div className="pt-1 border-t border-indigo-100 dark:border-indigo-900">
                      <div className="text-[10px] text-muted-foreground mb-1">
                        ↓ 基于下方基础观点
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {m.supporting_base_ids.map((bid) => (
                          <span
                            key={bid}
                            className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300"
                          >
                            ↓ {bid}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Connecting arrow */}
      {(core || mids.length > 0) && bases.length > 0 && (
        <div className="text-muted-foreground text-lg leading-none">↓</div>
      )}

      {/* Base view */}
      {bases.length > 0 && (
        <div
          className="relative bg-blue-50 dark:bg-blue-950/30 border-2 border-blue-200 dark:border-blue-800 rounded-lg p-4 shadow-sm"
          style={{ width: `${WIDTH.base}%`, minWidth: "320px" }}
        >
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full font-mono">
            b
          </div>
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <Quote className="size-4 text-blue-600" />
            <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">
              基础观点
            </span>
            <Badge variant="outline" className="text-[10px]">
              {bases.length} 个
            </Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {bases.map((b) => (
              <div
                key={b.id}
                className="bg-white/70 dark:bg-black/20 rounded p-2 text-xs space-y-1 border border-blue-100 dark:border-blue-900"
              >
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-blue-700 dark:text-blue-300">
                    {b.id}
                  </span>
                </div>
                <p className="leading-relaxed">{b.content}</p>
                {b.source_fact_refs && b.source_fact_refs.length > 0 && (
                  <div className="pt-1 border-t border-blue-100 dark:border-blue-900">
                    <div className="text-[10px] text-muted-foreground mb-1">
                      ↓ 基于原始事实
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {b.source_fact_refs.map((fid) => (
                        <span
                          key={fid}
                          className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                        >
                          ↓ {fid}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Connecting arrow */}
      {bases.length > 0 && facts.length > 0 && (
        <div className="text-muted-foreground text-lg leading-none">↓</div>
      )}

      {/* Facts — full width */}
      {facts.length > 0 && (
        <div className="w-full relative bg-slate-50 dark:bg-slate-950/30 border-2 border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-sm">
          <div className="absolute -top-3 left-4 bg-slate-500 text-white text-xs px-2 py-0.5 rounded-full font-mono">
            f
          </div>
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <FileText className="size-4 text-slate-600" />
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              原始事实
            </span>
            <Badge variant="outline" className="text-[10px]">
              {facts.length} 个
            </Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {facts.map((f, idx) => (
              <div
                key={f.id || `f-${idx}`}
                className="bg-white/70 dark:bg-black/20 rounded p-2 text-xs border border-slate-100 dark:border-slate-900"
              >
                <div className="font-mono text-purple-700 dark:text-purple-300 mb-1">
                  {f.id}
                </div>
                <p className="leading-relaxed">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* -------------------------------------------------------------------- */
/* Main component                                                        */
/* -------------------------------------------------------------------- */

export function PyramidView({
  pyramidVersion,
  classificationMethod,
  rawFacts,
  inductionGroups,
  baseView,
  midView,
  coreView,
  pyramidJudgement,
}: PyramidViewProps) {
  const facts = useMemo(() => normalizeFacts(rawFacts), [rawFacts])
  const groups = useMemo(
    () => normalizeGroups(inductionGroups),
    [inductionGroups],
  )
  const bases = useMemo(() => normalizeBaseView(baseView), [baseView])
  const mids = useMemo(() => normalizeMidView(midView), [midView])
  const core = useMemo(() => normalizeCoreView(coreView), [coreView])
  const judgement = useMemo(
    () => normalizeJudgement(pyramidJudgement),
    [pyramidJudgement],
  )

  const factById = useMemo(() => {
    const map = new Map<string, Fact>()
    facts.forEach((f) => map.set(f.id, f))
    return map
  }, [facts])

  const baseById = useMemo(() => {
    const map = new Map<string, BaseView>()
    bases.forEach((b) => map.set(b.id, b))
    return map
  }, [bases])

  const midById = useMemo(() => {
    const map = new Map<string, MidView>()
    mids.forEach((m) => map.set(m.id, m))
    return map
  }, [mids])

  const allEmpty =
    facts.length === 0 &&
    groups.length === 0 &&
    bases.length === 0 &&
    mids.length === 0 &&
    !core &&
    !judgement

  if (allEmpty) {
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
        <p className="text-xs text-muted-foreground mt-1">
          自上而下推理:核心观点 ← 中层观点 ← 基础观点 ← 原始事实
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Pyramid visual */}
        <PyramidLayout
          facts={facts}
          bases={bases}
          mids={mids}
          core={core}
          factById={factById}
          baseById={baseById}
          midById={midById}
        />

        {/* Induction groups — shown as a sidebar-style strip below the pyramid */}
        {groups.length > 0 && (
          <div className="border-t pt-3 mt-2">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Filter className="size-4 text-cyan-600" />
              <span className="text-xs font-semibold text-cyan-700 dark:text-cyan-300">
                归纳分组
              </span>
              <Badge variant="outline" className="text-[10px]">
                {groups.length} 个
              </Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {groups.map((g) => (
                <div
                  key={g.id}
                  className="bg-cyan-50/50 dark:bg-cyan-950/20 border border-cyan-200 dark:border-cyan-900 rounded p-2 text-xs space-y-1"
                >
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {g.dimension && (
                      <Badge variant="outline" className="text-[10px]">
                        {g.dimension}
                      </Badge>
                    )}
                    <span className="font-mono text-cyan-700 dark:text-cyan-300">
                      {g.id}
                    </span>
                  </div>
                  {g.common_pattern && (
                    <p className="leading-relaxed">{g.common_pattern}</p>
                  )}
                  <div className="flex flex-wrap gap-1 pt-1 border-t border-cyan-100 dark:border-cyan-900">
                    {g.facts.map((fid) => (
                      <span
                        key={fid}
                        className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                      >
                        {fid}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Judgement */}
        {judgement && (
          <div className="border-t pt-3 mt-2">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <CheckCircle2 className="size-4 text-emerald-600" />
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                研判
              </span>
            </div>
            <div className="bg-emerald-50/30 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded p-3 space-y-2">
              <div className="flex items-center gap-3 flex-wrap">
                {typeof judgement.depth_score === "number" && (
                  <ScoreBadge label="深度分" value={judgement.depth_score} />
                )}
                {typeof judgement.logic_score === "number" && (
                  <ScoreBadge label="逻辑分" value={judgement.logic_score} />
                )}
                {judgement.judged_at && (
                  <span className="text-xs text-muted-foreground">
                    {new Date(judgement.judged_at).toLocaleString("zh-CN")}
                  </span>
                )}
              </div>
              {judgement.feedback && (
                <p className="text-sm leading-relaxed whitespace-pre-wrap border-t border-emerald-100 dark:border-emerald-900 pt-2">
                  {judgement.feedback}
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ScoreBadge({ label, value }: { label: string; value: number }) {
  const variant =
    value >= 8 ? "default" : value >= 6 ? "secondary" : "outline"
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <Badge variant={variant} className="font-mono">
        {value.toFixed(1)}
      </Badge>
    </div>
  )
}