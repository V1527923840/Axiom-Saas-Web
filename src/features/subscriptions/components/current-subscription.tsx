"use client"

import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import type { CurrentSubscriptionInfo } from "../types"

interface CurrentSubscriptionProps {
  subscription: CurrentSubscriptionInfo | null
  loading?: boolean
  onUpgrade?: () => void
  onCancel?: () => void
}

export function CurrentSubscription({
  subscription,
  loading,
  onUpgrade,
  onCancel,
}: CurrentSubscriptionProps) {
  if (loading) {
    return (
      <div className="rounded-lg border p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-1/3"></div>
          <div className="h-8 bg-muted rounded w-1/2"></div>
          <div className="h-20 bg-muted rounded"></div>
        </div>
      </div>
    )
  }

  if (!subscription) {
    return (
      <div className="rounded-lg border p-6 text-center">
        <p className="text-muted-foreground mb-4">暂无订阅信息</p>
        <Button onClick={onUpgrade} className="cursor-pointer">
          立即订阅
        </Button>
      </div>
    )
  }

  const pointsUsed = subscription.pointsQuota - subscription.pointsBalance
  const pointsPercentage = subscription.pointsQuota > 0
    ? (pointsUsed / subscription.pointsQuota) * 100
    : 0

  const chatUsed = subscription.chatQuotaUsed
  const chatTotal = subscription.chatQuotaTotal
  const chatPercentage = chatTotal > 0 ? (chatUsed / chatTotal) * 100 : 0

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "active":
        return "default"
      case "trial":
        return "secondary"
      case "expired":
        return "destructive"
      default:
        return "secondary"
    }
  }

  return (
    <div className="rounded-lg border">
      <div className="p-6 space-y-6">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">{subscription.planName}</h3>
            <div className="flex items-center gap-2">
              <Badge variant={getStatusVariant(subscription.status)}>
                {subscription.status === "active" ? "生效中" :
                 subscription.status === "trial" ? "试用中" : "已过期"}
              </Badge>
              {subscription.autoRenew && (
                <Badge variant="outline">自动续费</Badge>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">到期时间</p>
            <p className="font-medium">{formatDate(subscription.expiredAt)}</p>
          </div>
        </div>

        <Separator />

        {/* Quotas Section */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-muted-foreground">额度使用情况</h4>

          {/* Points Quota */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>积分余额</span>
              <span className="font-mono">
                {subscription.pointsBalance.toLocaleString()} / {subscription.pointsQuota.toLocaleString()}
              </span>
            </div>
            <Progress value={pointsPercentage} className="h-2" />
            <p className="text-xs text-muted-foreground text-right">
              已使用 {pointsPercentage.toFixed(1)}%
            </p>
          </div>

          {/* Chat Quota */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>聊天次数</span>
              <span className="font-mono">
                {chatUsed.toLocaleString()} / {chatTotal.toLocaleString()}
              </span>
            </div>
            <Progress value={chatPercentage} className="h-2" />
            <p className="text-xs text-muted-foreground text-right">
              已使用 {chatPercentage.toFixed(1)}%
            </p>
          </div>
        </div>

        <Separator />

        {/* Actions Section */}
        <div className="flex justify-end gap-3">
          {onCancel && (
            <Button
              variant="outline"
              onClick={onCancel}
              className="cursor-pointer"
            >
              取消订阅
            </Button>
          )}
          {onUpgrade && (
            <Button onClick={onUpgrade} className="cursor-pointer">
              升级套餐
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}