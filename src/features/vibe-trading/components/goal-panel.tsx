"use client"
import { Loader2, Play, Pencil, X, Check } from "lucide-react"
import { useState } from "react"
import type { GoalSnapshot } from "../lib/vibe-types"
import { criterionCovered } from "../lib/goal-criteria"

export function GoalPanel({
  snapshot,
  onContinue,
  onSaveEdit,
  onCancel,
  onCancelTask,
  running,
  continueDisabled,
}: {
  snapshot: GoalSnapshot
  onContinue: () => void
  onSaveEdit: (objective: string) => Promise<void> | void
  onCancel: () => Promise<void> | void
  /**
   * 取消当前正在跑的 attempt。只有在 running=true 时父组件才需要传,
   * 不传则隐藏 "取消任务" 按钮。语义上区别于 onCancel:onCancel 把整个
   * goal 标记为 cancelled (status=cancelled),onCancelTask 只打断当前 SSE 流,
   * goal 状态保持 active,后续可继续。
   */
  onCancelTask?: () => void
  /**
   * 是否有正在跑的 attempt (goal kickoff / 继续 时正在 stream)。
   * - true:用 "运行中" 状态徽章 + "取消任务" 按钮替代 "继续" 按钮
   * - false/undefined:走原 继续 / 编辑 / 取消目标 路径
   */
  running?: boolean
  continueDisabled?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(snapshot.goal.objective)

  const total = snapshot.criteria.length
  const met = snapshot.criteria.filter((c) => criterionCovered(snapshot, c)).length
  const evidenceCount = snapshot.evidence_count
  const recent = [...snapshot.evidence]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 2)

  return (
    <div className="grid gap-3 rounded-xl border border-primary/20 bg-background/95 p-3 text-xs shadow-sm">
      {editing ? (
        <div className="grid gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            aria-label="编辑目标"
            className="w-full rounded-lg border bg-background px-3 py-2 text-xs leading-relaxed text-foreground outline-none focus:ring-2 focus:ring-primary/30"
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setEditing(false)} className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground">
              <X className="h-3 w-3" />取消
            </button>
            <button
              type="button"
              onClick={async () => { await onSaveEdit(draft.trim()); setEditing(false) }}
              disabled={!draft.trim()}
              className="inline-flex items-center gap-1 rounded-lg bg-primary px-2 py-1 text-[11px] font-medium text-primary-foreground disabled:opacity-40"
            >
              <Check className="h-3 w-3" />保存
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border bg-muted/20 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
          {snapshot.goal.objective}
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border bg-muted/20 p-2.5">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">达成标准</div>
          <div className="mt-1 font-mono text-base font-semibold text-foreground">{met}/{total}</div>
        </div>
        <div className="rounded-lg border bg-muted/20 p-2.5">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">证据</div>
          <div className="mt-1 font-mono text-base font-semibold text-foreground">{evidenceCount}</div>
        </div>
      </div>
      <div className="grid gap-1.5">
        {snapshot.criteria.map((c, i) => {
          const evCount = snapshot.evidence.filter((e) => e.criterion_id === c.criterion_id).length
          return (
            <div key={c.criterion_id} className="grid grid-cols-[1.25rem_minmax(0,1fr)_auto] items-start gap-2 rounded-lg border bg-muted/20 p-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] text-muted-foreground">{i + 1}</span>
              <span className="min-w-0">
                <span className="block truncate font-medium text-foreground">{c.text}</span>
                <span className="block text-[11px] text-muted-foreground">{c.status}</span>
              </span>
              <span className="rounded-full border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">{evCount} ev</span>
            </div>
          )
        })}
      </div>
      {recent.length > 0 && (
        <div className="grid gap-1.5 border-t pt-2">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">最近证据</div>
          {recent.map((item) => (
            <div key={item.evidence_id} className="rounded-lg bg-muted/20 px-2 py-1.5">
              <div className="mb-0.5 flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
                <span className="truncate">{item.source_provider || "evidence"}</span>
                <span>{item.verification_status}</span>
              </div>
              <div className="line-clamp-2 text-[11px] leading-relaxed text-foreground">{item.text}</div>
            </div>
          ))}
        </div>
      )}
      <div className="flex flex-wrap justify-end gap-2 border-t pt-2">
        {running ? (
          <>
            <span
              data-testid="goal-running"
              className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary"
              role="status"
              aria-live="polite"
            >
              <Loader2 className="h-3 w-3 animate-spin" />
              运行中
            </span>
            {onCancelTask && (
              <button
                type="button"
                onClick={onCancelTask}
                className="inline-flex items-center gap-1 rounded-lg border border-destructive/40 px-2 py-1 text-[11px] font-medium text-destructive hover:bg-destructive/10"
              >
                <X className="h-3 w-3" />取消任务
              </button>
            )}
          </>
        ) : (
          <button
            type="button"
            onClick={onContinue}
            disabled={continueDisabled}
            className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground disabled:opacity-40"
          >
            <Play className="h-3 w-3" />继续
          </button>
        )}
        <button
          type="button"
          onClick={() => setEditing(true)}
          disabled={editing}
          className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground disabled:opacity-40"
        >
          <Pencil className="h-3 w-3" />编辑
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-medium text-muted-foreground hover:border-destructive/40 hover:text-destructive"
        >
          <X className="h-3 w-3" />取消目标
        </button>
      </div>
    </div>
  )
}