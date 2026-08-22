/**
 * Skill Admin Page — /skills/admin 路由 (super_admin)。
 *
 * 与 scrape-log/versions 等管理类页面一致:
 *   - BaseLayout + filter bar (search + status + refresh)
 *   - DataTable + columns.tsx
 *   - EmptyState 三态
 */
"use client"

import { useState, useMemo } from "react"
import { BaseLayout } from "@/components/layouts/base-layout"
import { DataTable } from "@/components/data-table"
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
import { columns } from "./columns"
import { EmptyState } from "../components/empty-state"
import { SkillUploadDialog } from "../components/skill-upload-dialog"
import { SkillDetailDrawer } from "../components/skill-detail-drawer"
import { SkillArchiveConfirmDialog } from "../components/skill-archive-confirm-dialog"
import { SkillRestoreConfirmDialog } from "../components/skill-restore-confirm-dialog"
import { listSkills } from "../services/skill-api"
import { useDataTable } from "@/components/data-table"
import { useAuth } from "@/contexts/auth-context"
import type { FetchData } from "@/components/data-table"
import type { Skill } from "@/types/skill"

const PAGE_SIZE = 20

export default function SkillAdminPage() {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  // 当前用户身份 — 用来决定 columns 的 menu 是否显示「更新」「停用/恢复」
  const auth = useAuth()
  const currentUserId = typeof auth.user?.id === "number" ? auth.user.id : null
  // auth.user.roles 是 Role[] (每个 Role { id, name }),不是 string[]
  // Role.name 在本仓库沿用 NestJS 端 seed 的 "admin" / "super_admin" 字面量
  const roleNames = (auth.user?.roles ?? []).map((r) => r?.name).filter(Boolean) as string[]
  const isSuperAdmin = roleNames.includes("super_admin")
  const isAdmin = isSuperAdmin || roleNames.includes("admin")

  // 各弹窗/drawer 的「目标 skill」
  const [detailSkill, setDetailSkill] = useState<Skill | null>(null)
  const [updateSkill, setUpdateSkill] = useState<Skill | null>(null)
  const [archiveSkillState, setArchiveSkill] = useState<Skill | null>(null)
  const [restoreSkillState, setRestoreSkill] = useState<Skill | null>(null)

  // 用 useDataTable 自带的 server fetch。
  // data 表 schema 形如 { items, total }, 但 DataTable 期待 data + total。
  const fetchData: FetchData<Skill> = async ({
    pagination,
    sorting,
    globalFilter,
  }) => {
    const sortBy = (sorting[0]?.id ?? "updatedAt") as
      | "name"
      | "updatedAt"
      | "createdAt"
    const sortOrder = sorting[0]?.desc ? "DESC" : "ASC"
    const result = await listSkills({
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
      sortBy,
      sortOrder,
      status:
        statusFilter === "all"
          ? undefined
          : (statusFilter as "draft" | "published" | "archived"),
      ...(globalFilter ? {} : { search: undefined }),
    })
    return { data: result.items, total: result.total }
  }

  // 过滤栏 status 切换时,reset 到第一页
  const dataKey = useMemo(
    () => [statusFilter] as const,
    [statusFilter],
  )

  return (
    <BaseLayout title="Skill 管理" description="上传 / 编辑 / 发布 Skill,管理 Skill 知识资产">
      <div className="px-4 lg:px-6 space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap items-end gap-4 p-4 bg-muted/30 rounded-lg">
          <div className="space-y-1 min-w-[200px] flex-1">
            <Label className="text-xs">搜索</Label>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="按 code / name 搜索"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">状态</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] cursor-pointer">
                <SelectValue placeholder="全部状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="draft">草稿</SelectItem>
                <SelectItem value="published">已发布</SelectItem>
                <SelectItem value="archived">已归档</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" className="cursor-pointer">
            <RefreshCw className="size-4 mr-2" />
            刷新
          </Button>
          <SkillUploadDialog
            trigger={
              <Button className="cursor-pointer">
                <UploadCloud className="size-4 mr-2" />
                上传 Skill
              </Button>
            }
          />
        </div>

        {/* Data Table */}
        {/*
          DataTable 期望 data + pagination 形态 (本地状态)。
          这里直接用 fetchData,内部自管 loading/error/empty。
          status 切换通过 queryKey 重 mount 实现。
        */}
        <DataTableWrapper
          key={dataKey.join("-")}
          fetchData={fetchData}
          pageSize={PAGE_SIZE}
          statusFilter={statusFilter}
          meta={{
            currentUserId,
              isSuperAdmin,
              isAdmin,
              onDetail: setDetailSkill,
              onUpdate: setUpdateSkill,
              onArchive: setArchiveSkill,
              onRestore: setRestoreSkill,
            }}
        />

        {/* Detail Drawer */}
        {detailSkill && (
          <SkillDetailDrawer
            skill={detailSkill}
            open={!!detailSkill}
            onOpenChange={(o) => !o && setDetailSkill(null)}
          />
        )}

        {/* Update Dialog (mode='update') */}
        {updateSkill && (
          <SkillUploadDialog
            mode="update"
            skill={updateSkill}
            open={!!updateSkill}
            onOpenChange={(o) => !o && setUpdateSkill(null)}
            onSuccess={() => {
              // detail drawer 会通过自己的 query refetch;此处无需全局刷新
            }}
          />
        )}

        {/* Archive Confirm */}
        {archiveSkillState && (
          <SkillArchiveConfirmDialog
            skill={archiveSkillState}
            open={!!archiveSkillState}
            onOpenChange={(o) => !o && setArchiveSkill(null)}
            onSuccess={() => setArchiveSkill(null)}
          />
        )}

        {/* Restore Confirm */}
        {restoreSkillState && (
          <SkillRestoreConfirmDialog
            skill={restoreSkillState}
            open={!!restoreSkillState}
            onOpenChange={(o) => !o && setRestoreSkill(null)}
            onSuccess={() => setRestoreSkill(null)}
          />
        )}
      </div>
    </BaseLayout>
  )
}

