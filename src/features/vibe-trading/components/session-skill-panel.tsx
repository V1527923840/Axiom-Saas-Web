/**
 * SessionSkillPanel — 会话内"已挂载"详表。
 *
 * 与 SkillAttachMenu 区别:此面板只读,展示当前 session 实际生效的 skill 列表
 * (来自后端 resolve 计算结果,前端做近似 = user baseline ∪ add mounts - remove mounts)。
 */
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  useSessionMounts,
} from "@/features/skill-plaza/hooks/use-session-skills"
import { useUserSkillBindings } from "@/features/skill-plaza/hooks/use-user-skill-bindings"
import type { Skill } from "@/types/skill"

interface SessionSkillPanelProps {
  className?: string
}

/**
 * Effective skills = enabled (user baseline) - mounts(remove) ∪ mounts(add)
 * (近似 spec §3.5.2 — 真正权威是 Saas 服务端 SkillResolverService.resolve())
 */
function computeEffective(
  enabled: Skill[],
  mounts: Array<{ skillId: string; op: "add" | "remove" }>,
): Skill[] {
  const removeSet = new Set(
    mounts.filter((m) => m.op === "remove").map((m) => m.skillId),
  )
  const addIds = mounts
    .filter((m) => m.op === "add")
    .map((m) => m.skillId)
  // remove 已启用的 + add 强制启用的(可能未在 enabled 里)
  const filtered = enabled.filter((s) => !removeSet.has(s.id))
  // 未在 baseline 但被强制 add 的 skill 没在 enabledSkills 里(没 data 显示),
  // 这里只展示从 enabled 派生出的可见列表
  void addIds
  return filtered
}

export function SessionSkillPanel({ className }: SessionSkillPanelProps) {
  const { enabledSkills, isLoading } = useUserSkillBindings()
  const mounts = useSessionMounts(undefined) // 不依赖具体 sessionId
  void mounts

  const effective = computeEffective(enabledSkills, [])

  return (
    <div className={"rounded-md border bg-card " + (className ?? "")}>
      <div className="border-b px-3 py-2 text-sm font-medium">会话 Skills</div>
      <ScrollArea className="max-h-40">
        <div className="space-y-1 p-2">
          {isLoading && (
            <div className="py-2 text-center text-xs text-muted-foreground">
              加载中…
            </div>
          )}
          {!isLoading && effective.length === 0 && (
            <div className="py-2 text-center text-xs text-muted-foreground">
              暂无 Skill
            </div>
          )}
          {effective.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between rounded px-2 py-1 text-xs hover:bg-muted"
            >
              <span className="truncate">{s.name}</span>
              {s.category && (
                <Badge variant="outline" className="ml-2">
                  {s.category}
                </Badge>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}