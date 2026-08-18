/**
 * Skill Admin — DataTable 列定义。
 *
 * 与 scrape-log/components/columns 风格一致:ColumnDef<T>[] + ArrowUpDown 排序按钮。
 */
"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, ExternalLink, Wrench } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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

export const columns: ColumnDef<Skill>[] = [
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
    id: "actions",
    header: "",
    cell: ({ row }) => {
      const id = row.original.id
      return (
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="cursor-pointer"
        >
          <a
            href={`/skills/${encodeURIComponent(id)}`}
            target="_blank"
            rel="noreferrer"
          >
            <ExternalLink className="size-4" />
          </a>
        </Button>
      )
    },
  },
]