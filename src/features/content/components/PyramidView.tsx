"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  PyramidIcon,
  Lightbulb,
  CheckCircle2,
  Quote,
  Layers,
  Filter,
  FileText,
  ArrowDown,
} from "lucide-react"

/**
 * PyramidView — vertical reading flow: each layer rendered as full-width
 * cards stacked top-to-bottom so users can compare items line-by-line.
 *
 * Reading order: CORE → supporting MIDs → supporting BASES → grounding FACTS.
 * Cross-references between layers are shown as inline chips (↑ supported
 * by, ↓ grounded in) so the reader never has to context-switch.
 *
 *   ┌─ 核心观点 (60% wide, amber) ──────────────────┐
 *   │ content + premises + conclusion                │
 *   │ ↑ supported by: [m-0, m-1, m-2]               │
 *   └────────────────────────────────────────────────┘
 *                          ↓
 *   ┌─ 中层观点 (75% wide, indigo) ──────────────────┐
 *   │ m-0  维度: 时间                                │
 *   │ content...                                     │
 *   │ ↑ supported by: [b-0, b-1, b-2, b-3, ...]    │
 *   │ ────────────────────────────────────────────   │
 *   │ m-1  维度: 空间                                │
 *   │ ...                                            │
 *   └────────────────────────────────────────────────┘
 *                          ↓
 *   ┌─ 基础观点 (90% wide, blue) ───────────────────┐
 *   │ b-0                                            │
 *   │ content...                                     │
 *   │ ↓ grounded in: [f-0-0, f-0-1, ...]            │
 *   └────────────────────────────────────────────────┘
 *                          ↓
 *   ┌─ 原始事实 (100% wide, slate) ──────────────────┐
 *   │ f-0-0  text...                                 │
 *   │ f-0-1  text...                                 │
 *   └────────────────────────────────────────────────┘
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
/* Reusable bits                                                         */
/* -------------------------------------------------------------------- */

function LayerBadge({
  letter,
  color,
}: {
  letter: string
  color: "amber" | "indigo" | "blue" | "slate"
}) {
  const bg = {
    amber: "bg-amber-500",
    indigo: "bg-indigo-500",
    blue: "bg-blue-500",
    slate: "bg-slate-500",
  }[color]
  return (
    <span
      className={`inline-flex items-center justify-center size-6 rounded-full ${bg} text-white text-xs font-mono font-semibold shadow-sm`}
    >
      {letter}
    </span>
  )
}

