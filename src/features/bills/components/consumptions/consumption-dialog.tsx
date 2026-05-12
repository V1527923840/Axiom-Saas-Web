"use client"

import type { Consumption } from "../../types"
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
import { ConsumptionTypeBadge } from "../shared/bill-status-badge"

interface ConsumptionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  consumption: Consumption | null
}

export function ConsumptionDialog({ open, onOpenChange, consumption }: ConsumptionDialogProps) {
  if (!consumption) return null

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
          <DialogTitle>消费详情</DialogTitle>
          <DialogDescription>查看消费的完整信息</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Info */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">基本信息</h3>
            <Separator className="mb-3" />
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">账单ID</dt>
              <dd className="font-mono text-xs">{consumption.id}</dd>

              <dt className="text-muted-foreground">消费类型</dt>
              <dd><ConsumptionTypeBadge type={consumption.consumeType} /></dd>

              <dt className="text-muted-foreground">关联业务ID</dt>
              <dd className="font-mono text-xs">{consumption.businessId || "-"}</dd>
            </dl>
          </div>

          {/* User Info */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">用户信息</h3>
            <Separator className="mb-3" />
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">用户名称</dt>
              <dd className="font-medium">{consumption.userName || "-"}</dd>

              <dt className="text-muted-foreground">用户邮箱</dt>
              <dd className="text-muted-foreground">{consumption.userEmail || "-"}</dd>

              <dt className="text-muted-foreground">当前积分余额</dt>
              <dd className="font-mono font-medium">{consumption.balance.toLocaleString()}</dd>
            </dl>
          </div>

          {/* Consumption Info */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">消费信息</h3>
            <Separator className="mb-3" />
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">消耗积分</dt>
              <dd className="font-mono text-red-600 font-medium">
                -{Math.abs(consumption.points).toLocaleString()}
              </dd>

              <dt className="text-muted-foreground">描述</dt>
              <dd>{consumption.description || "无"}</dd>
            </dl>
          </div>

          {/* Time Info */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">时间信息</h3>
            <Separator className="mb-3" />
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">创建时间</dt>
              <dd>{formatDate(consumption.createdAt)}</dd>
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