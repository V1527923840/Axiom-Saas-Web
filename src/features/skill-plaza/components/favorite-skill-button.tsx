/**
 * FavoriteSkillButton — public-marketplace "收藏" 按钮 + 确认弹窗。
 *
 * 行为:
 *   - 已收藏(enabled 或 disabled)→ 显示 "已收藏" 状态,点击打开管理选项
 *   - 未收藏 → 显示 "收藏" 按钮,点击弹 confirm dialog:
 *       是 → 收藏 + 启用 (POST /enable)
 *       否 → 仅收藏 (POST /favorite)
 *
 * 用于 SkillCard 在公开 Tab 的渲染;个人 Tab 用 EnableSkillButton 即可。
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
import { Bookmark, BookmarkPlus, Check, Loader2, X } from "lucide-react"
import { useUserSkillBindings } from "../hooks/use-user-skill-bindings"

interface FavoriteSkillButtonProps {
  skillId: string
  skillName: string
}

type OpenState = null | "pick" | "managing"

export function FavoriteSkillButton({
  skillId,
  skillName,
}: FavoriteSkillButtonProps) {
  const { bindings, favorite, enable, isToggling } = useUserSkillBindings()
  const binding = bindings[skillId]
  const favorited = !!binding
  const enabled = !!binding?.enabled

  const [open, setOpen] = useState<OpenState>(null)
  const [error, setError] = useState<string | null>(null)

  async function onPick(alsoEnable: boolean) {
    setError(null)
    try {
      // 先确保 binding 存在 (POST /favorite),再决定要不要翻成 enabled
      await favorite(skillId)
      if (alsoEnable) await enable(skillId)
      setOpen(null)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  // 已收藏 + 已启用:在公开 Tab 视角,显示「已收藏 · 已启用」并提供停用入口
  if (favorited && enabled) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen("managing")}
        disabled={isToggling}
        className="cursor-pointer"
      >
        {isToggling ? (
          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
        ) : (
          <Check className="mr-1 h-3 w-3" />
        )}
        已收藏 · 已启用
      </Button>
    )
  }

  // 已收藏但未启用:显示「已收藏」并提示启用
  if (favorited && !enabled) {
    return (
      <>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setOpen("managing")}
          disabled={isToggling}
          className="cursor-pointer"
        >
          <Bookmark className="mr-1 h-3 w-3" />
          已收藏
        </Button>
        <Dialog
          open={open === "managing"}
          onOpenChange={(o) => setOpen(o ? "managing" : null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>管理收藏</DialogTitle>
              <DialogDescription>
                「{skillName}」已收藏,目前未启用。
              </DialogDescription>
            </DialogHeader>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setOpen(null)}
                disabled={isToggling}
                className="cursor-pointer"
              >
                关闭
              </Button>
              <Button
                onClick={() => onPick(true)}
                disabled={isToggling}
                className="cursor-pointer"
              >
                {isToggling && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                启用
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    )
  }

  // 未收藏
  return (
    <>
      <Button
        size="sm"
        onClick={() => setOpen("pick")}
        disabled={isToggling}
        className="cursor-pointer"
      >
        <BookmarkPlus className="mr-1 h-3 w-3" />
        收藏
      </Button>
      <Dialog
        open={open === "pick"}
        onOpenChange={(o) => setOpen(o ? "pick" : null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>收藏 Skill</DialogTitle>
            <DialogDescription>
              是否将「{skillName}」加入到「我的 skill」并启用?
            </DialogDescription>
          </DialogHeader>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => onPick(false)}
              disabled={isToggling}
              className="cursor-pointer"
            >
              <X className="mr-1 h-3 w-3" />
              否,仅收藏
            </Button>
            <Button
              onClick={() => onPick(true)}
              disabled={isToggling}
              className="cursor-pointer"
            >
              {isToggling && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
              <Check className="mr-1 h-3 w-3" />
              是,启用
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}