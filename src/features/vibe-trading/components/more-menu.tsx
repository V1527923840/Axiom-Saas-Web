"use client"
import { Paperclip, Target, Users } from "lucide-react"
import { useEffect, useRef, useState } from "react"

export function MoreMenu({
  disabled,
  onPickFile,
  onCreateGoal,
  onStartSwarm,
}: {
  disabled?: boolean
  onPickFile: () => void
  onCreateGoal: () => void
  onStartSwarm: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) {
      document.addEventListener("mousedown", handler)
      return () => document.removeEventListener("mousedown", handler)
    }
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        aria-label="更多选项"
        className="flex h-9 w-9 items-center justify-center rounded-full border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40 shrink-0"
      >
        <span className="text-base leading-none">+</span>
      </button>
      {open && (
        <div className="absolute bottom-full left-0 mb-2 w-52 rounded-xl border bg-background/95 backdrop-blur-sm shadow-lg py-1 z-50">
          <button
            type="button"
            onClick={() => {
              onPickFile()
              setOpen(false)
            }}
            className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors flex items-center gap-2"
          >
            <Paperclip className="h-4 w-4" />
            上传 PDF
          </button>
          <div className="border-t my-1" />
          <button
            type="button"
            onClick={() => {
              onCreateGoal()
              setOpen(false)
            }}
            className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors flex items-center gap-2"
          >
            <Target className="h-4 w-4" />
            新建研究目标
          </button>
          <button
            type="button"
            onClick={() => {
              onStartSwarm()
              setOpen(false)
            }}
            className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors flex items-center gap-2"
          >
            <Users className="h-4 w-4" />
            启动智能体蜂群
          </button>
        </div>
      )}
    </div>
  )
}
