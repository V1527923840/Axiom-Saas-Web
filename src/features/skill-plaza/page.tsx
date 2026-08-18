/**
 * Skill Plaza Page — /skills 路由 (普通用户 + admin 都能看)。
 *
 * 按现有模块规范:
 *   - BaseLayout 提供 title + description + 侧栏 + 顶栏
 *   - 过滤条 (bg-muted/30 + items-end + Label/Select) 风格
 *   - EmptyState 三态
 *   - Card 网格 (skill-card 已对齐 shadcn card 组件)
 */
"use client"

import { useState, useMemo } from "react"
import { BaseLayout } from "@/components/layouts/base-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RefreshCw, Search, UploadCloud } from "lucide-react"
import { SkillCard } from "./components/skill-card"
import { EmptyState } from "./components/empty-state"
import { useSkills } from "./hooks/use-skills"

const PAGE_SIZE = 24

export default function SkillPlazaPage() {
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState<string>("all")
  const [page, setPage] = useState(1)

  const { data, isLoading, error, refetch } = useSkills({
    page,
    pageSize: PAGE_SIZE,
  })

  const items = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  // 提取所有出现过的 category 给 filter
  const categories = useMemo(() => {
    const set = new Set<string>()
    for (const s of items) if (s.category) set.add(s.category)
    return Array.from(set).sort()
  }, [items])

  function resetFilters() {
    setSearch("")
    setCategory("all")
    setPage(1)
  }
  void resetFilters

  return (
    <BaseLayout title="Skill 广场" description="浏览并启用 Skill,让 AI 对话获得垂直领域知识与工具">
      <div className="px-4 lg:px-6 space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap items-end gap-4 p-4 bg-muted/30 rounded-lg">
          <div className="space-y-1 min-w-[200px] flex-1">
            <Label className="text-xs">搜索</Label>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="按 name / code / description 搜索"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">分类</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-[160px] cursor-pointer">
                <SelectValue placeholder="全部分类" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部分类</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="outline"
            onClick={() => refetch()}
            className="cursor-pointer"
          >
            <RefreshCw className="size-4 mr-2" />
            刷新
          </Button>
          <Button asChild className="cursor-pointer">
            <a href="/skills/admin">
              <UploadCloud className="size-4 mr-2" />
              上传 Skill
            </a>
          </Button>
        </div>

        {/* List / / / */}
        {isLoading && items.length === 0 ? (
          <EmptyState loading />
        ) : error ? (
          <EmptyState error={(error as Error).message} onRetry={() => refetch()} />
        ) : items.length === 0 ? (
          <EmptyState
            emptyHint={
              search || category !== "all" ? "没有匹配的 Skill" : "暂无可用 Skill"
            }
          />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {items.map((s) => (
                <SkillCard key={s.id} skill={s} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <p className="text-sm text-muted-foreground">
                  共 {total} 条 · 第 {page} / {totalPages} 页
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                    className="cursor-pointer"
                  >
                    上一页
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage(page + 1)}
                    className="cursor-pointer"
                  >
                    下一页
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </BaseLayout>
  )
}