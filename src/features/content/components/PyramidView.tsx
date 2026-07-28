"use client"

import { useMemo, useState, useEffect, useCallback, useId } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Collapsible,
  CollapsibleContent,
} from "@/components/ui/collapsible"
import {
  PyramidIcon,
  Lightbulb,
  CheckCircle2,
  Layers,
  Filter,
  ArrowDown,
  ChevronDown,
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
  /** Used to scope collapse state in localStorage. Pass null to keep state in-memory only (no persistence). */
  contentType?: "intelligence" | "research-analysis" | null
  contentId?: string | number | null
}

const COLLAPSE_STORAGE_PREFIX = "axiom.pyramid.collapse.v2"

function useCollapseState(contentKey: string | null) {
  const storageKey =
    contentKey !== null ? `${COLLAPSE_STORAGE_PREFIX}:${contentKey}` : null

  // Default state: every section is collapsed (progressive disclosure).
  // `expanded` only tracks keys the user has explicitly opened.
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (typeof window === "undefined") return
    if (storageKey === null) {
      setExpanded({})
      return
    }
    try {
      const raw = window.localStorage.getItem(storageKey)
      if (!raw) {
        setExpanded({})
        return
      }
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        setExpanded(parsed as Record<string, boolean>)
      } else {
        setExpanded({})
      }
    } catch {
      // Silent: corrupted JSON, no localStorage, quota — all fall back to default
      setExpanded({})
    }
  }, [storageKey])

  const persist = useCallback(
    (next: Record<string, boolean>) => {
      if (typeof window === "undefined") return
      if (storageKey === null) return
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(next))
      } catch {
        // Silent: privacy mode / quota — keep in-memory state
      }
    },
    [storageKey],
  )

  // A section is collapsed unless it has been explicitly expanded.
  const isCollapsed = useCallback(
    (sectionKey: string) => expanded[sectionKey] !== true,
    [expanded],
  )

  const toggle = useCallback(
    (sectionKey: string) => {
      setExpanded((prev) => {
        const next = { ...prev }
        if (next[sectionKey]) {
          // Already expanded → collapse back to default
          delete next[sectionKey]
        } else {
          // Currently default (collapsed) → expand
          next[sectionKey] = true
        }
        persist(next)
        return next
      })
    },
    [persist],
  )

  const reset = useCallback(() => {
    setExpanded({})
    if (typeof window === "undefined" || storageKey === null) return
    try {
      window.localStorage.removeItem(storageKey)
    } catch {
      // ignore
    }
  }, [storageKey])

  const allKeys = useCallback(() => Object.keys(expanded), [expanded])

  return { isCollapsed, toggle, reset, allKeys }
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

