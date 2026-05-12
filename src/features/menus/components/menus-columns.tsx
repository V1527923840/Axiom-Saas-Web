import type { ColumnDef } from "@tanstack/react-table"
import { Eye, Pencil, Trash2 } from "lucide-react"
import type { Menu } from "../types"

interface MenusColumnsProps {
  onView: (menu: Menu) => void
  onEdit: (menu: Menu) => void
  onDelete: (menu: Menu) => void
}

export function menusColumns({ onView, onEdit, onDelete }: MenusColumnsProps): ColumnDef<Menu>[] {
  return [
    {
      accessorKey: "name",
      header: "菜单名称",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.name}</span>
      ),
    },
    {
      accessorKey: "code",
      header: "菜单编码",
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.code}</span>
      ),
    },
    {
      accessorKey: "icon",
      header: "图标",
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.icon || "-"}</span>
      ),
    },
    {
      accessorKey: "path",
      header: "路径",
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">{row.original.path || "-"}</span>
      ),
    },
    {
      accessorKey: "sortOrder",
      header: "排序",
      cell: ({ row }) => (
        <span className="font-mono text-sm">{row.original.sortOrder}</span>
      ),
    },
    {
      accessorKey: "status",
      header: "状态",
      cell: ({ row }) => {
        const isActive = row.original.status === 'active'
        return (
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
              isActive
                ? "bg-green-500/20 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : "bg-red-500/20 text-red-700 dark:bg-red-900/30 dark:text-red-400"
            }`}
          >
            {isActive ? "启用" : "禁用"}
          </span>
        )
      },
    },
    {
      id: "actions",
      header: "操作",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => onView(row.original)}
            className="rounded-md p-1.5 hover:bg-muted transition-colors"
            aria-label="查看详情"
          >
            <Eye className="size-4" />
          </button>
          <button
            onClick={() => onEdit(row.original)}
            className="rounded-md p-1.5 hover:bg-muted transition-colors"
            aria-label="编辑"
          >
            <Pencil className="size-4" />
          </button>
          <button
            onClick={() => onDelete(row.original)}
            className="rounded-md p-1.5 hover:bg-muted text-red-600 transition-colors"
            aria-label="删除"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      ),
    },
  ]
}