/**
 * DataTableWrapper — 单文件组件,把 useDataTable + DataTable 打包,
 * 让 statusFilter 变化时通过 key 重 mount 重置所有状态。
 */
function DataTableWrapper({
  fetchData,
  pageSize,
  statusFilter,
  meta,
}: {
  fetchData: FetchData<Skill>
  pageSize: number
  statusFilter: string
  meta: {
    currentUserId: number | null
    isSuperAdmin: boolean
    isAdmin: boolean
    onDetail: (skill: Skill) => void
    onUpdate: (skill: Skill) => void
    onArchive: (skill: Skill) => void
    onRestore: (skill: Skill) => void
  }
}) {
  void statusFilter
  // Skill 类型没有 index signature,这里 cast 成 Record<string, unknown> 满足 useDataTable 约束
  const { data, total, isLoading, error, pagination, setPagination } =
    useDataTable<Skill & Record<string, unknown>>({
      fetchData: fetchData as FetchData<Skill & Record<string, unknown>>,
      pageSize,
    })
  const typedData = data as Skill[]

  return (
    <>
      <DataTable
        columns={columns(meta)}
        data={typedData}
        total={total}
        loading={isLoading}
        error={error ? (error as Error).message : null}
        pagination={{
          page: pagination.pageIndex + 1,
          pageSize: pagination.pageSize,
          total,
          onPageChange: (p) => setPagination((prev) => ({ ...prev, pageIndex: p - 1 })),
          onPageSizeChange: (s) => setPagination((prev) => ({ ...prev, pageSize: s })),
        }}
        showToolbar={false}
        showSearch={false}
      />
      {!isLoading && typedData.length === 0 && (
        <EmptyState
          emptyHint={
            statusFilter === "all" ? "尚未上传 skill" : "该状态下没有 skill"
          }
        />
      )}
    </>
  )
}