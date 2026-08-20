/**
 * RemoveSkillButton — 「我的 Skill」Tab 的移除按钮。
 *
 * 行为:
 *   - 点击 X → 弹 confirm dialog,文案根据当前是否启用动态切换:
 *       未启用 → "是否移除「X」?(仅从我的 Skill 移除,不影响其他人)"
 *       已启用 → "「X」当前已启用,是否停用并从我的 Skill 移除?"
 *   - 确认 → DELETE /v1/users/me/skills/{id};binding 物理删除
 *   - 失败 → dialog 内显示错误,保持打开
 *
 * 用法:放在 SkillCard / SkillDetailDialog 的 personal mode 视图里。
 */
"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2, X } from "lucide-react"
import { useUserSkillBindings } from "../hooks/use-user-skill-bindings"

interface RemoveSkillButtonProps {
  skillId: string
  skillName: string
  /**
   * Visual variant for the trigger button.
   * - "card" → small ghost X icon, sits in card corners
   * - "inline" → text + icon button, for detail dialogs
   */
  variant?: "card" | "inline"
}

export function RemoveSkillButton({
  skillId,
  skillName,
  variant = "card",
}: RemoveSkillButtonProps) {
  const { bindings, remove, isToggling } = useUserSkillBindings()
  const enabled = !!bindings[skillId]?.enabled

  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onConfirm() {
    setError(null)
    try {
      await remove(skillId)
      setOpen(false)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <>
      {variant === "card" ? (
        // ★ 卡片右上角 X:尺寸缩到 28px(默认 size-9=36px 视觉太重),
        // 无独立背景/阴影,只保留 hover 反馈 — 避免和 Card 自身的
        // shadow-xs 叠加形成"按钮浮在卡片上"的视觉跳出。
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="移除"
          onClick={(e) => {
            e.stopPropagation()
            setOpen(true)
          }}
          disabled={isToggling}
          className="cursor-pointer size-7 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        >
          {isToggling ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <X className="size-3.5" />
          )}
        </Button>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
          disabled={isToggling}
          className="cursor-pointer"
        >
          {isToggling ? (
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          ) : (
            <X className="mr-1 h-3 w-3" />
          )}
          移除
        </Button>
      )}

      <Dialog
        open={open}
        onOpenChange={(o) => {
          if (isToggling) return
          setOpen(o)
          if (!o) setError(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>移除 Skill</DialogTitle>
            <DialogDescription>
              {enabled
                ? `「${skillName}」当前已启用,是否停用并从「我的 Skill」移除?`
                : `是否从「我的 Skill」中移除「${skillName}」?`}
            </DialogDescription>
          </DialogHeader>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isToggling}
              className="cursor-pointer"
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={onConfirm}
              disabled={isToggling}
              className="cursor-pointer"
            >
              {isToggling && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
              {enabled ? "停用并移除" : "移除"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}