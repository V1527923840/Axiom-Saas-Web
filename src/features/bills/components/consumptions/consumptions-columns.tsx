import type { ColumnDef } from "@tanstack/react-table"
import { Eye } from "lucide-react"
import type { Consumption } from "../../types"
import { UserCell } from "../shared/user-cell"
import { ConsumptionTypeBadge } from "../shared/bill-status-badge"

interface ConsumptionsColumnsProps {
  onView: (consumption: Consumption) => void
}

export function consumptionsColumns({ onView }: ConsumptionsColumnsProps): ColumnDef<Consumption>[] {
  return [
    {
      id: "user",
      header: "用户",
      cell: ({ row }) => (
        <UserCell
          user={{
            name: row.original.userName,
            email: row.original.userEmail,
          }}
        />
      ),
    },
    {
      accessorKey: "consumeType",
      header: "消费类型",
      cell: ({ row }) => <ConsumptionTypeBadge type={row.original.consumeType} />,
    },
    {
      accessorKey: "points",
      header: "消耗积分",
      cell: ({ row }) => (
        <span className="font-mono text-red-600 font-medium">
          -{Math.abs(row.original.points).toLocaleString()}
        </span>
      ),
    },
    {
      accessorKey: "balance",
      header: "剩余积分",
      cell: ({ row }) => (
        <span className="font-mono font-medium">
          {row.original.balance.toLocaleString()}
        </span>
      ),
    },
    {
      accessorKey: "businessId",
      header: "关联业务ID",
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.businessId || "-"}</span>
      ),
    },
    {
      accessorKey: "description",
      header: "描述",
      cell: ({ row }) => (
        <span className="max-w-[150px] truncate text-sm">
          {row.original.description || "-"}
        </span>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "创建时间",
      cell: ({ row }) => {
        const date = new Date(row.original.createdAt)
        return (
          <span className="text-sm">
            {date.toLocaleDateString("zh-CN", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        )
      },
    },
    {
      id: "actions",
      header: "操作",
      cell: ({ row }) => (
        <button
          onClick={() => onView(row.original)}
          className="rounded-md p-1.5 hover:bg-muted transition-colors"
          aria-label="查看详情"
        >
          <Eye className="size-4" />
        </button>
      ),
    },
  ]
}