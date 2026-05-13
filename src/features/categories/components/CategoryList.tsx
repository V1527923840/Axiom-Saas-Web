"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MoreHorizontal, Edit, Trash2, FolderPlus } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { ContentCategory, CategoryLayer } from "../types"

interface CategoryListProps {
  categories: ContentCategory[]
  onEdit: (category: ContentCategory) => void
  onDelete: (category: ContentCategory) => void
  onAddChild: (category: ContentCategory) => void
}

const layerLabels: Record<CategoryLayer, string> = {
  carrier: "信息载体",
  info_type: "信息类型",
  financial: "金融维度",
}

const layerColors: Record<CategoryLayer, string> = {
  carrier: "bg-blue-100 text-blue-800",
  info_type: "bg-purple-100 text-purple-800",
  financial: "bg-green-100 text-green-800",
}

export function categoryColumns({
  onEdit,
  onDelete,
  onAddChild,
}: CategoryListProps): ColumnDef<ContentCategory>[] {
  return [
    {
      accessorKey: "name",
      header: "分类名称",
      cell: ({ row }) => {
        const category = row.original as ContentCategory
        return (
          <div className="flex flex-col gap-1">
            <span className="font-medium">{category.name}</span>
            {category.description && (
              <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                {category.description}
              </span>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: "code",
      header: "分类代码",
      cell: ({ row }) => {
        const category = row.original as ContentCategory
        return (
          <code className="text-sm bg-muted px-2 py-0.5 rounded">{category.code}</code>
        )
      },
    },
    {
      accessorKey: "layer",
      header: "层级",
      cell: ({ row }) => {
        const category = row.original as ContentCategory
        return (
          <Badge className={layerColors[category.layer] || "bg-gray-100"}>
            {layerLabels[category.layer] || category.layer}
          </Badge>
        )
      },
    },
    {
      accessorKey: "parentCode",
      header: "上级分类",
      cell: ({ row }) => {
        const category = row.original as ContentCategory
        return (
          <span className="text-muted-foreground">
            {category.parentCode || "-"}
          </span>
        )
      },
    },
    {
      accessorKey: "sortOrder",
      header: "排序",
      cell: ({ row }) => {
        const category = row.original as ContentCategory
        return <span className="font-mono">{category.sortOrder}</span>
      },
    },
    {
      accessorKey: "isActive",
      header: "状态",
      cell: ({ row }) => {
        const category = row.original as ContentCategory
        return (
          <Badge variant={category.isActive ? "default" : "secondary"}>
            {category.isActive ? "启用" : "禁用"}
          </Badge>
        )
      },
    },
    {
      id: "actions",
      header: "操作",
      cell: ({ row }) => {
        const category = row.original as ContentCategory
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0 cursor-pointer">
                <span className="sr-only">打开菜单</span>
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>操作</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onEdit(category)}>
                <Edit className="mr-2 h-4 w-4" />
                编辑
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAddChild(category)}>
                <FolderPlus className="mr-2 h-4 w-4" />
                添加子分类
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(category)}
                className="text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                删除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]
}

// Simple list component for table display
interface CategoryListDisplayProps {
  categories: ContentCategory[]
  loading: boolean
}

export function CategoryListDisplay({ categories, loading }: CategoryListDisplayProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (categories.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        暂无分类数据
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="py-3 px-4 text-left font-medium">分类名称</th>
            <th className="py-3 px-4 text-left font-medium">分类代码</th>
            <th className="py-3 px-4 text-left font-medium">层级</th>
            <th className="py-3 px-4 text-left font-medium">上级分类</th>
            <th className="py-3 px-4 text-left font-medium">排序</th>
            <th className="py-3 px-4 text-left font-medium">状态</th>
            <th className="py-3 px-4 text-left font-medium">操作</th>
          </tr>
        </thead>
        <tbody>
          {categories.map((category) => (
            <tr key={category.id} className="border-b hover:bg-muted/30">
              <td className="py-3 px-4">
                <div className="flex flex-col gap-1">
                  <span className="font-medium">{category.name}</span>
                  {category.description && (
                    <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                      {category.description}
                    </span>
                  )}
                </div>
              </td>
              <td className="py-3 px-4">
                <code className="text-sm bg-muted px-2 py-0.5 rounded">{category.code}</code>
              </td>
              <td className="py-3 px-4">
                <Badge className={layerColors[category.layer] || "bg-gray-100"}>
                  {layerLabels[category.layer] || category.layer}
                </Badge>
              </td>
              <td className="py-3 px-4 text-muted-foreground">
                {category.parentCode || "-"}
              </td>
              <td className="py-3 px-4 font-mono">{category.sortOrder}</td>
              <td className="py-3 px-4">
                <Badge variant={category.isActive ? "default" : "secondary"}>
                  {category.isActive ? "启用" : "禁用"}
                </Badge>
              </td>
              <td className="py-3 px-4">
                {/* Actions will be handled externally via onEdit/onDelete callbacks */}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}