/**
 * SkillCard — 精简卡片。
 *
 * 设计:
 *   - 不要 thumbnail(用户要求)
 *   - 显示 name + category + description 摘要(>120 字截断)
 *   - 长描述点击卡片打开 SkillDetailDialog
 *   - 启用按钮始终可见
 */
"use client"

import { useState } from "react"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChevronRight, Wrench } from "lucide-react"
import type { Skill } from "@/types/skill"
import { EnableSkillButton } from "./enable-skill-button"
import { SkillDetailDialog } from "./skill-detail-dialog"

interface SkillCardProps {
  skill: Skill
}

const DESCRIPTION_PREVIEW = 120

export function SkillCard({ skill }: SkillCardProps) {
  const [open, setOpen] = useState(false)
  const isLong = skill.description.length > DESCRIPTION_PREVIEW
  const preview = isLong
    ? skill.description.slice(0, DESCRIPTION_PREVIEW).trimEnd() + "…"
    : skill.description

  return (
    <>
      <Card
        className="cursor-pointer transition-colors hover:bg-muted/30"
        onClick={() => setOpen(true)}
      >
        <CardContent className="space-y-2 pt-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-1 text-base font-semibold">
              {skill.name}
            </h3>
            {skill.category && (
              <Badge variant="outline" className="shrink-0">
                {skill.category}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {preview}
          </p>
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
                className="ml-2 h-auto p-0 text-xs"
              >
                查看详情
                <ChevronRight className="size-3" />
              </Button>
            )}
          </span>
          <EnableSkillButton skillId={skill.id} />
        </CardFooter>
      </Card>

      <SkillDetailDialog
        skill={skill}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  )
}