function CollapseTrigger({
  sectionKey,
  isOpen,
  collapsedLabel,
  expandedLabel,
  count,
  onToggle,
  ariaControls,
}: {
  sectionKey: string
  isOpen: boolean
  collapsedLabel: string
  expandedLabel: string
  count: number
  onToggle: () => void
  ariaControls: string
}) {
  return (
    <button
      type="button"
      data-section-key={sectionKey}
      onClick={onToggle}
      aria-expanded={isOpen}
      aria-controls={ariaControls}
      className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded"
    >
      <ChevronDown
        className={`size-3.5 transition-transform duration-200 ${
          isOpen ? "rotate-0" : "-rotate-90"
        }`}
      />
      <span className="font-medium">
        {isOpen ? expandedLabel : collapsedLabel}
      </span>
      {typeof count === "number" && count > 0 && (
        <span className="text-[10px] text-muted-foreground/70 font-mono">
          ({count})
        </span>
      )}
    </button>
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
        {core.deduction_formula && (
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="default" className="text-[10px] font-mono">
              推理范式 {core.deduction_formula}
            </Badge>
          </div>
        )}

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
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------- */
/* Layer: Mid views (full-width rows, one per mid)                      */
/* -------------------------------------------------------------------- */

function MidCard({
  mid,
  bases,
  facts,
  isCollapsed,
  toggle,
}: {
  mid: MidView
  bases: BaseView[]
  facts: Fact[]
  isCollapsed: (key: string) => boolean
  toggle: (key: string) => void
}) {
  const supportingBases = useMemo(() => {
    if (!mid.supporting_base_ids || mid.supporting_base_ids.length === 0) {
      return []
    }
    const idSet = new Set(mid.supporting_base_ids)
    return bases.filter((b) => idSet.has(b.id))
  }, [mid.supporting_base_ids, bases])
  return (
    <div className="bg-white/80 dark:bg-black/30 rounded-lg p-4 space-y-2 border border-indigo-100 dark:border-indigo-900 shadow-sm">
      {mid.reasoning_dimension && (
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-[10px]">
            {mid.reasoning_dimension}
          </Badge>
        </div>
      )}
      <p className="text-sm leading-relaxed text-foreground/90">
        {mid.content}
      </p>
      {supportingBases.length > 0 && (
        <MidSupportsCollapsible
          midId={mid.id}
          bases={supportingBases}
          facts={facts}
          isCollapsed={isCollapsed}
          toggle={toggle}
        />
      )}
    </div>
  )
}

function MidSupportsCollapsible({
  midId,
  bases,
  facts,
  isCollapsed,
  toggle,
}: {
  midId: string
  bases: BaseView[]
  facts: Fact[]
  isCollapsed: (key: string) => boolean
  toggle: (key: string) => void
}) {
  const sectionKey = `mid:${midId}:supports`
  const contentId = useId()
  const open = !isCollapsed(sectionKey)
  return (
    <div className="pt-2 mt-2 border-t border-indigo-100 dark:border-indigo-900">
      <Collapsible open={open}>
        <CollapseTrigger
          sectionKey={sectionKey}
          isOpen={open}
          collapsedLabel="展开基础观点"
          expandedLabel="收起基础观点"
          count={bases.length}
          onToggle={() => toggle(sectionKey)}
          ariaControls={contentId}
        />
        <CollapsibleContent id={contentId}>
          <div className="pt-2 space-y-2 ml-4 border-l-2 border-indigo-200 dark:border-indigo-800 pl-3">
            {bases.map((b) => (
              <BaseCard
                key={b.id}
                base={b}
                facts={facts}
                isCollapsed={isCollapsed}
                toggle={toggle}
              />
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}

function MidLayer({
  mids,
  bases,
  facts,
  isCollapsed,
  toggle,
}: {
  mids: MidView[]
  bases: BaseView[]
  facts: Fact[]
  isCollapsed: (key: string) => boolean
  toggle: (key: string) => void
}) {
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
            <MidCard
              mid={m}
              bases={bases}
              facts={facts}
              isCollapsed={isCollapsed}
              toggle={toggle}
            />
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

function BaseCard({
  base,
  facts,
  isCollapsed,
  toggle,
}: {
  base: BaseView
  facts: Fact[]
  isCollapsed: (key: string) => boolean
  toggle: (key: string) => void
}) {
  const groundingFacts = useMemo(() => {
    if (!base.source_fact_refs || base.source_fact_refs.length === 0) {
      return []
    }
    const idSet = new Set(base.source_fact_refs)
    return facts.filter((f) => idSet.has(f.id))
  }, [base.source_fact_refs, facts])
  return (
    <div className="bg-white/80 dark:bg-black/30 rounded-lg p-4 space-y-2 border border-blue-100 dark:border-blue-900 shadow-sm">
      <p className="text-sm leading-relaxed text-foreground/90">
        {base.content}
      </p>
      {groundingFacts.length > 0 && (
        <BaseFactsCollapsible
          baseId={base.id}
          facts={groundingFacts}
          isCollapsed={isCollapsed}
          toggle={toggle}
        />
      )}
    </div>
  )
}

function BaseFactsCollapsible({
  baseId,
  facts,
  isCollapsed,
  toggle,
}: {
  baseId: string
  facts: Fact[]
  isCollapsed: (key: string) => boolean
  toggle: (key: string) => void
}) {
  const sectionKey = `base:${baseId}:facts`
  const contentId = useId()
  const open = !isCollapsed(sectionKey)
  return (
    <div className="pt-2 mt-2 border-t border-blue-100 dark:border-blue-900">
      <Collapsible open={open}>
        <CollapseTrigger
          sectionKey={sectionKey}
          isOpen={open}
          collapsedLabel="展开事实"
          expandedLabel="收起事实"
          count={facts.length}
          onToggle={() => toggle(sectionKey)}
          ariaControls={contentId}
        />
        <CollapsibleContent id={contentId}>
          <div className="pt-2 space-y-0 ml-4 border-l-2 border-blue-200 dark:border-blue-800 pl-3">
            {facts.map((f) => (
              <FactRow key={f.id} fact={f} />
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}

/* -------------------------------------------------------------------- */
/* Layer: Facts (one row per fact, used inline under BaseCard)           */
/* -------------------------------------------------------------------- */

function FactRow({ fact }: { fact: Fact }) {
  return (
    <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 last:border-b-0 hover:bg-slate-100/40 dark:hover:bg-slate-900/40 transition-colors">
      <p className="text-sm leading-relaxed text-foreground/90">
        {fact.text}
      </p>
    </div>
  )
}

/* -------------------------------------------------------------------- */
/* Sidebar strips                                                         */
/* -------------------------------------------------------------------- */

function GroupsStrip({
  groups,
  isCollapsed,
  toggle,
}: {
  groups: InductionGroup[]
  isCollapsed: (key: string) => boolean
  toggle: (key: string) => void
}) {
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
          <InductionGroupCard
            key={g.id}
            group={g}
            isCollapsed={isCollapsed}
            toggle={toggle}
          />
        ))}
      </div>
    </div>
  )
}

function InductionGroupCard({
  group,
  isCollapsed,
  toggle,
}: {
  group: InductionGroup
  isCollapsed: (key: string) => boolean
  toggle: (key: string) => void
}) {
  const sectionKey = `group:${group.id}:body`
  const contentId = useId()
  const open = !isCollapsed(sectionKey)
  return (
    <div className="bg-cyan-50/50 dark:bg-cyan-950/20 border border-cyan-200 dark:border-cyan-900 rounded-md p-2.5 space-y-1.5">
      <div className="flex items-center gap-1.5 flex-wrap">
        {group.dimension && (
          <Badge variant="outline" className="text-[10px]">
            {group.dimension}
          </Badge>
        )}
        <span className="font-mono text-[11px] text-cyan-700 dark:text-cyan-300 font-semibold">
          {group.id}
        </span>
      </div>
      <Collapsible open={open}>
        <CollapseTrigger
          sectionKey={sectionKey}
          isOpen={open}
          collapsedLabel="展开分组内容"
          expandedLabel="收起分组内容"
          count={group.facts.length}
          onToggle={() => toggle(sectionKey)}
          ariaControls={contentId}
        />
        <CollapsibleContent id={contentId}>
          {group.common_pattern && (
            <p className="text-xs leading-relaxed text-foreground/80 pt-1.5">
              {group.common_pattern}
            </p>
          )}
          {group.facts.length > 0 && (
            <div className="pt-1.5 mt-1.5 border-t border-cyan-100 dark:border-cyan-900 flex flex-wrap gap-1">
              {group.facts.map((fid) => (
                <RefChip key={fid} id={fid} direction="down" />
              ))}
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
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
  contentType,
  contentId,
}: PyramidViewProps) {
  const contentKey =
    contentType && contentId !== undefined && contentId !== null
      ? `${contentType}:${String(contentId)}`
      : null
  const { isCollapsed, toggle } = useCollapseState(contentKey)
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
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <PyramidIcon className="size-5" />
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

      <CardContent className="space-y-3">
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
            <div className="w-full">
              <MidLayer
                mids={mids}
                bases={bases}
                facts={facts}
                isCollapsed={isCollapsed}
                toggle={toggle}
              />
            </div>
          )}
        </div>

        {/* Sidebar strips */}
        {groups.length > 0 && (
          <GroupsStrip groups={groups} isCollapsed={isCollapsed} toggle={toggle} />
        )}
        {judgement && <JudgementStrip judgement={judgement} />}
      </CardContent>
    </Card>
  )
}