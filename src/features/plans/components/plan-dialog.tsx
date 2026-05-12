"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import type { Plan } from "../types"

interface PlanDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  plan: Plan | null
  mode: "view" | "edit"
  onEdit?: (plan: Plan) => void
}

export function PlanDialog({
  open,
  onOpenChange,
  plan,
  mode,
  onEdit,
}: PlanDialogProps) {
  if (!plan) return null

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getCycleLabel = (cycle: string) => {
    const labels: Record<string, string> = {
      monthly: "月付",
      quarterly: "季付",
      yearly: "年付",
      lifetime: "终身",
    }
    return labels[cycle] || cycle
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "active":
        return "default"
      case "inactive":
        return "secondary"
      case "deprecated":
        return "destructive"
      default:
        return "secondary"
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-xl leading-tight">
            {mode === "edit" ? "编辑套餐" : "套餐详情"}
          </DialogTitle>
          <DialogDescription>
            套餐ID: {plan.id}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 min-h-0">
          {/* Basic Info Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">基本信息</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">套餐名称</p>
                <p className="font-medium">{plan.name}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">等级</p>
                <Badge variant="outline">
                  {plan.tier === "Lv0" ? "免费" : plan.tier === "Lv1" ? "基础" : plan.tier === "Lv2" ? "进阶" : "高级"}
                </Badge>
              </div>
              <div className="space-y-1 col-span-2">
                <p className="text-xs text-muted-foreground">描述</p>
                <p className="text-sm">{plan.description || "无描述"}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Pricing Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">价格信息</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">计费周期</p>
                <p className="font-medium">{getCycleLabel(plan.cycle)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">价格</p>
                <p className="font-medium font-mono">
                  {plan.price === 0 ? "免费" : `¥${plan.price.toFixed(2)}`}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Quotas Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">额度信息</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">积分额度</p>
                <p className="font-medium font-mono">
                  {plan.pointsQuota.toLocaleString()}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">聊天次数</p>
                <p className="font-medium font-mono">
                  {plan.chatQuota.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {plan.features && plan.features.length > 0 && (
            <>
              <Separator />
              {/* Features Section */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground">功能列表</h3>
                <div className="flex flex-wrap gap-2">
                  {plan.features.map((feature, index) => (
                    <Badge key={index} variant="secondary">
                      {feature}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Status Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">状态信息</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">状态</p>
                <Badge variant={getStatusVariant(plan.status)}>
                  {plan.status === "active" ? "启用" : plan.status === "inactive" ? "禁用" : "废弃"}
                </Badge>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">创建时间</p>
                <p className="font-medium text-sm">{formatDate(plan.createdAt)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">最后更新</p>
                <p className="font-medium text-sm">{formatDate(plan.updatedAt)}</p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="shrink-0 pt-4">
          {mode === "view" && onEdit && (
            <Button onClick={() => onEdit(plan)} className="cursor-pointer">
              编辑套餐
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}