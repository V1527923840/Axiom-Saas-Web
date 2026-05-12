import type { ColumnDef } from "@tanstack/react-table"
import { Eye } from "lucide-react"
import type { PaymentFlow } from "../../types"
import { UserCell } from "../shared/user-cell"
import { BillStatusBadge, PaymentTypeBadge, PaymentMethodBadge } from "../shared/bill-status-badge"

interface FlowsColumnsProps {
  onView: (flow: PaymentFlow) => void
}

export function flowsColumns({ onView }: FlowsColumnsProps): ColumnDef<PaymentFlow>[] {
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
      accessorKey: "orderNo",
      header: "订单号",
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.orderNo || "-"}</span>
      ),
    },
    {
      accessorKey: "type",
      header: "充值类型",
      cell: ({ row }) => <PaymentTypeBadge type={row.original.type} />,
    },
    {
      accessorKey: "paymentMethod",
      header: "支付方式",
      cell: ({ row }) => <PaymentMethodBadge method={row.original.paymentMethod} />,
    },
    {
      accessorKey: "amount",
      header: "充值金额",
      cell: ({ row }) => (
        <span className="font-mono font-medium">
          ¥{(row.original.amount / 100).toFixed(2)}
        </span>
      ),
    },
    {
      accessorKey: "points",
      header: "积分数量",
      cell: ({ row }) => (
        <span className="font-mono text-green-600 font-medium">
          +{row.original.points.toLocaleString()}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "状态",
      cell: ({ row }) => <BillStatusBadge status={row.original.status} />,
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