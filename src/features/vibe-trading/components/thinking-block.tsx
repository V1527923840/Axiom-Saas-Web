import { Brain } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

export function ThinkingBlock({ content, closed }: { content: string; closed: boolean }) {
  // 流式场景下未闭合(closed=false)→ 默认展开让用户看实时推理
  // 已闭合(closed=true)→ 默认折叠避免长思考占据主对话流
  // closed 由 false 变 true 时,如果用户还没手动展开过,自动折叠;
  // 用户一旦点过 toggle 开关,prop 不再覆盖用户选择(由 userInteractedRef 守门)
  const [open, setOpen] = useState(!closed)
  const userInteractedRef = useRef(false)
  const preRef = useRef<HTMLPreElement>(null)
  const lastLenRef = useRef(0)

  useEffect(() => {
    if (closed && !userInteractedRef.current) {
      setOpen(false)
    }
  }, [closed])

  const trimmed = content.trim()

  // 内容增长时滚到底。第一版不做"用户在顶部就不抢"判断 —— 用户反馈后再加。
  useEffect(() => {
    if (!open || !preRef.current) return
    const el = preRef.current
    if (trimmed.length > lastLenRef.current) {
      el.scrollTop = el.scrollHeight
      lastLenRef.current = trimmed.length
    }
  }, [trimmed, open])

  if (!trimmed) return null

  const handleToggle = () => {
    userInteractedRef.current = true
    setOpen((v) => !v)
  }

  return (
    <div
      className={cn(
        "bg-muted/40 border-muted-foreground/20 my-1 rounded-md border",
        "text-muted-foreground text-sm",
      )}
    >
      <button
        type="button"
        onClick={handleToggle}
        className="flex w-full items-center gap-2 px-3 py-1.5 text-left font-mono text-xs"
      >
        <Brain className="h-3.5 w-3.5 shrink-0" />
        <span className="flex-1">思考过程</span>
        <span className="opacity-60">{open ? "收起" : "展开"}</span>
      </button>
      {open && (
        <pre
          ref={preRef}
          className="mx-3 mb-2 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded bg-transparent px-1 py-1 text-xs leading-relaxed"
        >
          {trimmed}
        </pre>
      )}
    </div>
  )
}
