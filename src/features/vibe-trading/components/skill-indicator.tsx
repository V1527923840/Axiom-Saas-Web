/**
 * SkillIndicator — 顶部胶囊条,显示当前 session 已启用的 skill。
 *
 * 顶部浅色条:展示"📌 已启用: skill名 (auto_matched 时虚线边框)"。
 * Hover 显示 description。
 */
import { Sparkles } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { Skill } from "@/types/skill"

interface SkillIndicatorProps {
  enabledSkills: Skill[]
  className?: string
}

export function SkillIndicator({
  enabledSkills,
  className,
}: SkillIndicatorProps) {
  if (enabledSkills.length === 0) return null
  return (
    <div
      className={
        "flex flex-wrap items-center gap-1 border-b bg-muted/30 px-3 py-1.5 text-xs " +
        (className ?? "")
      }
    >
      <Sparkles className="h-3 w-3 text-violet-500" />
      <span className="text-muted-foreground">已启用:</span>
      {enabledSkills.map((s) => (
        <Badge key={s.id} variant="secondary" title={s.description}>
          {s.name}
        </Badge>
      ))}
    </div>
  )
}