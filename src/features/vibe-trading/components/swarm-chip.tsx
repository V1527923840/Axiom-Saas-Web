"use client"
import { Users, X } from "lucide-react"

export function SwarmChip({ title, onClear }: { title: string; onClear: () => void }) {
  return (
    <div className="flex items-center gap-1">
      <span className="inline-flex items-center gap-1.5 rounded-lg bg-violet-500/10 px-2.5 py-1 text-xs font-medium text-violet-600 dark:text-violet-400">
        <Users className="h-3 w-3" />
        {title}
        <button
          type="button"
          onClick={onClear}
          aria-label="移除蜂群模式"
          className="hover:text-destructive transition-colors"
        >
          <X className="h-3 w-3" />
        </button>
      </span>
    </div>
  )
}
