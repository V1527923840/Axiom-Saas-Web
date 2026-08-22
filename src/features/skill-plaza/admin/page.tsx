/**
 * Skill Admin Page — /skills/admin 路由 (super_admin)。
 *
 * 与 scrape-log/versions 等管理类页面一致:
 *   - BaseLayout + filter bar (search + status + refresh)
 *   - DataTable + columns.tsx
 *   - EmptyState 三态
 */
"use client"

import { useState, useMemo, useCallback } from "react"
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
import { columns, type SkillActionsMeta } from "./columns"
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
  // auth.user.roles 是 Role[] — 每项 { id, name, code, ... }。
// role.name 是中文(例如「超级管理员」),role.code 是英文字面量
// (例如 'super_admin' / 'admin')。用 code 做权限判断,跨语言稳定。
// 注: 生成的 api.d.ts schema 把 Role 类型裁剪成 { id, name },但运行时 API
// 实际返回 code 字段。cast as any 跳过 TS 限制。
  const roleCodes = (auth.user?.roles ?? [])
    .map((r: any) => r?.code)
    .filter(Boolean) as string[]
  const isSuperAdmin = roleCodes.includes("super_admin")
  const isAdmin = isSuperAdmin || roleCodes.includes("admin")

  // 各弹窗/drawer 的「目标 skill」
  const [detailSkill, setDetailSkill] = useState<Skill | null>(null)
  const [updateSkill, setUpdateSkill] = useState<Skill | null>(null)
  const [archiveSkillState, setArchiveSkill] = useState<Skill | null>(null)
  const [restoreSkillState, setRestoreSkill] = useState<Skill | null>(null)

  // 用 useDataTable 自带的 server fetch。
  // data 表 schema 形如 { items, total }, 但 DataTable 期待 data + total。
  //
  // ★ 必须包 useCallback —— 否则这个闭包每次 render 都是新引用,
  // useDataTable.loadData 会因 fetchData 依赖变化而 useEffect 重跑,
  // setData → re-render → 新 fetchData → 死循环(无限调用 listSkills)。
  // 依赖只有 statusFilter:sorting/globalFilter 由 useDataTable 内部 state 管,
  // 不需要在父组件重新订阅。
  const fetchData = useCallback<FetchData<Skill>>(
    async ({ pagination, sorting, globalFilter }) => {
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
    },
    [statusFilter],
  )

  // 把 useDataTable 提升到父组件,以便 archive/restore/update 成功后
  // 直接调用 refresh() 让表格立刻拉新数据,不必等用户手动点「刷新」。
  // (use-skill-lifecycle 的 qc.invalidateQueries 找不到这里的 useState 缓存)
  const {
    data,
    total,
    isLoading,
    error,
    pagination,
    setPagination,
    refresh,
  } = useDataTable<Skill & Record<string, unknown>>({
    fetchData: fetchData as FetchData<Skill & Record<string, unknown>>,
    pageSize: PAGE_SIZE,
  })
  const typedData = data as Skill[]

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
          <Button
            variant="outline"
            className="cursor-pointer"
            onClick={refresh}
          >
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
          data={typedData}
          total={total}
          isLoading={isLoading}
          error={error}
          pagination={pagination}
          setPagination={setPagination}
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
              setUpdateSkill(null)
              // 行内显示新的 contentHash + updatedAt
              refresh()
            }}
          />
        )}

        {/* Archive Confirm */}
        {archiveSkillState && (
          <SkillArchiveConfirmDialog
            skill={archiveSkillState}
            open={!!archiveSkillState}
            onOpenChange={(o) => !o && setArchiveSkill(null)}
            onSuccess={() => {
              setArchiveSkill(null)
              refresh()
            }}
          />
        )}

        {/* Restore Confirm */}
        {restoreSkillState && (
          <SkillRestoreConfirmDialog
            skill={restoreSkillState}
            open={!!restoreSkillState}
            onOpenChange={(o) => !o && setRestoreSkill(null)}
            onSuccess={() => {
              setRestoreSkill(null)
              refresh()
            }}
          />
        )}
      </div>
    </BaseLayout>
  )
}

/**
 * DataTableWrapper — 单文件组件,把 useDataTable 的返回值从父组件透传下来,
 * 让 statusFilter 变化时通过 key 重 mount 重置所有状态。
 *
 * useDataTable 调用本身在父组件 SkillAdminPage 中,以便 dialog onSuccess
 * 能直接调用 refresh() 让表格立刻拉新数据(不依赖 react-query 缓存)。
 */
function DataTableWrapper({
  data,
  total,
  isLoading,
  error,
  pagination,
  setPagination,
  statusFilter,
  meta,
}: {
  data: Skill[]
  total: number
  isLoading: boolean
  error: Error | null
  pagination: { pageIndex: number; pageSize: number }
  setPagination: (
    p:
      | { pageIndex: number; pageSize: number }
      | ((prev: { pageIndex: number; pageSize: number }) => {
          pageIndex: number
          pageSize: number
        }),
  ) => void
  statusFilter: string
  meta: SkillActionsMeta
}) {
  return (
    <>
      <DataTable
        columns={columns(meta)}
        data={data}
        total={total}
        loading={isLoading}
        error={error ? error.message : null}
        pagination={{
          page: pagination.pageIndex + 1,
          pageSize: pagination.pageSize,
          total,
          onPageChange: (p) =>
            setPagination((prev) => ({ ...prev, pageIndex: p - 1 })),
          onPageSizeChange: (s) =>
            setPagination((prev) => ({ ...prev, pageSize: s })),
        }}
        showToolbar={false}
        showSearch={false}
      />
      {!isLoading && data.length === 0 && (
        <EmptyState
          emptyHint={
            statusFilter === "all" ? "尚未上传 skill" : "该状态下没有 skill"
          }
        />
      )}
    </>
  )
}