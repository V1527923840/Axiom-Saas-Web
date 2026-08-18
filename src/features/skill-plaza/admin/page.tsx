/**
 * SkillAdminPage — /skills/admin 路由 (super_admin only)。
 *
 * 列表 + 搜索 + 上传 + 详情。Service-side RBAC 走 MenuAccessGuard,
 * 菜单里这个 code='skill-plaza-admin' 所以 admin 自动可见,super_admin 全部通过。
 */
import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Search, Wrench, ExternalLink } from "lucide-react"
import { listSkills } from "../services/skill-api"
import { SkillUploadDialog } from "../components/skill-upload-dialog"

export default function SkillAdminPage() {
  const [search, setSearch] = useState("")
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["admin-skills"],
    queryFn: () =>
      listSkills({
        page: 1,
        pageSize: 50,
        sortBy: "updatedAt",
        sortOrder: "DESC",
      }),
  })

  const items = data?.items ?? []
  const filtered = items.filter(
    (s) =>
      !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.code.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="container mx-auto space-y-6 py-6">
      <div className="flex items-center gap-3">
        <Wrench className="h-7 w-7 text-fuchsia-500" />
        <div className="flex-1">
          <h1 className="text-2xl font-semibold">Skill 管理</h1>
          <p className="text-sm text-muted-foreground">
            上传 / 编辑 / 发布 Skill
          </p>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="搜索 code / name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <SkillUploadDialog onSuccess={() => refetch()} />
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>
            加载失败:{(error as Error).message}
          </AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>name</TableHead>
                <TableHead>code</TableHead>
                <TableHead>category</TableHead>
                <TableHead>status</TableHead>
                <TableHead>tools</TableHead>
                <TableHead>updated</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                    {search ? "没有匹配" : "尚未上传 skill"}
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell className="font-mono text-xs">{s.code}</TableCell>
                  <TableCell>
                    {s.category ? (
                      <Badge variant="outline">{s.category}</Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        s.status === "published"
                          ? "default"
                          : s.status === "draft"
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {s.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{s.tools.length}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(s.updatedAt).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" asChild>
                      <a
                        href={`/skills/${encodeURIComponent(s.id)}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}