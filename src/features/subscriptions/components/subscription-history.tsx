"use client"

import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/data-table"
import type { Subscription } from "../types"

interface SubscriptionHistoryProps {
  subscriptions: Subscription[]
  loading?: boolean
  pagination?: {
    page: number
    pageSize: number
    total: number
    onPageChange: (page: number) => void
    onPageSizeChange: (pageSize: number) => void
  }
}

const columns: import("@tanstack/react-table").ColumnDef<Subscription>[] = [
  {
    accessorKey: "id",
    header: "订单号",
    cell: ({ row }) => (
      <span className="font-mono text-xs">{row.getValue("id")}</span>
    ),
  },
  {
    accessorKey: "planName",
    header: "套餐",
    cell: ({ row }) => (
      <span className="font-medium">{row.getValue("planName")}</span>
    ),
  },
  {
    accessorKey: "price",
    header: "价格",
    cell: ({ row }) => {
      const sub = row.original as Subscription
      return (
        <span className="font-mono">
          {sub.price === 0 ? "免费" : `¥${sub.price.toFixed(2)}`}
        </span>
      )
    },
  },
  {
    accessorKey: "status",
    header: "状态",
    cell: ({ row }) => {
      const sub = row.original as Subscription
      const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
        active: { label: "生效中", variant: "default" },
        expired: { label: "已过期", variant: "secondary" },
        cancelled: { label: "已取消", variant: "destructive" },
        pending: { label: "待处理", variant: "outline" },
        trial: { label: "试用中", variant: "outline" },
      }
      const config = statusConfig[sub.status] || { label: sub.status, variant: "secondary" as const }
      return <Badge variant={config.variant}>{config.label}</Badge>
    },
  },
  {
    accessorKey: "startedAt",
    header: "开始时间",
    cell: ({ row }) => {
      const sub = row.original as Subscription
      const date = new Date(sub.startedAt)
      return (
        <span className="text-muted-foreground text-sm">
          {date.toLocaleDateString("zh-CN")}
        </span>
      )
    },
  },
  {
    accessorKey: "expiredAt",
    header: "到期时间",
    cell: ({ row }) => {
      const sub = row.original as Subscription
      const date = new Date(sub.expiredAt)
      return (
        <span className="text-muted-foreground text-sm">
          {date.toLocaleDateString("zh-CN")}
        </span>
      )
    },
  },
  {
    accessorKey: "autoRenew",
    header: "自动续费",
    cell: ({ row }) => {
      const sub = row.original as Subscription
      return (
        <Badge variant={sub.autoRenew ? "default" : "outline"}>
          {sub.autoRenew ? "是" : "否"}
        </Badge>
      )
    },
  },
]

export function SubscriptionHistory({
  subscriptions,
  loading,
  pagination,
}: SubscriptionHistoryProps) {
  return (
    <DataTable
      columns={columns}
      data={subscriptions}
      loading={loading}
      pagination={pagination}
    />
  )
}