import { useEffect, useRef, useState } from "react"
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
import type { ContentItemMeta, SourcesResponse } from "@/services/daily-summary"

function CopyButton({ id }: { id: string }) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(id)
          setCopied(true)
          if (timer.current) clearTimeout(timer.current)
          timer.current = setTimeout(() => setCopied(false), 1200)
        } catch {
          /* clipboard unavailable (insecure origin / denied) — stay silent */
        }
      }}
    >
      {copied ? "已复制" : "Copy ID"}
    </Button>
  )
}

function GroupTable({ title, rows }: { title: string; rows: ContentItemMeta[] }) {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium">
        {title} ({rows.length})
      </h4>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">无</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Publish</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.title}</TableCell>
                <TableCell>{r.categoryCode}</TableCell>
                <TableCell>{r.publishDate?.slice(0, 10) ?? "—"}</TableCell>
                <TableCell>
                  <CopyButton id={r.id} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
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

  return (
    <div className="space-y-6">
      <GroupTable title="Posts" rows={sources.posts ?? []} />
      <GroupTable title="Research" rows={sources.research ?? []} />
    </div>
  )
}
