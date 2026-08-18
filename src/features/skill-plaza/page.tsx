/**
 * Skill Plaza Page — /skills
 *
 * Tabs:
 *   - "公开 Skill" — 平台已发布的 skill 广场(任何人浏览)
 *   - "个人用户" — 我已启用的 skill(来自 /users/me/skills)
 *
 * Layout 与现有模块对齐:BaseLayout + 过滤条 + SkillCard 网格 + EmptyState。
 */
"use client"

import { useMemo, useState } from "react"
import { BaseLayout } from "@/components/layouts/base-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import { useUserSkillBindings } from "./hooks/use-user-skill-bindings"
import { PREDEFINED_CATEGORIES } from "./lib/categories"

const PAGE_SIZE = 24

export default function SkillPlazaPage() {
  const [tab, setTab] = useState<"public" | "personal">("public")
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState<string>("all")
  const [page, setPage] = useState(1)

  const publicSkills = useSkills({
    page,
    pageSize: PAGE_SIZE,
  })
  const personalSkills = useUserSkillBindings()

  // 公共列表里的所有 category(含预设 3 个 + 数据里新出现的)
  const categoryOptions = useMemo(() => {
    const set = new Set<string>(PREDEFINED_CATEGORIES)
    for (const s of publicSkills.data?.items ?? []) {
      if (s.category) set.add(s.category)
    }
    return Array.from(set).sort()
  }, [publicSkills.data])

  const publicItems = publicSkills.data?.items ?? []
  const personalItems = personalSkills.enabledSkills

  return (
    <BaseLayout title="Skill 广场" description="浏览并启用 Skill,让 AI 对话获得垂直领域知识与工具">
      <div className="px-4 lg:px-6 space-y-4">
        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as "public" | "personal")}
        >
          <div className="flex flex-wrap items-end justify-between gap-4">
            <TabsList>
              <TabsTrigger value="public" className="cursor-pointer">
                Skill 市场
                <span className="ml-2 text-xs text-muted-foreground">
                  ({publicSkills.data?.total ?? publicItems.length})
                </span>
              </TabsTrigger>
              <TabsTrigger value="personal" className="cursor-pointer">
                我的 Skill
                <span className="ml-2 text-xs text-muted-foreground">
                  ({personalItems.length})
                </span>
              </TabsTrigger>
            </TabsList>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  publicSkills.refetch()
                  personalSkills.isLoading || personalSkills.error
                    ? null
                    : personalSkills.enabledSkills.length || true
                }}
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
          </div>

          {/* Filters — only relevant for public tab */}
          {tab === "public" && (
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
                    {categoryOptions.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Skill 市场 — 平台已发布的全部 */}
          <TabsContent value="public" className="space-y-3">
            {publicSkills.isLoading && publicItems.length === 0 ? (
              <EmptyState loading />
            ) : publicSkills.error ? (
              <EmptyState
                error={(publicSkills.error as Error).message}
                onRetry={() => publicSkills.refetch()}
              />
            ) : publicItems.length === 0 ? (
              <EmptyState
                emptyHint={
                  search || category !== "all"
                    ? "没有匹配的 Skill"
                    : "暂无可用 Skill"
                }
              />
            ) : (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {publicItems.map((s) => (
                    <SkillCard key={s.id} skill={s} />
                  ))}
                </div>
                <Pagination
                  page={page}
                  setPage={setPage}
                  total={publicSkills.data?.total ?? 0}
                />
              </>
            )}
          </TabsContent>

          {/* 我的 Skill — 已启用的 */}
          <TabsContent value="personal" className="space-y-3">
            {personalSkills.isLoading ? (
              <EmptyState loading />
            ) : personalSkills.error ? (
              <EmptyState
                error={(personalSkills.error as Error).message}
                onRetry={() => personalSkills.enabledSkills.length || true}
              />
            ) : personalItems.length === 0 ? (
              <EmptyState
                emptyHint="你还没有启用任何 Skill — 切换到「Skill 市场」挑几个吧"
              />
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {personalItems.map((s) => (
                  <SkillCard key={s.id} skill={s} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </BaseLayout>
  )
}

function Pagination({
  page,
  setPage,
  total,
}: {
  page: number
  setPage: (p: number) => void
  total: number
}) {
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  if (totalPages <= 1) return null
  return (
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
  )
}