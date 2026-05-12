"use client"

import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { Plan } from "../../plans/types"

interface SubscriptionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  plans: Plan[]
  currentPlanId?: string
  onSelectPlan: (planId: string, autoRenew: boolean) => void
  loading?: boolean
}

export function SubscriptionDialog({
  open,
  onOpenChange,
  plans,
  currentPlanId,
  onSelectPlan,
  loading,
}: SubscriptionDialogProps) {
  const [selectedPlanId, setSelectedPlanId] = React.useState<string | null>(null)
  const [autoRenew, setAutoRenew] = React.useState(true)

  const availablePlans = plans.filter((plan) => plan.status === "active")

  const handleConfirm = () => {
    if (selectedPlanId) {
      onSelectPlan(selectedPlanId, autoRenew)
      onOpenChange(false)
      setSelectedPlanId(null)
    }
  }

  const formatPrice = (price: number) => {
    if (price === 0) return "免费"
    return `¥${price.toFixed(2)}`
  }

  const getCycleLabel = (cycle: string) => {
    const labels: Record<string, string> = {
      monthly: "月",
      quarterly: "季",
      yearly: "年",
      lifetime: "终身",
    }
    return labels[cycle] || cycle
  }

  return (
    <div
      className={`fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 ${open ? "" : "hidden"}`}
      onClick={() => onOpenChange(false)}
    >
      <div
        className="bg-background rounded-lg shadow-lg max-w-2xl w-full max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b shrink-0">
          <h2 className="text-xl font-semibold">选择套餐</h2>
          <p className="text-sm text-muted-foreground mt-1">
            选择适合您的订阅套餐
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {availablePlans.map((plan) => {
            const isSelected = selectedPlanId === plan.id
            const isCurrentPlan = plan.id === currentPlanId

            return (
              <div
                key={plan.id}
                className={`relative rounded-lg border p-4 cursor-pointer transition-colors ${
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "hover:border-primary/50"
                } ${isCurrentPlan ? "opacity-60" : ""}`}
                onClick={() => !isCurrentPlan && setSelectedPlanId(plan.id)}
              >
                {isCurrentPlan && (
                  <Badge className="absolute top-2 right-2" variant="secondary">
                    当前套餐
                  </Badge>
                )}

                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="font-medium">{plan.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {plan.description}
                    </p>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="font-mono">
                        {plan.pointsQuota.toLocaleString()} 积分
                      </span>
                      <span className="font-mono">
                        {plan.chatQuota.toLocaleString()} 次聊天
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="font-semibold text-lg">
                      {formatPrice(plan.price)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      /{getCycleLabel(plan.cycle)}
                    </p>
                  </div>
                </div>

                {isSelected && (
                  <div className="mt-4 pt-4 border-t">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoRenew}
                        onChange={(e) => setAutoRenew(e.target.checked)}
                        className="rounded border-primary"
                      />
                      <span className="text-sm">自动续费</span>
                    </label>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="p-6 border-t shrink-0 flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="cursor-pointer"
          >
            取消
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedPlanId || loading}
            className="cursor-pointer"
          >
            {loading ? "处理中..." : "确认订阅"}
          </Button>
        </div>
      </div>
    </div>
  )
}