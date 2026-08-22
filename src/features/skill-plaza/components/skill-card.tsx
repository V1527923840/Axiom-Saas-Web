/**
 * SkillCard — 精简卡片。
 *
 * 设计:
 *   - 不要 thumbnail(用户要求)
 *   - 显示 name + category + description 摘要(>120 字截断)
 *   - 长描述点击卡片打开 SkillDetailDialog
 *   - mode="public" → 收藏按钮(新 UX)
 *   - mode="personal" → 显示「已启用 / 未启用」状态 badge
 *                     + 启用/停用切换按钮 + 右上 X 移除
 */
"use client"

import { useState } from "react"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChevronRight, PencilLine, ShieldOff, Wrench } from "lucide-react"
import type { MySkill, Skill } from "@/types/skill"
import { EnableSkillButton } from "./enable-skill-button"
import { FavoriteSkillButton } from "./favorite-skill-button"
import { RemoveSkillButton } from "./remove-skill-button"
import { SkillDetailDialog } from "./skill-detail-dialog"

export type SkillCardMode = "public" | "personal"

interface SkillCardProps {
  skill: Skill | MySkill
  mode?: SkillCardMode
  /**
   * Current user id. When provided together with mode="personal",
   * SkillCard renders an "更新" button on user_self skills the
   * current user owns. Callers that don't want this affordance can
   * omit the prop (e.g. when the page can't determine ownership).
   */
  currentUserId?: number | null
  /**
   * Click handler for the "更新" button. Required when currentUserId
   * is set so the parent can open the update dialog. Card stops the
   * click from bubbling up to the card's own open-detail handler.
   */
  onUpdate?: (skill: Skill | MySkill) => void
}

const DESCRIPTION_PREVIEW = 120

export function SkillCard({ skill, mode = "public", currentUserId, onUpdate }: SkillCardProps) {
  const [open, setOpen] = useState(false)
  const isLong = skill.description.length > DESCRIPTION_PREVIEW
  const preview = isLong
    ? skill.description.slice(0, DESCRIPTION_PREVIEW).trimEnd() + "…"
    : skill.description

  // 个人 Tab 才显示启用状态 badge;公开 Tab 不显示(还未收藏)
  const showStatusBadge = mode === "personal" && "enabled" in skill
  const isEnabled = showStatusBadge && (skill as MySkill).enabled

  // 「我的 Skill」Tab:仅当当前用户是 user_self 作者时,显示「更新」按钮。
  // (admin / super_admin 也能更新任意 skill,但那是 /skills/admin 的范畴,
  // 公开广场 + 我的 Skill Tab 不应混入管理操作)
  const canUpdate =
    mode === "personal" &&
    skill.uploaderType === "user_self" &&
    currentUserId != null &&
    skill.uploaderId === currentUserId &&
    typeof onUpdate === "function"

  // 管理员强制停用 — 显示原因 + 禁用启用按钮。
  // archived 的 skill 仍可能在用户的收藏夹里(我们不删除 user_skill_binding),
  // 但 Vibe 端看不到。让用户知道「为什么这个 skill 不能用了」。
  const isArchived = skill.status === "archived"
  const archivedReason =
    mode === "personal" && "archivedReason" in skill
      ? (skill as MySkill).archivedReason
      : null

  return (
    <>
      {/*
        ★ 卡片高度统一 — 模板是「公司财报分析的框架」,同一行里的所有卡片
        必须等高,footer 始终在卡片底部对齐。两个关键 class:
          1. h-full — 让 Card 填满 grid cell(grid 默认 items-stretch,
             但 Card 自己不显式 h-full 的话,高度还是内容自适应)
          2. flex-1 (CardContent) — Card 已经是 flex flex-col,content
             flex-1 会吃掉 footer 下方剩余空间,把 footer 推到卡片底部
        没有 h-full,卡片还是按内容撑开;没有 flex-1,footer 会紧贴内容
        而不是贴底。
      */}
      <Card
        className="relative h-full cursor-pointer transition-colors hover:bg-muted/30"
        onClick={() => setOpen(true)}
      >
        {/* ★ 个人 Tab 右上角 X 按钮 — 移除收藏 */}
        {mode === "personal" && (
          <div
            className="absolute right-2 top-2 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <RemoveSkillButton
              skillId={skill.id}
              skillName={skill.name}
              variant="card"
            />
          </div>
        )}
        <CardContent className="flex-1 space-y-2 pt-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-1 text-base font-semibold">
              {skill.name}
            </h3>
            <div className="flex shrink-0 items-center gap-1">
              {showStatusBadge && (
                <Badge
                  variant={isEnabled ? "default" : "secondary"}
                  className="text-xs"
                >
                  {isEnabled ? "已启用" : "未启用"}
                </Badge>
              )}
              {skill.category && (
                <Badge variant="outline" className="text-xs">
                  {skill.category}
                </Badge>
              )}
            </div>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {preview}
          </p>
          {/* ★ 管理员停用提示 — 仅在「我的 Skill」Tab + archived 状态下渲染。
              即使没有填 reason,也告诉用户「管理员停用的」而不是空白。 */}
          {mode === "personal" && isArchived && (
            <div
              className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200"
              data-testid="archived-banner"
            >
              <div className="flex items-center gap-1.5 font-medium">
                <ShieldOff className="size-3" />
                管理员已停用
              </div>
              {archivedReason && (
                <div className="mt-0.5 text-amber-800/80 dark:text-amber-300/80">
                  {archivedReason}
                </div>
              )}
            </div>
          )}
        </CardContent>
        <CardFooter
          className="flex items-center justify-between border-t pt-3"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Wrench className="size-3" />
            {skill.tools.length} tools
            {isLong && (
              <Button
                variant="link"
                size="sm"
                onClick={() => setOpen(true)}
                className="ml-2 h-auto p-0 text-xs cursor-pointer"
              >
                查看详情
                <ChevronRight className="size-3" />
              </Button>
            )}
          </span>
          {mode === "public" ? (
            <FavoriteSkillButton
              skillId={skill.id}
              skillName={skill.name}
            />
          ) : (
            <div className="flex items-center gap-1">
              {canUpdate && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    onUpdate?.(skill)
                  }}
                  className="cursor-pointer"
                >
                  <PencilLine className="mr-1 size-3" />
                  更新
                </Button>
              )}
              {/*
                ★ Archived skill 的启用 / 停用按钮 — 服务端已经拒绝 enable
                archived skill(返回 403),前端提前禁用避免触发失败请求。
                hover 提示告诉用户原因。 */}
              {isArchived ? (
                <Button
                  variant="outline"
                  size="sm"
                  disabled
                  title="该 Skill 已被管理员停用,无法启用"
                  className="cursor-not-allowed"
                >
                  启用
                </Button>
              ) : (
                <EnableSkillButton skillId={skill.id} />
              )}
            </div>
          )}
        </CardFooter>
      </Card>

      <SkillDetailDialog
        skill={skill}
        open={open}
        onOpenChange={setOpen}
        mode={mode}
      />
    </>
  )
}