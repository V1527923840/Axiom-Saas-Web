/**
 * SkillCard — 广场卡片。展示 thumbnail + name + description + tags + EnableButton。
 */
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import type { Skill } from "@/types/skill"
import { EnableSkillButton } from "./enable-skill-button"
import { SkillTag } from "./skill-tag"
import { SkillThumbnail } from "./skill-thumbnail"

interface SkillCardProps {
  skill: Skill
}

export function SkillCard({ skill }: SkillCardProps) {
  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <CardHeader className="p-0">
        <SkillThumbnail src={skill.thumbnailUrl} name={skill.name} />
      </CardHeader>
      <CardContent className="flex-1 space-y-2 pt-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="line-clamp-1 text-lg font-semibold">{skill.name}</h3>
          {skill.category && <SkillTag label={skill.category} />}
        </div>
        <p className="line-clamp-3 text-sm text-muted-foreground">
          {skill.description}
        </p>
        {skill.tags && skill.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {skill.tags.slice(0, 4).map((t) => (
              <SkillTag key={t} label={t} variant="outline" />
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter className="border-t pt-3">
        <div className="flex w-full items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {skill.tools.length} tools
          </span>
          <EnableSkillButton skillId={skill.id} />
        </div>
      </CardFooter>
    </Card>
  )
}