"use client"

import React, { useState } from "react"
import { ChevronRight, ChevronDown } from "lucide-react"
import type { MenuTreeNode } from "../types"
import type { Menu } from "../types"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"

interface MenuTreeTableProps {
  data: MenuTreeNode[]
  loading: boolean
  onView: (menu: Menu) => void
  onEdit: (menu: Menu) => void
  onDelete: (menu: Menu) => void
}

export function MenuTreeTable({ data, loading, onView, onEdit, onDelete }: MenuTreeTableProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedIds)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedIds(newExpanded)
  }

  const renderRow = (menu: MenuTreeNode, depth: number = 0): React.ReactNode => {
    const hasChildren = menu.children && menu.children.length > 0
    const isExpanded = expandedIds.has(menu.id)

    return (
      <React.Fragment key={menu.id}>
        <TableRow className="hover:bg-muted/50">
          <TableCell>
            <div className="flex items-center" style={{ paddingLeft: `${depth * 24}px` }}>
              {hasChildren ? (
                <button
                  onClick={() => toggleExpand(menu.id)}
                  className="mr-2 rounded-md p-0.5 hover:bg-muted transition-colors"
                  aria-label={isExpanded ? "收起" : "展开"}
                >
                  {isExpanded ? (
                    <ChevronDown className="size-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="size-4 text-muted-foreground" />
                  )}
                </button>
              ) : (
                <span className="w-6" />
              )}
              <span className={depth > 0 ? "text-muted-foreground" : "font-medium"}>
                {menu.name}
              </span>
            </div>
          </TableCell>
          <TableCell>
            <span className="font-mono text-xs">{menu.code}</span>
          </TableCell>
          <TableCell>
            <span className="text-muted-foreground">{menu.icon || "-"}</span>
          </TableCell>
          <TableCell>
            <span className="text-muted-foreground text-sm">{menu.path || "-"}</span>
          </TableCell>
          <TableCell>
            <span className="font-mono text-sm">{menu.sortOrder}</span>
          </TableCell>
          <TableCell>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                menu.status === "active"
                  ? "bg-green-500/20 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-red-500/20 text-red-700 dark:bg-red-900/30 dark:text-red-400"
              }`}
            >
              {menu.status === "active" ? "启用" : "禁用"}
            </span>
          </TableCell>
          <TableCell>
            <div className="flex items-center gap-1">
              <button
                onClick={() => onView(menu)}
                className="rounded-md p-1.5 hover:bg-muted transition-colors"
                aria-label="查看详情"
              >
                <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </button>
              <button
                onClick={() => onEdit(menu)}
                className="rounded-md p-1.5 hover:bg-muted transition-colors"
                aria-label="编辑"
              >
                <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                onClick={() => onDelete(menu)}
                className="rounded-md p-1.5 hover:bg-muted text-red-600 transition-colors"
                aria-label="删除"
              >
                <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </TableCell>
        </TableRow>
        {hasChildren && isExpanded && menu.children!.map(child => renderRow(child, depth + 1))}
      </React.Fragment>
    )
  }

  if (loading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>菜单名称</TableHead>
              <TableHead>菜单编码</TableHead>
              <TableHead>图标</TableHead>
              <TableHead>路径</TableHead>
              <TableHead>排序</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                <TableCell><Skeleton className="h-6 w-40" /></TableCell>
                <TableCell><Skeleton className="h-6 w-12" /></TableCell>
                <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                <TableCell><Skeleton className="h-6 w-24" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>菜单名称</TableHead>
              <TableHead>菜单编码</TableHead>
              <TableHead>图标</TableHead>
              <TableHead>路径</TableHead>
              <TableHead>排序</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                暂无数据
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>菜单名称</TableHead>
            <TableHead>菜单编码</TableHead>
            <TableHead>图标</TableHead>
            <TableHead>路径</TableHead>
            <TableHead>排序</TableHead>
            <TableHead>状态</TableHead>
            <TableHead>操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map(menu => renderRow(menu))}
        </TableBody>
      </Table>
    </div>
  )
}