/**
 * Skill Plaza Page — /skills
 *
 * Tabs:
 *   - "Skill 市场" — 平台已发布的 skill 广场(任何人浏览)
 *   - "我的 Skill" — 我已启用的 skill(来自 /users/me/skills)
 *
 * 过滤条显式触发:
 *   - 搜索 → 按技能名称 + 描述(client-side 模糊匹配)→ 点「搜索」/Enter 触发
 *   - 分类 → 服务端 category 过滤(Select onChange 即触发)
 *   - 「重置」清空搜索 + 分类 + 回第一页
 *
 * 注意: 当前后端 listSkills 不支持 ?q=…,搜索是浏览器内 filter;
 * 按 pageSize=24 截断的当前页生效。如果未来数据量大可加 server-side q。
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
import { RefreshCw, Search, UploadCloud, X } from "lucide-react"
import { SkillCard } from "./components/skill-card"
import { EmptyState } from "./components/empty-state"
import { SkillUploadDialog } from "./components/skill-upload-dialog"
import { useSkills } from "./hooks/use-skills"
import { useUserSkillBindings } from "./hooks/use-user-skill-bindings"
import { useAuth } from "@/contexts/auth-context"
import { PREDEFINED_CATEGORIES } from "./lib/categories"
import type { Skill } from "@/types/skill"

const PAGE_SIZE = 24

// 内部/测试用 category 不出现在广场分类下拉里
const EXCLUDED_CATEGORIES = new Set(["testing", "internal", "draft"])

function clientFilter(
  items: Skill[],
  rawSearch: string,
  rawCategory: string,
): Skill[] {
  const search = rawSearch.trim().toLowerCase()
  const category = rawCategory
  return items.filter((s) => {
    if (category !== "all" && s.category !== category) return false
    if (!search) return true
    const name = s.name.toLowerCase()
    const desc = s.description.toLowerCase()
    return name.includes(search) || desc.includes(search)
  })
}

export default function SkillPlazaPage() {
  const [tab, setTab] = useState<"public" | "personal">("public")
  const [search, setSearch] = useState("")
  const [appliedSearch, setAppliedSearch] = useState("")
  const [category, setCategory] = useState<string>("all")
  const [page, setPage] = useState(1)
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  // 「我的 Skill」Tab 内联更新弹窗 — 只在 user_self + 本人是作者时打开
  const [updateSkill, setUpdateSkill] = useState<Skill | null>(null)

  const auth = useAuth()
  const currentUserId =
    typeof auth.user?.id === "number" ? auth.user.id : null

  const publicSkills = useSkills({
    page,
    pageSize: PAGE_SIZE,
    status: "published",
  })
  const personalSkills = useUserSkillBindings()

  // 公共列表里出现过的 category(预设 3 + 数据),排除内部值
  const categoryOptions = useMemo(() => {
    const set = new Set<string>(PREDEFINED_CATEGORIES)
    for (const s of publicSkills.data?.items ?? []) {
      if (s.category && !EXCLUDED_CATEGORIES.has(s.category)) {
        set.add(s.category)
      }
    }
    return Array.from(set).sort()
  }, [publicSkills.data])

  const allItems = publicSkills.data?.items ?? []
  const visibleItems = useMemo(
    () => clientFilter(allItems, appliedSearch, category),
    [allItems, appliedSearch, category],
  )
  // ★ 个人 Tab 完全独立 — 不复用公开 Tab 的 appliedSearch / category。
  // /users/me/skills 接口本来就不接受任何 query 参数,
  // 之前 personalFiltered 用 appliedSearch 做客户端模糊匹配,会让用户在
  // 公开 Tab 搜索后切到「我的 Skill」时,自己的收藏被同一关键字过滤。
  const personalItems = personalSkills.favorites

  function handleSearch() {
    setAppliedSearch(search)
    setPage(1)
    // 显式触发 refetch 让数据保持新鲜(也作为「搜索」按钮的存在感)
    publicSkills.refetch()
  }
  function handleReset() {
    setSearch("")
    setAppliedSearch("")
    setCategory("all")
    setPage(1)
    publicSkills.refetch()
  }

  return (
    <BaseLayout
      title="Skill 广场"
      description="浏览并启用 Skill,让 AI 对话获得垂直领域知识与工具"
    >
      <div className="px-4 lg:px-6 space-y-4">
        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as "public" | "personal")}
        >
          <div className="flex flex-wrap items-end justify-between gap-4">
            <TabsList>
              <TabsTrigger value="public" className="cursor-pointer">
                Skill 市场
              </TabsTrigger>
              <TabsTrigger value="personal" className="cursor-pointer">
                我的 Skill
              </TabsTrigger>
            </TabsList>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => publicSkills.refetch()}
                className="cursor-pointer"
              >
                <RefreshCw className="size-4 mr-2" />
                刷新
              </Button>
              <Button
                onClick={() => setUploadDialogOpen(true)}
                className="cursor-pointer"
              >
                <UploadCloud className="size-4 mr-2" />
                上传 Skill
              </Button>
            </div>
          </div>

          {/* Filters — 仅公开 Tab 显示 */}
          {tab === "public" && (
            <form
              className="flex flex-wrap items-end gap-4 p-4 bg-muted/30 rounded-lg"
              onSubmit={(e) => {
                e.preventDefault()
                handleSearch()
              }}
            >
              <div className="space-y-1 min-w-[200px] flex-1">
                <Label className="text-xs">搜索</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="按技能名称 / 描述搜索"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    // ★ 三件套对齐:
                    //   1. h-10 — 显式设 40px(默认 h-9=36px 偏矮)
                    //   2. py-2 — shadcn Input 默认 py-1(4px),Button / SelectTrigger
                    //      默认 py-2(8px),即使 box 同高,文字垂直位置也会差 4px
                    //   3. pl-8 — 给左侧 Search icon 留位置
                    className="pl-8 h-10 py-2"
                  />
                </div>
              </div>
              {/* ★ 分类不要 Label:items-end 排布下,Label 在 wrapper 顶部会让 wrapper
                  高度多出 label + space-y-1,SelectTrigger 被推到 wrapper 底部,
                  跟紧邻的按钮产生明显视觉错位。placeholder "全部分类" 已经
                  表达了用途,Label 是冗余的。 */}
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-[160px] cursor-pointer !h-10">
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
              <Button type="submit" className="cursor-pointer h-10">
                <Search className="size-4 mr-2" />
                搜索
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                className="cursor-pointer h-10"
              >
                <X className="size-4 mr-2" />
                重置
              </Button>
            </form>
          )}

          {/* Skill 市场 — 平台已发布的全部 */}
          <TabsContent value="public" className="space-y-3">
            {publicSkills.isLoading && allItems.length === 0 ? (
              <EmptyState loading />
            ) : publicSkills.error ? (
              <EmptyState
                error={(publicSkills.error as Error).message}
                onRetry={() => publicSkills.refetch()}
              />
            ) : visibleItems.length === 0 ? (
              <EmptyState
                emptyHint={
                  appliedSearch || category !== "all"
                    ? "没有匹配的 Skill"
                    : "暂无可用 Skill"
                }
              />
            ) : (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {visibleItems.map((s) => (
                    <SkillCard key={s.id} skill={s} mode="public" />
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

          {/* 我的 Skill — 所有收藏(已启用 + 仅收藏)。
              独立于公开 Tab 的过滤条件,展示用户实际绑定的全部 skill。 */}
          <TabsContent value="personal" className="space-y-3">
            {personalSkills.isLoading ? (
              <EmptyState loading />
            ) : personalSkills.error ? (
              <EmptyState
                error={(personalSkills.error as Error).message}
                onRetry={() => publicSkills.refetch()}
              />
            ) : personalItems.length === 0 ? (
              <EmptyState
                emptyHint="你还没有收藏任何 Skill — 切换到「Skill 市场」挑几个吧"
              />
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {personalItems.map((s) => (
                  <SkillCard
                    key={s.id}
                    skill={s}
                    mode="personal"
                    currentUserId={currentUserId}
                    onUpdate={setUpdateSkill}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/*
          与 admin 页面同源的 SkillUploadDialog — 完全受控。
          父组件自己持有 open 状态,不再传 trigger(以前用 hidden span
          遮住组件内部的默认按钮 — 那个 bug 已修复,现在 trigger 不传即可)。
        */}
        <SkillUploadDialog
          open={uploadDialogOpen}
          onOpenChange={setUploadDialogOpen}
          onSuccess={() => {
            setUploadDialogOpen(false)
            publicSkills.refetch()
          }}
        />

        {/* 「我的 Skill」Tab 的内联更新弹窗 — 只在本人是 user_self 作者时打开 */}
        {updateSkill && (
          <SkillUploadDialog
            mode="update"
            skill={updateSkill}
            open={!!updateSkill}
            onOpenChange={(o) => !o && setUpdateSkill(null)}
            onSuccess={() => {
              setUpdateSkill(null)
              // 公开 Tab 的 skills 缓存 + 个人 Tab 的 bindings 都要刷
              publicSkills.refetch()
              personalSkills.refetch?.()
            }}
          />
        )}
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