"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  ChevronDown,
  ChevronRight,
  PyramidIcon,
  Lightbulb,
  FileText,
  Filter,
  Layers,
  CheckCircle2,
  Quote,
} from "lucide-react"

/**
 * PyramidView — visualizes the 6-layer pyramid protocol
 *
 * Layer 1 — rawFacts        : 原始事实 [{ id, text }]
 * Layer 2 — inductionGroups : 归纳分组 [{ id, facts[], dimension, common_pattern }]
 * Layer 3 — baseView        : 基础观点 [{ id, content, source_fact_refs[] }]
 * Layer 4 — midView         : 中层观点 [{ id, content, reasoning_dimension, supporting_base_ids[] }]
 * Layer 5 — coreView        : 核心观点 { id, content, premises[], conclusion, deduction_formula, supporting_mid_ids[] }
 * Layer 6 — pyramidJudgement: 研判 { feedback, judged_at, depth_score, logic_score }
 *
 * Each layer is rendered as readable cards (no raw JSON). IDs across
 * layers are linked via a "tracing" section that walks
 * core_view → mid_view → base_view → raw_facts, showing the reasoning chain.
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

function IdChip({ id, onClick }: { id: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 text-xs font-mono hover:bg-purple-100 dark:hover:bg-purple-900/60 transition-colors"
    >
      {id}
    </button>
  )
}

interface LayerSectionProps {
  index: number
  title: string
  subtitle: string
  icon: React.ReactNode
  count?: number
  defaultOpen?: boolean
  children: React.ReactNode
}

function LayerSection({
  index,
  title,
  subtitle,
  icon,
  count,
  defaultOpen = true,
  children,
}: LayerSectionProps) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border rounded-md">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen((p) => !p)}
        className="w-full justify-between cursor-pointer hover:bg-muted/40 px-3 py-2 h-auto"
      >
        <div className="flex items-center gap-2 text-left">
          {open ? (
            <ChevronDown className="size-4 shrink-0" />
          ) : (
            <ChevronRight className="size-4 shrink-0" />
          )}
          <span className="text-xs font-mono text-muted-foreground">
            L{index}
          </span>
          {icon}
          <span className="text-sm font-medium">{title}</span>
          {typeof count === "number" && (
            <Badge variant="secondary" className="text-xs">
              {count}
            </Badge>
          )}
        </div>
        <span className="text-xs text-muted-foreground font-mono">
          {subtitle}
        </span>
      </Button>
      {open && <div className="px-3 pb-3 pt-1 space-y-2">{children}</div>}
    </div>
  )
}

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
  const groups = useMemo(() => normalizeGroups(inductionGroups), [inductionGroups])
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
      </CardHeader>

      <CardContent className="space-y-2">
        {/* Reasoning chain trace — top of card when core present */}
        {core && (
          <ReasoningChain
            core={core}
            midById={midById}
            baseById={baseById}
            factById={factById}
          />
        )}

        {/* Layer 5 — coreView */}
        {core && (
          <LayerSection
            index={5}
            title="核心观点"
            subtitle="coreView"
            icon={<Lightbulb className="size-4 text-amber-600" />}
            defaultOpen={true}
          >
            <CoreViewCard core={core} midById={midById} />
          </LayerSection>
        )}

        {/* Layer 6 — pyramidJudgement */}
        {judgement && (
          <LayerSection
            index={6}
            title="研判"
            subtitle="pyramidJudgement"
            icon={<CheckCircle2 className="size-4 text-emerald-600" />}
            defaultOpen={true}
          >
            <JudgementCard judgement={judgement} />
          </LayerSection>
        )}

        {/* Layer 4 — midView */}
        {mids.length > 0 && (
          <LayerSection
            index={4}
            title="中层观点"
            subtitle="midView"
            icon={<Layers className="size-4 text-indigo-600" />}
            count={mids.length}
            defaultOpen={false}
          >
            {mids.map((m) => (
              <MidViewCard key={m.id} mid={m} baseById={baseById} />
            ))}
          </LayerSection>
        )}

        {/* Layer 3 — baseView */}
        {bases.length > 0 && (
          <LayerSection
            index={3}
            title="基础观点"
            subtitle="baseView"
            icon={<Quote className="size-4 text-blue-600" />}
            count={bases.length}
            defaultOpen={false}
          >
            {bases.map((b) => (
              <BaseViewCard key={b.id} base={b} factById={factById} />
            ))}
          </LayerSection>
        )}

        {/* Layer 2 — inductionGroups */}
        {groups.length > 0 && (
          <LayerSection
            index={2}
            title="归纳分组"
            subtitle="inductionGroups"
            icon={<Filter className="size-4 text-cyan-600" />}
            count={groups.length}
            defaultOpen={false}
          >
            {groups.map((g) => (
              <GroupCard key={g.id} group={g} factById={factById} />
            ))}
          </LayerSection>
        )}

        {/* Layer 1 — rawFacts */}
        {facts.length > 0 && (
          <LayerSection
            index={1}
            title="原始事实"
            subtitle="rawFacts"
            icon={<FileText className="size-4 text-slate-600" />}
            count={facts.length}
            defaultOpen={false}
          >
            {facts.map((f, idx) => (
              <FactCard key={f.id || `f-${idx}`} fact={f} index={idx} />
            ))}
          </LayerSection>
        )}
      </CardContent>
    </Card>
  )
}

