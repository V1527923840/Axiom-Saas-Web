import { Wrench } from "lucide-react"
import { useMemo, useState } from "react"
import { tryParseToolJson } from "../lib/parse-message"
import { cn } from "@/lib/utils"

export function ToolCallBlock({ content }: { content: string }) {
  const [open, setOpen] = useState(false)
  const parsed = useMemo(() => tryParseToolJson(content), [content])

  // 工具调用块默认折叠 —— 调用 JSON 通常很长,而且用户大多关心调用结果而非参数。
  const display = parsed.ok
    ? JSON.stringify(parsed.data, null, 2)
    : content.trim() || "(空)"

  return (
    <div
      className={cn(
        "my-1 rounded-md border border-amber-500/30 bg-amber-50/40",
        "text-amber-900 dark:bg-amber-950/20 dark:text-amber-200",
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-1.5 text-left font-mono text-xs"
      >
        <Wrench className="h-3.5 w-3.5 shrink-0" />
        <span className="flex-1">工具调用</span>
        <span className="opacity-60">{open ? "收起" : "展开"}</span>
      </button>
      {open && (
        <pre className="mx-3 mb-2 max-h-80 overflow-auto whitespace-pre-wrap break-words rounded bg-transparent px-1 py-1 text-xs leading-relaxed">
          {display}
        </pre>
      )}
    </div>
  )
}