function RefChip({
  id,
  direction,
  tone = "neutral",
}: {
  id: string
  direction: "up" | "down"
  tone?: "neutral" | "warm"
}) {
  const cls =
    tone === "warm"
      ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900"
      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-mono px-1.5 py-0.5 rounded border ${cls}`}
    >
      <span className="opacity-60">{direction === "up" ? "↑" : "↓"}</span>
      {id}
    </span>
  )
}

function LayerHeader({
  letter,
  color,
  icon,
  title,
  count,
  readingHint,
}: {
  letter: string
  color: "amber" | "indigo" | "blue" | "slate"
  icon: React.ReactNode
  title: string
  count?: number
  readingHint?: string
}) {
  const accent = {
    amber: "border-amber-300 dark:border-amber-700",
    indigo: "border-indigo-200 dark:border-indigo-800",
    blue: "border-blue-200 dark:border-blue-800",
    slate: "border-slate-200 dark:border-slate-800",
  }[color]
  return (
    <div
      className={`flex items-center gap-2 px-4 py-2.5 border-b ${accent} bg-background/40 sticky top-0 z-10 backdrop-blur-sm`}
    >
      <LayerBadge letter={letter} color={color} />
      {icon}
      <span className="text-sm font-semibold">{title}</span>
      {typeof count === "number" && (
        <Badge variant="outline" className="text-[10px]">
          {count}
        </Badge>
      )}
      {readingHint && (
        <span className="text-[11px] text-muted-foreground ml-auto">
          {readingHint}
        </span>
      )}
    </div>
  )
}

function Connector() {
  return (
    <div className="flex justify-center text-muted-foreground/50 -my-1">
      <ArrowDown className="size-4" />
    </div>
  )
}

/* -------------------------------------------------------------------- */
/* Layer: Core (single full-width card)                                 */
/* -------------------------------------------------------------------- */

function CoreCard({ core }: { core: CoreView }) {
  return (
    <div className="relative bg-gradient-to-b from-amber-50 to-amber-100/40 dark:from-amber-950/40 dark:to-amber-900/20 border-2 border-amber-300 dark:border-amber-700 rounded-xl shadow-md">
      <LayerHeader
        letter="c"
        color="amber"
        icon={<Lightbulb className="size-4 text-amber-600" />}
        title="核心观点"
        readingHint="thesis"
      />
      <div className="px-5 py-4 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-mono text-amber-700 dark:text-amber-300 font-semibold">
            {core.id}
          </span>
          {core.deduction_formula && (
            <Badge variant="default" className="text-[10px] font-mono">
              推理范式 {core.deduction_formula}
            </Badge>
          )}
        </div>

        <p className="text-[15px] leading-relaxed font-medium text-amber-950 dark:text-amber-100">
          {core.content}
        </p>

        {core.premises && core.premises.length > 0 && (
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300 mb-1.5">
              推理前提
            </div>
            <ol className="space-y-1.5">
              {core.premises.map((p, idx) => (
                <li key={idx} className="flex gap-2.5 text-sm">
                  <span className="shrink-0 w-5 h-5 flex items-center justify-center rounded-full bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100 text-[11px] font-semibold mt-0.5">
                    {idx + 1}
                  </span>
                  <span className="leading-relaxed text-amber-950/90 dark:text-amber-100/90">
                    {p}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {core.conclusion && (
          <div className="bg-emerald-50 dark:bg-emerald-950/40 border-l-4 border-emerald-500 rounded-r px-3 py-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300 mb-0.5">
              结论
            </div>
            <p className="text-sm leading-relaxed text-emerald-950 dark:text-emerald-100 font-medium">
              {core.conclusion}
            </p>
          </div>
        )}

        {core.supporting_mid_ids && core.supporting_mid_ids.length > 0 && (
          <div className="pt-3 border-t border-amber-200 dark:border-amber-800">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
              ↑ 基于下方中层观点
            </div>
            <div className="flex flex-wrap gap-1">
              {core.supporting_mid_ids.map((midId) => (
                <RefChip key={midId} id={midId} direction="up" tone="warm" />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------- */
/* Layer: Mid views (full-width rows, one per mid)                      */
/* -------------------------------------------------------------------- */

function MidCard({ mid }: { mid: MidView }) {
  return (
    <div className="bg-white/80 dark:bg-black/30 rounded-lg p-4 space-y-2 border border-indigo-100 dark:border-indigo-900 shadow-sm">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-mono text-indigo-700 dark:text-indigo-300 font-semibold">
          {mid.id}
        </span>
        {mid.reasoning_dimension && (
          <Badge variant="outline" className="text-[10px]">
            {mid.reasoning_dimension}
          </Badge>
        )}
      </div>
      <p className="text-sm leading-relaxed text-foreground/90">
        {mid.content}
      </p>
      {mid.supporting_base_ids && mid.supporting_base_ids.length > 0 && (
        <div className="pt-2 mt-2 border-t border-indigo-100 dark:border-indigo-900">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
            ↑ 基于下方基础观点
          </div>
          <div className="flex flex-wrap gap-1">
            {mid.supporting_base_ids.map((bid) => (
              <RefChip key={bid} id={bid} direction="up" />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function MidLayer({ mids }: { mids: MidView[] }) {
  return (
    <div className="bg-indigo-50/60 dark:bg-indigo-950/30 border-2 border-indigo-200 dark:border-indigo-800 rounded-xl shadow-sm">
      <LayerHeader
        letter="m"
        color="indigo"
        icon={<Layers className="size-4 text-indigo-600" />}
        title="中层观点"
        count={mids.length}
        readingHint={`${mids.length} 项`}
      />
      <div className="p-4 space-y-3">
        {mids.map((m, idx) => (
          <div key={m.id}>
            <MidCard mid={m} />
            {idx < mids.length - 1 && (
              <Separator className="my-3 bg-indigo-100 dark:bg-indigo-900" />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------- */
/* Layer: Base views (full-width rows, one per base)                    */
/* -------------------------------------------------------------------- */

function BaseCard({ base }: { base: BaseView }) {
  return (
    <div className="bg-white/80 dark:bg-black/30 rounded-lg p-4 space-y-2 border border-blue-100 dark:border-blue-900 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono text-blue-700 dark:text-blue-300 font-semibold">
          {base.id}
        </span>
      </div>
      <p className="text-sm leading-relaxed text-foreground/90">
        {base.content}
      </p>
      {base.source_fact_refs && base.source_fact_refs.length > 0 && (
        <div className="pt-2 mt-2 border-t border-blue-100 dark:border-blue-900">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
            ↓ 基于下方原始事实
          </div>
          <div className="flex flex-wrap gap-1">
            {base.source_fact_refs.map((fid) => (
              <RefChip key={fid} id={fid} direction="down" />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function BaseLayer({ bases }: { bases: BaseView[] }) {
  return (
    <div className="bg-blue-50/60 dark:bg-blue-950/30 border-2 border-blue-200 dark:border-blue-800 rounded-xl shadow-sm">
      <LayerHeader
        letter="b"
        color="blue"
        icon={<Quote className="size-4 text-blue-600" />}
        title="基础观点"
        count={bases.length}
        readingHint={`${bases.length} 项`}
      />
      <div className="p-4 space-y-3">
        {bases.map((b, idx) => (
          <div key={b.id}>
            <BaseCard base={b} />
            {idx < bases.length - 1 && (
              <Separator className="my-3 bg-blue-100 dark:bg-blue-900" />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------- */
/* Layer: Facts (one row per fact, full-width text)                      */
/* -------------------------------------------------------------------- */

function FactRow({ fact, index }: { fact: Fact; index: number }) {
  return (
    <div className="flex gap-3 px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 last:border-b-0 hover:bg-slate-100/40 dark:hover:bg-slate-900/40 transition-colors">
      <span className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-mono mt-0.5">
        {index + 1}
      </span>
      <span className="shrink-0 font-mono text-[11px] text-purple-700 dark:text-purple-300 font-semibold mt-1">
        {fact.id}
      </span>
      <p className="flex-1 text-sm leading-relaxed text-foreground/90">
        {fact.text}
      </p>
    </div>
  )
}

function FactsLayer({ facts }: { facts: Fact[] }) {
  return (
    <div className="bg-slate-50 dark:bg-slate-950/40 border-2 border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
      <LayerHeader
        letter="f"
        color="slate"
        icon={<FileText className="size-4 text-slate-600" />}
        title="原始事实"
        count={facts.length}
        readingHint={`${facts.length} 项`}
      />
      <div>
        {facts.map((f, idx) => (
          <FactRow key={f.id || `f-${idx}`} fact={f} index={idx} />
        ))}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------- */
/* Sidebar strips                                                         */
/* -------------------------------------------------------------------- */

function GroupsStrip({ groups }: { groups: InductionGroup[] }) {
  if (groups.length === 0) return null
  return (
    <div className="border-t pt-4 mt-2">
      <div className="flex items-center gap-2 mb-2.5">
        <Filter className="size-4 text-cyan-600" />
        <span className="text-sm font-semibold text-cyan-800 dark:text-cyan-200">
          归纳分组
        </span>
        <Badge variant="outline" className="text-[10px]">
          {groups.length} 个
        </Badge>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {groups.map((g) => (
          <div
            key={g.id}
            className="bg-cyan-50/50 dark:bg-cyan-950/20 border border-cyan-200 dark:border-cyan-900 rounded-md p-2.5 space-y-1.5"
          >
            <div className="flex items-center gap-1.5 flex-wrap">
              {g.dimension && (
                <Badge variant="outline" className="text-[10px]">
                  {g.dimension}
                </Badge>
              )}
              <span className="font-mono text-[11px] text-cyan-700 dark:text-cyan-300 font-semibold">
                {g.id}
              </span>
            </div>
            {g.common_pattern && (
              <p className="text-xs leading-relaxed text-foreground/80">
                {g.common_pattern}
              </p>
            )}
            {g.facts.length > 0 && (
              <div className="pt-1.5 mt-1.5 border-t border-cyan-100 dark:border-cyan-900 flex flex-wrap gap-1">
                {g.facts.map((fid) => (
                  <RefChip key={fid} id={fid} direction="down" />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function JudgementStrip({ judgement }: { judgement: PyramidJudgement }) {
  return (
    <div className="border-t pt-4 mt-2">
      <div className="flex items-center gap-2 mb-2.5">
        <CheckCircle2 className="size-4 text-emerald-600" />
        <span className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
          研判
        </span>
      </div>
      <div className="bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded-md p-3 space-y-2.5">
        <div className="flex items-center gap-3 flex-wrap">
          {typeof judgement.depth_score === "number" && (
            <ScoreBadge label="深度分" value={judgement.depth_score} />
          )}
          {typeof judgement.logic_score === "number" && (
            <ScoreBadge label="逻辑分" value={judgement.logic_score} />
          )}
          {judgement.judged_at && (
            <span className="text-xs text-muted-foreground ml-auto">
              {new Date(judgement.judged_at).toLocaleString("zh-CN")}
            </span>
          )}
        </div>
        {judgement.feedback && (
          <>
            <Separator />
            <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/85">
              {judgement.feedback}
            </p>
          </>
        )}
      </div>
    </div>
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
      <CardContent className="space-y-3 pt-6">
        {/* Top-to-bottom reading flow — all layers 100% width */}
        <div className="flex flex-col gap-0 items-stretch">
          {core && (
            <>
              <div className="w-full">
                <CoreCard core={core} />
              </div>
              {mids.length > 0 && <Connector />}
            </>
          )}
          {mids.length > 0 && (
            <>
              <div className="w-full">
                <MidLayer mids={mids} />
              </div>
              {bases.length > 0 && <Connector />}
            </>
          )}
          {bases.length > 0 && (
            <>
              <div className="w-full">
                <BaseLayer bases={bases} />
              </div>
              {facts.length > 0 && <Connector />}
            </>
          )}
          {facts.length > 0 && (
            <div className="w-full">
              <FactsLayer facts={facts} />
            </div>
          )}
        </div>

        {/* Sidebar strips */}
        {groups.length > 0 && <GroupsStrip groups={groups} />}
        {judgement && <JudgementStrip judgement={judgement} />}
      </CardContent>
    </Card>
  )
}