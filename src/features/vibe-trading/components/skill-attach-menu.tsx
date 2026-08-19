/**
 * SkillAttachMenu — Sender 旁的 "+📌" 按钮,弹出会话级 skill 多选抽屉。
 *
 * 列出当前 user 已启用的 skills + 当前 session 已 mount 的 skills,
 * 让用户在对话回合中临时排除 / 添加 skill(per spec §3.5.2 delta 机制)。
 */
import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, Sparkles, Plus, Minus } from "lucide-react"
import {
  useSessionMounts,
  useSetSessionMount,
} from "@/features/skill-plaza/hooks/use-session-skills"
import { useUserSkillBindings } from "@/features/skill-plaza/hooks/use-user-skill-bindings"

interface SkillAttachMenuProps {
  sessionId: string
  /**
   * Skill Plaza per-message 选中集。受控模式 — 当父组件同时传 `onChange` 时,
   * 复选框状态完全由 `selectedIds` 驱动,toggle 只调 `onChange`,不再走
   * session-level mount 持久化。两参数都不传时维持旧行为(useSessionMounts +
   * useSetSessionMount),保持向后兼容。
   */
  selectedIds?: string[]
  onChange?: (next: string[]) => void
}

export function SkillAttachMenu({
  sessionId,
  selectedIds,
  onChange,
}: SkillAttachMenuProps) {
  const [open, setOpen] = useState(false)
  const { enabledSkills } = useUserSkillBindings()
  const mounts = useSessionMounts(sessionId)
  const setMount = useSetSessionMount(sessionId)
  const isControlled = Array.isArray(selectedIds) && typeof onChange === "function"

  // 当前 session 实际生效的 skill 集合 = user baseline ∪ mounts(add) - mounts(remove)
  // UI 仅展示 user baseline + 当前 mounts 的状态;
  // 用户 toggle 把对应 mount 行 upsert 成 add/remove
  type MountOp = "add" | "remove"
  const mountMap = new Map<string, MountOp>(
    (mounts.data ?? []).map((m) => [m.skillId, m.op as MountOp]),
  )

  function isEffectivelyMounted(skillId: string): boolean {
    // 受控模式:状态由父组件 selectedIds 决定
    if (isControlled) return (selectedIds as string[]).includes(skillId)
    if (mountMap.get(skillId) === "remove") return false
    return true // baseline enabled
  }

  async function onToggle(skillId: string, baselineEnabled: boolean) {
    // 受控模式:只通知父组件,不触发 session-level mount 持久化,
    // 父组件可以选择 reset 或把当前选中追加到下次 send。
    if (isControlled) {
      const cur = selectedIds as string[]
      const next = cur.includes(skillId)
        ? cur.filter((id) => id !== skillId)
        : [...cur, skillId]
      onChange?.(next)
      return
    }
    const effective = isEffectivelyMounted(skillId)

    if (baselineEnabled) {
      // baseline 已启用 → toggle 是否排除
      await setMount.mutateAsync({
        skillId,
        op: effective ? "remove" : "add",
      })
    } else {
      // baseline 未启用 → toggle 是否强制 add
      await setMount.mutateAsync({
        skillId,
        op: effective ? "remove" : "add",
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="会话挂载 Skill">
          <Sparkles className="h-4 w-4 text-violet-500" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>会话 Skill 挂载</DialogTitle>
          <DialogDescription>
            临时调整本会话可用的 Skill(不影响其他会话)
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-96">
          <div className="space-y-2">
            {mounts.isLoading && (
              <div className="flex justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            )}
            {enabledSkills.map((s: import("@/types/skill").Skill) => {
              const baseline = true // enabledSkills 是 user 已启用集
              const effective = isEffectivelyMounted(s.id)
              return (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-3 rounded-md border p-2"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{s.name}</span>
                      {s.category && (
                        <Badge variant="outline">{s.category}</Badge>
                      )}
                      {mountMap.get(s.id) === "add" && (
                        <Badge variant="default">
                          <Plus className="mr-1 h-3 w-3" /> 强制 add
                        </Badge>
                      )}
                      {mountMap.get(s.id) === "remove" && (
                        <Badge variant="destructive">
                          <Minus className="mr-1 h-3 w-3" /> 已排除
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {s.description}
                    </p>
                  </div>
                  <Checkbox
                    checked={effective}
                    onCheckedChange={() => onToggle(s.id, baseline)}
                  />
                </div>
              )
            })}
            {enabledSkills.length === 0 && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                你还没有启用任何 Skill,先去
                <a href="/skills" className="text-primary underline">
                  广场
                </a>
                浏览
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}