function FactCard({ fact, index }: { fact: Fact; index: number }) {
  return (
    <div className="flex gap-2 p-2 rounded border bg-slate-50/40 dark:bg-slate-950/30">
      <span className="text-xs font-mono text-muted-foreground shrink-0 pt-0.5">
        #{index + 1}
      </span>
      <p className="text-sm leading-relaxed flex-1">{fact.text}</p>
    </div>
  )
}

function GroupCard({
  group,
  factById,
}: {
  group: InductionGroup
  factById: Map<string, Fact>
}) {
  return (
    <div className="p-3 rounded border bg-cyan-50/30 dark:bg-cyan-950/20 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        {group.dimension && (
          <Badge variant="outline" className="text-xs">
            维度: {group.dimension}
          </Badge>
        )}
        <span className="text-xs font-mono text-muted-foreground">
          {group.id}
        </span>
        <span className="text-xs text-muted-foreground">
          {group.facts.length} 个事实
        </span>
      </div>
      {group.common_pattern && (
        <p className="text-sm leading-relaxed">
          <span className="text-xs text-muted-foreground mr-1">
            共同模式:
          </span>
          {group.common_pattern}
        </p>
      )}
      {group.facts.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1 border-t">
          {group.facts.map((fid) => (
            <IdChip key={fid} id={fid} />
          ))}
        </div>
      )}
    </div>
  )
}

