import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { IntelligenceDetailDialog } from "@/features/content/intelligence/components/IntelligenceDetailDialog"
import { useIntelligencePostsStore } from "@/features/content/intelligence/hooks/use-intelligence-posts"
import { ResearchAnalysisDetailDialog } from "@/features/content/research-analysis/components/ResearchAnalysisDetailDialog"
import { useResearchAnalysisStore } from "@/features/content/research-analysis/hooks/use-research-analysis"
import { getDailySummarySources } from "@/services/daily-summary"
import type { ContentItemMeta, SourcesResponse } from "@/services/daily-summary"

type PageSize = 20 | 50 | 100

interface TabState {
  page: number // 0-based
  pageSize: PageSize
}

function GroupTable({
  rows,
  onView,
}: {
  rows: ContentItemMeta[]
  onView: (item: ContentItemMeta) => void
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">无</p>
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>标题</TableHead>
          <TableHead className="w-[80px]">操作</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.id}>
            <TableCell className="font-medium max-w-[480px] truncate">
              {r.title}
            </TableCell>
            <TableCell>
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer"
                onClick={() => onView(r)}
              >
                查看
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

/**
 * Pagination footer shown below each tab's table. Pure presentation —
 * all state lives in the parent (SourcesTab) so each tab has its own
 * independent `{page, pageSize}`.
 *
 * `pageSize` is server-side: every change re-fetches with the new limit
 * and resets `page` to 0. We deliberately don't synthesize a local
 * "show more" button — server returns up to `limit` rows + the un-sliced
 * `total`, so `下一页`/`上一页` is well-defined.
 */
function PaginationBar({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: {
  page: number
  pageSize: PageSize
  total: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: PageSize) => void
}) {
  // total=0 means the server has no rows for this group at all — skip.
  if (total === 0) return null
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const start = total === 0 ? 0 : page * pageSize + 1
  const end = Math.min(total, (page + 1) * pageSize)
  const canPrev = page > 0
  const canNext = page + 1 < totalPages
  return (
    <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
      <div>
        共 {total} 条 · 第 {start}-{end} 条 · 第 {page + 1} / {totalPages} 页
      </div>
      <div className="flex items-center gap-2">
        <Select
          value={String(pageSize)}
          onValueChange={(v) => onPageSizeChange(Number(v) as PageSize)}
        >
          <SelectTrigger className="h-7 w-[88px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="20">20 / 页</SelectItem>
            <SelectItem value="50">50 / 页</SelectItem>
            <SelectItem value="100">100 / 页</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          disabled={!canPrev}
          onClick={() => onPageChange(page - 1)}
        >
          上一页
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!canNext}
          onClick={() => onPageChange(page + 1)}
        >
          下一页
        </Button>
      </div>
    </div>
  )
}

export function SourcesTab({
  reportId,
}: {
  reportId: string | null
}) {
  const { token } = useAuth()
  const intelligence = useIntelligencePostsStore()
  const research = useResearchAnalysisStore()

  // Server-side pagination per tab. Each tab has independent state.
  // Initial defaults match the agreed plan (default 20 per page).
  const [activeTab, setActiveTab] = useState<"posts" | "research">("posts")
  const [postsState, setPostsState] = useState<TabState>({
    page: 0,
    pageSize: 20,
  })
  const [researchState, setResearchState] = useState<TabState>({
    page: 0,
    pageSize: 20,
  })

  // Derive the active request params from the selected tab.
  const activeState = activeTab === "posts" ? postsState : researchState
  const limit = activeState.pageSize
  const offset = activeState.page * activeState.pageSize

  const [sources, setSources] = useState<SourcesResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Fetch when reportId OR (limit/offset) change. While reportId is
  // null (drawer closed), don't fire — mirrors the old guard pattern.
  useEffect(() => {
    if (!reportId) {
      setSources(null)
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    getDailySummarySources(token, reportId, { limit, offset })
      .then((r) => { if (!cancelled) setSources(r.data) })
      .catch((e) => { if (!cancelled) setError(e as Error) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [token, reportId, limit, offset])

  const handleTabChange = (v: string) => {
    const next = v as "posts" | "research"
    setActiveTab(next)
    // Reset the OTHER tab's page to 0 so the user lands on the first
    // page of the new group instead of carrying an offset that no
    // longer corresponds to anything.
    if (next === "posts") setPostsState((s) => ({ ...s, page: 0 }))
    else setResearchState((s) => ({ ...s, page: 0 }))
  }

  if (loading) return <Skeleton className="h-32 w-full" />
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>加载来源失败</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    )
  }
  if (!sources) return <p className="text-sm text-muted-foreground">无数据</p>

  const { posts, research: researchRows, postsTotal, researchTotal } = sources

  // Aggregate empty: use un-sliced totals, not the current-page arrays.
  // (posts.length can be 0 just because the user is past the last page.)
  if (postsTotal === 0 && researchTotal === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        该报告没有关联的来源数据
      </p>
    )
  }

  const handleViewPost = (item: ContentItemMeta) => {
    void intelligence.fetchDetail(item.id)
  }
  const handleViewResearch = (item: ContentItemMeta) => {
    const numericId = Number(item.id)
    if (!Number.isFinite(numericId)) return
    void research.fetchDetail(numericId)
  }

  return (
    <>
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="w-full"
      >
        <TabsList>
          <TabsTrigger value="posts">帖文 ({postsTotal})</TabsTrigger>
          <TabsTrigger value="research">研报 ({researchTotal})</TabsTrigger>
        </TabsList>
        <TabsContent value="posts" className="mt-4">
          <GroupTable rows={posts} onView={handleViewPost} />
          <PaginationBar
            page={postsState.page}
            pageSize={postsState.pageSize}
            total={postsTotal}
            onPageChange={(p) => setPostsState((s) => ({ ...s, page: p }))}
            onPageSizeChange={(size) =>
              setPostsState({ page: 0, pageSize: size })
            }
          />
        </TabsContent>
        <TabsContent value="research" className="mt-4">
          <GroupTable rows={researchRows} onView={handleViewResearch} />
          <PaginationBar
            page={researchState.page}
            pageSize={researchState.pageSize}
            total={researchTotal}
            onPageChange={(p) =>
              setResearchState((s) => ({ ...s, page: p }))
            }
            onPageSizeChange={(size) =>
              setResearchState({ page: 0, pageSize: size })
            }
          />
        </TabsContent>
      </Tabs>

      <IntelligenceDetailDialog
        item={intelligence.selectedItem}
        open={intelligence.detailDialogOpen}
        onOpenChange={intelligence.closeDetail}
      />
      <ResearchAnalysisDetailDialog
        item={research.selectedItem}
        open={research.detailDialogOpen}
        onOpenChange={research.closeDetail}
      />
    </>
  )
}