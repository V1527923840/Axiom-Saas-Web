"use client"
import { Paperclip, Target, Users } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

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
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={disabled}
        aria-label="更多选项"
        className="flex h-9 w-9 items-center justify-center rounded-full border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40 shrink-0"
      >
        <span className="text-base leading-none">+</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top" className="w-52">
        <DropdownMenuItem onSelect={onPickFile}>
          <Paperclip className="h-4 w-4" />
          上传 PDF
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onCreateGoal}>
          <Target className="h-4 w-4" />
          新建研究目标
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onStartSwarm}>
          <Users className="h-4 w-4" />
          启动智能体蜂群
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
