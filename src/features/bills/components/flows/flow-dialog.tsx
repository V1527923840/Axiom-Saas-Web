"use client"

import type { PaymentFlow } from "../../types"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { BillStatusBadge, PaymentTypeBadge, PaymentMethodBadge } from "../shared/bill-status-badge"

interface FlowDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  flow: PaymentFlow | null
}

export function FlowDialog({ open, onOpenChange, flow }: FlowDialogProps) {
  if (!flow) return null

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-"
    const date = new Date(dateStr)
    return date.toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>流水详情</DialogTitle>
          <DialogDescription>查看流水的完整信息</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Info */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">基本信息</h3>
            <Separator className="mb-3" />
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">账单ID</dt>
              <dd className="font-mono text-xs">{flow.id}</dd>

              <dt className="text-muted-foreground">订单号</dt>
              <dd className="font-mono text-xs">{flow.orderNo || "-"}</dd>

              <dt className="text-muted-foreground">充值类型</dt>
              <dd><PaymentTypeBadge type={flow.type} /></dd>

              <dt className="text-muted-foreground">状态</dt>
              <dd><BillStatusBadge status={flow.status} /></dd>
            </dl>
          </div>

          {/* User Info */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">用户信息</h3>
            <Separator className="mb-3" />
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">用户名称</dt>
              <dd className="font-medium">{flow.userName || "-"}</dd>

              <dt className="text-muted-foreground">用户邮箱</dt>
              <dd className="text-muted-foreground">{flow.userEmail || "-"}</dd>
            </dl>
          </div>

          {/* Transaction Info */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">交易信息</h3>
            <Separator className="mb-3" />
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">充值金额</dt>
              <dd className="font-mono font-medium text-green-600">
                ¥{(flow.amount / 100).toFixed(2)}
              </dd>

              <dt className="text-muted-foreground">积分数量</dt>
              <dd className="font-mono text-green-600">
                +{flow.points.toLocaleString()}
              </dd>

              <dt className="text-muted-foreground">支付方式</dt>
              <dd><PaymentMethodBadge method={flow.paymentMethod} /></dd>
            </dl>
          </div>

          {/* Time Info */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">时间信息</h3>
            <Separator className="mb-3" />
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">创建时间</dt>
              <dd>{formatDate(flow.createdAt)}</dd>

              <dt className="text-muted-foreground">更新时间</dt>
              <dd>{formatDate(flow.updatedAt)}</dd>

              {flow.completedAt && (
                <>
                  <dt className="text-muted-foreground">完成时间</dt>
                  <dd>{formatDate(flow.completedAt)}</dd>
                </>
              )}
            </dl>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="cursor-pointer">
            关闭
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}