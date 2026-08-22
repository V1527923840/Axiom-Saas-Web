/**
 * Skill Admin — DataTable 列定义。
 *
 * 与 scrape-log/components/columns 风格一致:ColumnDef<T>[] + ArrowUpDown 排序按钮。
 */
"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { Archive, ArrowUpDown, Eye, PencilLine, RotateCcw, Wrench } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { format } from "date-fns"
import { zhCN } from "date-fns/locale"
import type { Skill } from "@/types/skill"

const statusConfig = {
  draft: { label: "草稿", variant: "secondary" as const },
  published: { label: "已发布", variant: "default" as const },
  archived: { label: "已归档", variant: "outline" as const },
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-"
  try {
    return format(new Date(dateStr), "yyyy-MM-dd HH:mm", { locale: zhCN })
  } catch {
    return dateStr
  }
}

export interface SkillActionsMeta {
  currentUserId: number | null
  isSuperAdmin: boolean
  isAdmin: boolean
  /**
   * 当前用户的 user_skill_binding map。用于行内 启用/停用 toggle。
   * Map[skillId] = true 表示当前 admin 已启用该 skill。
   */
  enabledMap: Record<string, true>
  /** 当前是否有任何 enable/disable mutation 在进行(共享 loading) */
  isTogglingBinding: boolean
  /** 触发 enable / disable mutation(乐观更新由 hook 处理) */
  onToggleBinding: (skill: Skill) => void
  onDetail: (skill: Skill) => void
  onUpdate: (skill: Skill) => void
  onArchive: (skill: Skill) => void
  onRestore: (skill: Skill) => void
}

export const columns = (meta: SkillActionsMeta): ColumnDef<Skill>[] => [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="cursor-pointer p-0 hover:bg-transparent hover:text-foreground"
      >
        name
        <ArrowUpDown className="ml-2 size-4" />
      </Button>
    ),
    cell: ({ row }) => <span className="font-medium">{row.getValue("name")}</span>,
  },
  {
    accessorKey: "code",
    header: "code",
    cell: ({ row }) => (
      <span className="font-mono text-xs">{row.getValue("code")}</span>
    ),
  },
  {
    accessorKey: "category",
    header: "category",
    cell: ({ row }) => {
      const v = row.getValue("category") as string | null
      return v ? <Badge variant="outline">{v}</Badge> : <span className="text-muted-foreground">—</span>
    },
  },
  {
    accessorKey: "status",
    header: "状态",
    cell: ({ row }) => {
      const v = row.getValue("status") as keyof typeof statusConfig
      const cfg = statusConfig[v]
      return <Badge variant={cfg.variant}>{cfg.label}</Badge>
    },
  },
  {
    accessorKey: "tools",
    header: "tools",
    cell: ({ row }) => {
      const tools = (row.getValue("tools") as unknown[]) ?? []
      return (
        <span className="flex items-center gap-1 text-muted-foreground">
          <Wrench className="size-3" />
          {Array.isArray(tools) ? tools.length : 0}
        </span>
      )
    },
  },
  {
    accessorKey: "updatedAt",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="cursor-pointer p-0 hover:bg-transparent hover:text-foreground"
      >
        更新时间
        <ArrowUpDown className="ml-2 size-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground">
        {formatDate(row.getValue("updatedAt") as string | null)}
      </span>
    ),
  },
  {
    id: "force-archive",
    header: "停用/启用【强制】",
    cell: ({ row }) => {
      const skill = row.original
      const canManage = meta.isSuperAdmin || meta.isAdmin
      const isArchived = skill.status === "archived"
      if (!canManage) {
        return (
          <span className="text-xs text-muted-foreground" title="无管理权限">
            —
          </span>
        )
      }
      return (
        <div
          className="flex items-center gap-1.5"
          title={
            isArchived ? `恢复 ${skill.name}` : `强制停用 ${skill.name}`
          }
        >
          <Switch
            checked={!isArchived}
            onCheckedChange={(checked) => {
              if (checked) meta.onRestore(skill)
              else meta.onArchive(skill)
            }}
            aria-label={
              isArchived
                ? `恢复 ${skill.name}`
                : `强制停用 ${skill.name}`
            }
          />
          <span className="text-xs text-muted-foreground min-w-4">
            {isArchived ? (
              <RotateCcw className="inline size-3" />
            ) : (
              <Archive className="inline size-3" />
            )}
          </span>
        </div>
      )
    },
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => {
      const skill = row.original
      const canUpdate =
        meta.isSuperAdmin || skill.uploaderId === meta.currentUserId
      return (
        <div className="flex items-center justify-end gap-2">
          {/* 详情 */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => meta.onDetail(skill)}
            aria-label={`查看 ${skill.name} 详情`}
            className="cursor-pointer"
          >
            <Eye className="size-4" />
          </Button>

          {/* 更新 — 仅 user_self 作者本人 或 super_admin */}
          {canUpdate && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => meta.onUpdate(skill)}
              aria-label={`更新 ${skill.name}`}
              className="cursor-pointer"
            >
              <PencilLine className="size-4" />
            </Button>
          )}

          {/* 用户级 启用/停用 — 当前 admin 对此 skill 的 binding。
              与「强制停用」正交:archived 的 skill 仍可以「启用」
              (只是 Vibe 端看不到);启用的 skill 可以被强制停用
              (binding 行保留,Vibe 按 status gate 拒绝)。 */}
          <div
            className="flex items-center gap-1.5"
            title={
              meta.enabledMap[skill.id]
                ? `停用 ${skill.name}(个人收藏)`
                : `启用 ${skill.name}(个人收藏)`
            }
          >
            <Switch
              checked={!!meta.enabledMap[skill.id]}
              disabled={meta.isTogglingBinding}
              onCheckedChange={() => meta.onToggleBinding(skill)}
              aria-label={
                meta.enabledMap[skill.id]
                  ? `停用 ${skill.name}`
                  : `启用 ${skill.name}`
              }
            />
          </div>
        </div>
      )
    },
  },
]