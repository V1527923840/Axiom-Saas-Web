/**
 * EnableSkillButton — 启用/停用 切换。
 *
 * 乐观更新:点击后立即翻转 UI,失败回滚。loading 期间禁用避免重复点击。
 */
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { useUserSkillBindings } from "../hooks/use-user-skill-bindings"

interface EnableSkillButtonProps {
  skillId: string
  variant?: "default" | "outline"
}

export function EnableSkillButton({
  skillId,
  variant = "default",
}: EnableSkillButtonProps) {
  const { enabledMap, enable, disable, isToggling } = useUserSkillBindings()
  const enabled = !!enabledMap[skillId]

  async function onToggle() {
    try {
      if (enabled) await disable(skillId)
      else await enable(skillId)
    } catch (e) {
      // hook 已回滚,这里只负责显示
      console.error("toggle skill failed", e)
    }
  }

  if (enabled) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={onToggle}
        disabled={isToggling}
      >
        {isToggling && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
        已启用 · 停用
      </Button>
    )
  }

  return (
    <Button
      variant={variant}
      size="sm"
      onClick={onToggle}
      disabled={isToggling}
    >
      {isToggling && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
      启用
    </Button>
  )
}