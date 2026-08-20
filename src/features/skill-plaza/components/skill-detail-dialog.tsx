/**
 * SkillDetailDialog — 详情弹窗。
 *
 * 长 description / 完整元数据 / tool 列表在这里展示,卡片只显示摘要。
 */
"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Wrench, Calendar, Hash } from "lucide-react"
import type { Skill } from "@/types/skill"
import { SkillTag } from "./skill-tag"
import { EnableSkillButton } from "./enable-skill-button"
import { FavoriteSkillButton } from "./favorite-skill-button"
import { RemoveSkillButton } from "./remove-skill-button"

interface SkillDetailDialogProps {
  skill: Skill | null
  open: boolean
  onOpenChange: (open: boolean) => void
  mode?: "public" | "personal"
}

function formatDate(s: string | null): string {
  if (!s) return "-"
  try {
    return new Date(s).toLocaleString("zh-CN")
  } catch {
    return s
  }
}

export function SkillDetailDialog({
  skill,
  open,
  onOpenChange,
  mode = "public",
}: SkillDetailDialogProps) {
  if (!skill) return null
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle className="text-xl">{skill.name}</DialogTitle>
            {skill.category && (
              <Badge variant="outline">{skill.category}</Badge>
            )}
          </div>
          <DialogDescription>
            <span className="font-mono text-xs">{skill.code}</span>
            <span className="mx-2 text-muted-foreground">·</span>
            <span className="text-xs text-muted-foreground">
              {formatDate(skill.publishedAt)}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <section>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">
              描述
            </h3>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {skill.description}
            </p>
          </section>

          {skill.tags && skill.tags.length > 0 && (
            <section>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                标签
              </h3>
              <div className="flex flex-wrap gap-1">
                {skill.tags.map((t) => (
                  <SkillTag key={t} label={t} variant="outline" />
                ))}
              </div>
            </section>
          )}

          {skill.tools.length > 0 && (
            <>
              <Separator />
              <section>
                <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1">
                  <Wrench className="size-3" />
                  提供工具 ({skill.tools.length})
                </h3>
                <div className="space-y-2">
                  {skill.tools.map((t) => (
                    <div
                      key={t.name}
                      className="rounded border bg-muted/30 p-2 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{t.name}</span>
                        {t.description && (
                          <span className="text-muted-foreground">
                            — {t.description}
                          </span>
                        )}
                      </div>
                      {/* ★ 2026-08-20: SkillToolSchema 没有 endpoint 字段
                          (见 src/types/skill.ts:35)。后端 jsonb tools 也不存这个 key,
                          之前留下的 t.endpoint JSX 是 dead code,移除即可。
                          如果以后需要展示 endpoint,先在 SkillToolSchema 加字段。 */}
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}

          <Separator />

          <section className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Hash className="size-3" />
                v{skill.contentHash?.slice(0, 8) ?? "—"}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="size-3" />
                更新于 {formatDate(skill.updatedAt)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {mode === "public" ? (
                <FavoriteSkillButton
                  skillId={skill.id}
                  skillName={skill.name}
                />
              ) : (
                <>
                  <EnableSkillButton skillId={skill.id} />
                  <RemoveSkillButton
                    skillId={skill.id}
                    skillName={skill.name}
                    variant="inline"
                  />
                </>
              )}
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}