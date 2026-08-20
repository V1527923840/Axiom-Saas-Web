/**
 * FrontmatterPreview — 解析单 .md 的元数据并展示。
 *
 * 用于上传前的本地校验:展示 frontmatter 字段是否合规。
 */
import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { parseSkillMd } from "../lib/frontmatter"

interface FrontmatterPreviewProps {
  md: string
}

export function FrontmatterPreview({ md }: FrontmatterPreviewProps) {
  const [parsed, setParsed] = useState<ReturnType<typeof parseSkillMd> | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
      setParsed(parseSkillMd(md))
      setError(null)
    } catch (e) {
      setError((e as Error).message)
      setParsed(null)
    }
  }, [md])

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="p-3 text-sm text-destructive">
          frontmatter 解析失败: {error}
        </CardContent>
      </Card>
    )
  }
  if (!parsed) return null
  const fm = parsed.frontmatter
  return (
    <Card>
      <CardContent className="space-y-2 p-3 text-sm">
        <div className="flex items-center gap-2">
          <Badge>name: {fm.name}</Badge>
          {fm.category && <Badge variant="secondary">{fm.category}</Badge>}
        </div>
        <p className="text-muted-foreground">{fm.description}</p>
        {fm.tags && fm.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {fm.tags.map((t) => (
              <Badge key={t} variant="outline">
                #{t}
              </Badge>
            ))}
          </div>
        )}
        {fm.files_index && fm.files_index.length > 0 && (
          <div className="text-xs text-muted-foreground">
            files_index: {fm.files_index.map((f) => f.path).join(", ")}
          </div>
        )}
      </CardContent>
    </Card>
  )
}