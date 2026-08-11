import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
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
import type { ContentItemMeta, SourcesResponse } from "@/services/daily-summary"

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

export function SourcesTab({
  sources,
  loading,
  error,
}: {
  sources: SourcesResponse | null
  loading: boolean
  error: Error | null
}) {
  // Reuse the list-page detail stores so the dialog UX matches 情报精选 /
  // 机构研报 exactly. SourcesTab never reads `posts` / `items` /
  // pagination — it only triggers `fetchDetail(id)` and reads
  // `selectedItem` + `detailDialogOpen` to drive the shared dialogs.
  const intelligence = useIntelligencePostsStore()
  const research = useResearchAnalysisStore()

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

  const { posts, research: researchRows } = sources

  if (posts.length === 0 && researchRows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        该报告没有关联的来源数据
      </p>
    )
  }

  const handleViewPost = (item: ContentItemMeta) => {
    // intelligence stores detail id as string; ContentItemMeta.id is
    // already a string, so pass through.
    void intelligence.fetchDetail(item.id)
  }

  const handleViewResearch = (item: ContentItemMeta) => {
    // ResearchAnalysisDetail expects a numeric id; ContentItemMeta.id
    // is a string. If the upstream service emits a non-numeric id we
    // fall back to skipping the request — the dialog won't open but
    // the table state stays consistent.
    const numericId = Number(item.id)
    if (!Number.isFinite(numericId)) return
    void research.fetchDetail(numericId)
  }

  return (
    <>
      <Tabs defaultValue="posts" className="w-full">
        <TabsList>
          <TabsTrigger value="posts">帖文 ({sources.postsTotal})</TabsTrigger>
          <TabsTrigger value="research">研报 ({sources.researchTotal})</TabsTrigger>
        </TabsList>
        <TabsContent value="posts" className="mt-4">
          <GroupTable rows={posts} onView={handleViewPost} />
          {posts.length < sources.postsTotal ? (
            <p className="text-xs text-muted-foreground mt-2">
              仅显示前 {posts.length} / {sources.postsTotal} 条
            </p>
          ) : null}
        </TabsContent>
        <TabsContent value="research" className="mt-4">
          <GroupTable rows={researchRows} onView={handleViewResearch} />
          {researchRows.length < sources.researchTotal ? (
            <p className="text-xs text-muted-foreground mt-2">
              仅显示前 {researchRows.length} / {sources.researchTotal} 条
            </p>
          ) : null}
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
