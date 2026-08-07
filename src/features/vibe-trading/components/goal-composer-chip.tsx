"use client"

import { Target, X } from "lucide-react"

/**
 * 显示在 Sender 上方,标识用户已激活"新建研究目标"模式。
 * 视觉风格与 SwarmChip 对齐(icon + label + close),让用户清楚当前
 * 输入会被解释为 goal objective 而不是普通消息。
 */
export function GoalComposerChip({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex items-center gap-1">
      <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
        <Target className="h-3 w-3" />
        目标模式
        <button
          type="button"
          onClick={onClear}
          aria-label="退出目标设定模式"
          className="hover:text-destructive transition-colors"
        >
          <X className="h-3 w-3" />
        </button>
      </span>
    </div>
  )
}