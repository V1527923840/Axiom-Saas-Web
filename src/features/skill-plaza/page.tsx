/**
 * Skill Plaza Page — /skills 路由 (普通用户 + admin 都能看)。
 *
 * 展示已发布 skill 列表,提供启用/停用按钮。
 */
import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Search, Wand2 } from "lucide-react"
import { SkillCard } from "./components/skill-card"
import { useSkills } from "./hooks/use-skills"

export default function SkillPlazaPage() {
  const [search, setSearch] = useState("")
  const { data, isLoading, error } = useSkills({
    page: 1,
    pageSize: 24,
  })

  const items =
    data?.items.filter(
      (s) =>
        !search ||
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.code.toLowerCase().includes(search.toLowerCase()) ||
        s.description.toLowerCase().includes(search.toLowerCase()),
    ) ?? []

  return (
    <div className="container mx-auto space-y-6 py-6">
      <div className="flex items-center gap-3">
        <Wand2 className="h-7 w-7 text-violet-500" />
        <div className="flex-1">
          <h1 className="text-2xl font-semibold">Skill 广场</h1>
          <p className="text-sm text-muted-foreground">
            浏览并启用 Skill，让 AI 对话获得垂直领域知识与工具
          </p>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="搜索 skill…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>
            加载失败:{(error as Error).message}
          </AlertDescription>
        </Alert>
      )}

      {isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      )}

      {!isLoading && items.length === 0 && (
        <div className="py-12 text-center text-muted-foreground">
          {search ? "没有匹配的 skill" : "暂无可用 skill"}
        </div>
      )}

      {!isLoading && items.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((s) => (
            <SkillCard key={s.id} skill={s} />
          ))}
        </div>
      )}
    </div>
  )
}