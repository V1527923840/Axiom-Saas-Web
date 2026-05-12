"use client"

import { type ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, Edit, Trash2, Eye } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { User } from "../types"

interface UsersColumnsProps {
  onView: (user: User) => void
  onEdit: (user: User) => void
  onDelete: (user: User) => void
}

export function usersColumns({ onView, onEdit, onDelete }: UsersColumnsProps): ColumnDef<User>[] {
  return [
    {
      accessorKey: "id",
      header: "ID",
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.getValue("id")}</span>
      ),
    },
    {
      accessorKey: "name",
      header: "昵称",
      cell: ({ row }) => {
        const user = row.original as User
        return (
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
              {user.avatar || user.name.substring(0, 2)}
            </div>
            <span className="font-medium">{user.name}</span>
          </div>
        )
      },
    },
    {
      accessorKey: "email",
      header: "邮箱",
      cell: ({ row }) => {
        const user = row.original as User
        return (
          <span className="text-muted-foreground">{user.email}</span>
        )
      },
    },
    {
      accessorKey: "role",
      header: "角色",
      cell: ({ row }) => {
        const user = row.original as User
        const variant = user.role === "super_admin" ? "destructive" : user.role === "admin" ? "default" : "secondary"
        return <Badge variant={variant as "default" | "destructive" | "secondary" | "outline"}>{user.role}</Badge>
      },
    },
    {
      accessorKey: "tier",
      header: "套餐",
      cell: ({ row }) => {
        const user = row.original as User
        const tierColors: Record<string, string> = {
          free: "bg-gray-100 text-gray-800",
          basic: "bg-blue-100 text-blue-800",
          premium: "bg-purple-100 text-purple-800",
          enterprise: "bg-amber-100 text-amber-800",
        }
        return (
          <Badge className={tierColors[user.tier] || "bg-gray-100"}>{user.tier}</Badge>
        )
      },
    },
    {
      accessorKey: "status",
      header: "状态",
      cell: ({ row }) => {
        const user = row.original as User
        const statusColors: Record<string, string> = {
          active: "bg-green-100 text-green-800",
          inactive: "bg-gray-100 text-gray-800",
          suspended: "bg-red-100 text-red-800",
          pending: "bg-yellow-100 text-yellow-800",
        }
        return (
          <Badge className={statusColors[user.status] || "bg-gray-100"}>
            {user.status}
          </Badge>
        )
      },
    },
    {
      accessorKey: "registeredAt",
      header: "注册时间",
      cell: ({ row }) => {
        const user = row.original as User
        const date = new Date(user.registeredAt)
        return (
          <span className="text-muted-foreground text-sm">
            {date.toLocaleDateString("zh-CN")}
          </span>
        )
      },
    },
    {
      id: "actions",
      header: "操作",
      cell: ({ row }) => {
        const user = row.original as User
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0 cursor-pointer">
                <span className="sr-only">打开菜单</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>操作</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onView(user)}>
                <Eye className="mr-2 h-4 w-4" />
                查看详情
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(user)}>
                <Edit className="mr-2 h-4 w-4" />
                编辑
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onDelete(user)} className="text-red-600">
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