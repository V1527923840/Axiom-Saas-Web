import { Brain } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"

export function ThinkingBlock({ content, closed }: { content: string; closed: boolean }) {
  // 流式场景下未闭合(closed=false)→ 默认展开让用户看实时推理
  // 已闭合(closed=true)→ 默认折叠避免长思考占据主对话流
  // 用户主动展开后由自身 state 控制,与 closed prop 解耦 —— 再次 prop 变化不会再折叠
  const [open, setOpen] = useState(!closed)
  const trimmed = content.trim()
  if (!trimmed) return null

  return (
    <div
      className={cn(
        "bg-muted/40 border-muted-foreground/20 my-1 rounded-md border",
        "text-muted-foreground text-sm",
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-1.5 text-left font-mono text-xs"
      >
        <Brain className="h-3.5 w-3.5 shrink-0" />
        <span className="flex-1">思考过程</span>
        <span className="opacity-60">{open ? "收起" : "展开"}</span>
      </button>
      {open && (
        <pre className="mx-3 mb-2 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded bg-transparent px-1 py-1 text-xs leading-relaxed">
          {trimmed}
        </pre>
      )}
    </div>
  )
}