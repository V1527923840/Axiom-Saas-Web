import { Loader2 } from "lucide-react"
import type { OpenToolCall } from "../lib/parse-message"

export function ToolCallIndicator({ call }: { call: OpenToolCall }) {
  const preview =
    call.parsed !== undefined
      ? JSON.stringify(call.parsed).slice(0, 80)
      : call.raw.slice(0, 80)
  return (
    <div className="text-muted-foreground flex items-center gap-2 text-xs">
      <Loader2 className="h-3 w-3 shrink-0 animate-spin" aria-hidden />
      <span className="shrink-0">调用 {call.toolName ?? "工具"}中…</span>
      <code className="bg-muted/60 truncate rounded px-1 font-mono text-[11px] opacity-80">
        {preview}
      </code>
    </div>
  )
}