function BaseViewCard({
  base,
  factById,
}: {
  base: BaseView
  factById: Map<string, Fact>
}) {
  return (
    <div className="p-3 rounded border bg-blue-50/30 dark:bg-blue-950/20 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-mono text-muted-foreground">
          {base.id}
        </span>
        <Badge variant="outline" className="text-xs">
          基础观点
        </Badge>
      </div>
      <p className="text-sm leading-relaxed">{base.content}</p>
      {base.source_fact_refs && base.source_fact_refs.length > 0 && (
        <div className="pt-2 border-t space-y-1">
          <div className="text-xs text-muted-foreground">引用事实:</div>
          <div className="space-y-1">
            {base.source_fact_refs.map((fid) => {
              const fact = factById.get(fid)
              return (
                <div
                  key={fid}
                  className="text-xs flex gap-2 items-start bg-slate-50 dark:bg-slate-950/40 p-2 rounded"
                >
                  <span className="font-mono text-purple-700 dark:text-purple-400 shrink-0">
                    {fid}
                  </span>
                  <span className="flex-1 text-muted-foreground">
                    {fact?.text ?? "(无原文)"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function MidViewCard({
  mid,
  baseById,
}: {
  mid: MidView
  baseById: Map<string, BaseView>
}) {
  return (
    <div className="p-3 rounded border bg-indigo-50/30 dark:bg-indigo-950/20 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-mono text-muted-foreground">
          {mid.id}
        </span>
        {mid.reasoning_dimension && (
          <Badge variant="outline" className="text-xs">
            推理维度: {mid.reasoning_dimension}
          </Badge>
        )}
      </div>
      <p className="text-sm leading-relaxed">{mid.content}</p>
      {mid.supporting_base_ids && mid.supporting_base_ids.length > 0 && (
        <div className="pt-2 border-t space-y-1">
          <div className="text-xs text-muted-foreground">依赖基础观点:</div>
          <div className="space-y-1">
            {mid.supporting_base_ids.map((bid) => {
              const b = baseById.get(bid)
              return (
                <div
                  key={bid}
                  className="text-xs flex gap-2 items-start bg-blue-50/50 dark:bg-blue-950/30 p-2 rounded"
                >
                  <span className="font-mono text-blue-700 dark:text-blue-400 shrink-0">
                    {bid}
                  </span>
                  <span className="flex-1 text-muted-foreground">
                    {b?.content ?? "(无原文)"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function CoreViewCard({
  core,
  midById,
}: {
  core: CoreView
  midById: Map<string, MidView>
}) {
  return (
    <div className="p-4 rounded-md border-2 border-amber-200 dark:border-amber-900 bg-amber-50/30 dark:bg-amber-950/20 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-mono text-muted-foreground">
          {core.id}
        </span>
        {core.deduction_formula && (
          <Badge variant="default" className="text-xs font-mono">
            推理范式 {core.deduction_formula}
          </Badge>
        )}
      </div>

      <p className="text-base leading-relaxed font-medium">{core.content}</p>

      {core.premises && core.premises.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <div className="text-xs font-semibold text-muted-foreground">
            推理前提
          </div>
          <ol className="space-y-1.5">
            {core.premises.map((p, idx) => (
              <li key={idx} className="flex gap-2 text-sm">
                <span className="shrink-0 w-5 h-5 flex items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-medium">
                  {idx + 1}
                </span>
                <span className="leading-relaxed">{p}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {core.conclusion && (
        <div className="bg-emerald-50 dark:bg-emerald-950/30 border-l-4 border-emerald-500 p-3 rounded">
          <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1">
            结论
          </div>
          <p className="text-sm leading-relaxed">{core.conclusion}</p>
        </div>
      )}

      {core.supporting_mid_ids && core.supporting_mid_ids.length > 0 && (
        <div className="pt-2 border-t space-y-1">
          <div className="text-xs text-muted-foreground">基于中层观点:</div>
          <div className="space-y-1">
            {core.supporting_mid_ids.map((mid) => {
              const m = midById.get(mid);
              return (
                <div
                  key={mid}
                  className="text-xs flex gap-2 items-start bg-indigo-50/50 dark:bg-indigo-950/30 p-2 rounded"
                >
                  <span className="font-mono text-indigo-700 dark:text-indigo-400 shrink-0">
                    {mid}
                  </span>
                  <span className="flex-1 text-muted-foreground">
                    {m?.content ?? "(无原文)"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function JudgementCard({ judgement }: { judgement: PyramidJudgement }) {
  return (
    <div className="p-3 rounded border bg-emerald-50/30 dark:bg-emerald-950/20 space-y-2">
      <div className="flex items-center gap-3 flex-wrap">
        {typeof judgement.depth_score === "number" && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">深度分</span>
            <Badge
              variant={
                judgement.depth_score >= 8
                  ? "default"
                  : judgement.depth_score >= 6
                    ? "secondary"
                    : "outline"
              }
              className="font-mono"
            >
              {judgement.depth_score.toFixed(1)}
            </Badge>
          </div>
        )}
        {typeof judgement.logic_score === "number" && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">逻辑分</span>
            <Badge
              variant={
                judgement.logic_score >= 8
                  ? "default"
                  : judgement.logic_score >= 6
                    ? "secondary"
                    : "outline"
              }
              className="font-mono"
            >
              {judgement.logic_score.toFixed(1)}
            </Badge>
          </div>
        )}
        {judgement.judged_at && (
          <span className="text-xs text-muted-foreground">
            {new Date(judgement.judged_at).toLocaleString("zh-CN")}
          </span>
        )}
      </div>
      {judgement.feedback && (
        <p className="text-sm leading-relaxed whitespace-pre-wrap border-t pt-2">
          {judgement.feedback}
        </p>
      )}
    </div>
  );
}

function ReasoningChain({
  core,
  midById,
  baseById,
  factById,
}: {
  core: CoreView
  midById: Map<string, MidView>
  baseById: Map<string, BaseView>
  factById: Map<string, Fact>
}) {
  // Walk backwards from core -> mids -> bases -> facts
  const usedMids = (core.supporting_mid_ids ?? [])
    .map((id) => midById.get(id))
    .filter((m): m is MidView => Boolean(m));

  const usedBases = Array.from(
    new Set(
      usedMids.flatMap((m) => m.supporting_base_ids ?? []),
    ),
  )
    .map((id) => baseById.get(id))
    .filter((b): b is BaseView => Boolean(b));

  const usedFactIds = Array.from(
    new Set(usedBases.flatMap((b) => b.source_fact_refs ?? [])),
  );

  const usedFacts = usedFactIds
    .map((id) => factById.get(id))
    .filter((f): f is Fact => Boolean(f));

  return (
    <div className="rounded-md border-2 border-dashed border-primary/40 bg-primary/5 p-3 space-y-2">
      <div className="flex items-center gap-2 text-xs font-semibold text-primary">
        <Layers className="size-3.5" />
        推理链路追溯
        <span className="text-muted-foreground font-normal">
          ({usedFacts.length} 事实 → {usedBases.length} 基础 → {usedMids.length} 中层 → 1 核心)
        </span>
      </div>

      {/* Step 1: facts */}
      {usedFacts.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs text-muted-foreground">
            ① 原始事实 ({usedFacts.length})
          </div>
          <div className="space-y-1">
            {usedFacts.map((f) => (
              <div
                key={f.id}
                className="text-xs flex gap-2 items-start bg-slate-50 dark:bg-slate-950/40 p-1.5 rounded"
              >
                <span className="font-mono text-purple-700 dark:text-purple-400 shrink-0">
                  {f.id}
                </span>
                <span className="flex-1">{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: bases */}
      {usedBases.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs text-muted-foreground">
            ② 基础观点 ({usedBases.length})
          </div>
          <div className="space-y-1">
            {usedBases.map((b) => (
              <div
                key={b.id}
                className="text-xs flex gap-2 items-start bg-blue-50/60 dark:bg-blue-950/30 p-1.5 rounded"
              >
                <span className="font-mono text-blue-700 dark:text-blue-400 shrink-0">
                  {b.id}
                </span>
                <span className="flex-1">{b.content}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 3: mids */}
      {usedMids.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs text-muted-foreground">
            ③ 中层观点 ({usedMids.length})
          </div>
          <div className="space-y-1">
            {usedMids.map((m) => (
              <div
                key={m.id}
                className="text-xs flex gap-2 items-start bg-indigo-50/60 dark:bg-indigo-950/30 p-1.5 rounded"
              >
                <span className="font-mono text-indigo-700 dark:text-indigo-400 shrink-0">
                  {m.id}
                </span>
                {m.reasoning_dimension && (
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    {m.reasoning_dimension}
                  </Badge>
                )}
                <span className="flex-1">{m.content}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 4: core */}
      <div className="space-y-1">
        <div className="text-xs text-muted-foreground">④ 核心观点</div>
        <div className="text-sm bg-amber-50 dark:bg-amber-950/30 border-l-4 border-amber-500 p-2 rounded font-medium">
          {core.content}
        </div>
        {core.conclusion && (
          <div className="text-sm bg-emerald-50 dark:bg-emerald-950/30 border-l-4 border-emerald-500 p-2 rounded">
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mr-2">
              结论
            </span>
            {core.conclusion}
          </div>
        )}
      </div>
    </div>
  );
}