"use client"
import { Target, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import type { GoalSnapshot } from "../lib/vibe-types"
import { criterionCovered } from "../lib/goal-criteria"

export function GoalChip({
  snapshot,
  open,
  onClick,
}: {
  snapshot: GoalSnapshot
  open: boolean
  onClick: () => void
}) {
  const total = snapshot.criteria.length
  const met = snapshot.criteria.filter((c) => criterionCovered(snapshot, c)).length
  const metLabel = total > 0 ? `${met}/${total} met` : ""
  const evidenceCount = snapshot.evidence_count

  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex max-w-full items-center gap-1.5 justify-self-start rounded-lg bg-primary/10 px-2.5 py-1 text-left text-xs font-medium text-primary transition-colors hover:bg-primary/15"
      title={snapshot.goal.objective}
      aria-expanded={open}
    >
      <Target className="h-3 w-3 shrink-0" />
      <span className="shrink-0">目标</span>
      <span className="truncate text-muted-foreground">
        {snapshot.goal.ui_summary || snapshot.goal.objective}
      </span>
      {metLabel && (
        <span className="shrink-0 font-mono text-[11px] text-emerald-600 dark:text-emerald-400">
          {metLabel}
        </span>
      )}
      {evidenceCount > 0 && (
        <span className="shrink-0 rounded bg-background px-1 font-mono text-[10px] text-primary" title="已收集证据">
          {evidenceCount} ev
        </span>
      )}
      <ChevronDown className={cn("h-3 w-3 shrink-0 transition-transform", open ? "rotate-180" : "")} />
    </button>
  )
}