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
import type { Plan } from "../types"

interface PlansColumnsProps {
  onView: (plan: Plan) => void
  onEdit: (plan: Plan) => void
  onDelete: (plan: Plan) => void
}

export function plansColumns({ onView, onEdit, onDelete }: PlansColumnsProps): ColumnDef<Plan>[] {
  return [
    {
      accessorKey: "name",
      header: "套餐名称",
      cell: ({ row }) => {
        const plan = row.original as Plan
        return (
          <div className="flex flex-col gap-1">
            <span className="font-medium">{plan.name}</span>
            {plan.description && (
              <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                {plan.description}
              </span>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: "tier",
      header: "等级",
      cell: ({ row }) => {
        const plan = row.original as Plan
        const tierLabels: Record<string, string> = {
          Lv0: "免费",
          Lv1: "基础",
          Lv2: "进阶",
          Lv3: "高级",
        }
        const tierColors: Record<string, string> = {
          Lv0: "bg-gray-100 text-gray-800",
          Lv1: "bg-blue-100 text-blue-800",
          Lv2: "bg-purple-100 text-purple-800",
          Lv3: "bg-amber-100 text-amber-800",
        }
        return <Badge className={tierColors[plan.tier] || "bg-gray-100"}>{tierLabels[plan.tier] || plan.tier}</Badge>
      },
    },
    {
      accessorKey: "cycle",
      header: "周期",
      cell: ({ row }) => {
        const plan = row.original as Plan
        const cycleLabels: Record<string, string> = {
          monthly: "月付",
          quarterly: "季付",
          yearly: "年付",
          lifetime: "终身",
        }
        return <span className="text-muted-foreground">{cycleLabels[plan.cycle] || plan.cycle}</span>
      },
    },
    {
      accessorKey: "pointsQuota",
      header: "积分额度",
      cell: ({ row }) => {
        const plan = row.original as Plan
        return (
          <span className="font-mono">{plan.pointsQuota.toLocaleString()}</span>
        )
      },
    },
    {
      accessorKey: "chatQuota",
      header: "聊天次数",
      cell: ({ row }) => {
        const plan = row.original as Plan
        return (
          <span className="font-mono">{plan.chatQuota.toLocaleString()}</span>
        )
      },
    },
    {
      accessorKey: "price",
      header: "价格",
      cell: ({ row }) => {
        const plan = row.original as Plan
        if (plan.price === 0) {
          return <Badge variant="outline">免费</Badge>
        }
        return (
          <span className="font-medium">
            ¥{plan.price.toFixed(2)}
          </span>
        )
      },
    },
    {
      accessorKey: "status",
      header: "状态",
      cell: ({ row }) => {
        const plan = row.original as Plan
        const statusColors: Record<string, string> = {
          active: "bg-green-100 text-green-800",
          inactive: "bg-gray-100 text-gray-800",
          deprecated: "bg-red-100 text-red-800",
        }
        return (
          <Badge className={statusColors[plan.status] || "bg-gray-100"}>
            {plan.status === "active" ? "启用" : plan.status === "inactive" ? "禁用" : "废弃"}
          </Badge>
        )
      },
    },
    {
      id: "actions",
      header: "操作",
      cell: ({ row }) => {
        const plan = row.original as Plan
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
              <DropdownMenuItem onClick={() => onView(plan)}>
                <Eye className="mr-2 h-4 w-4" />
                查看详情
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(plan)}>
                <Edit className="mr-2 h-4 w-4" />
                编辑
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onDelete(plan)} className="text-red-600">
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