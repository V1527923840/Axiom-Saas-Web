import { cn } from "@/lib/utils"

type BillStatus = "pending" | "completed" | "failed" | "refunded"

interface BillStatusBadgeProps {
  status: BillStatus
  className?: string
}

const statusConfig: Record<BillStatus, { label: string; className: string }> = {
  pending: {
    label: "待处理",
    className: "bg-yellow-500/20 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  },
  completed: {
    label: "已完成",
    className: "bg-green-500/20 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  },
  failed: {
    label: "已失败",
    className: "bg-red-500/20 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  },
  refunded: {
    label: "已退款",
    className: "bg-gray-500/20 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
  },
}

export function BillStatusBadge({ status, className }: BillStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.pending

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  )
}

type PaymentType = "recharge" | "refund"

interface PaymentTypeBadgeProps {
  type: PaymentType
  className?: string
}

const typeConfig: Record<PaymentType, { label: string; className: string }> = {
  recharge: {
    label: "充值",
    className: "bg-blue-500/20 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
  refund: {
    label: "退款",
    className: "bg-orange-500/20 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  },
}

export function PaymentTypeBadge({ type, className }: PaymentTypeBadgeProps) {
  const config = typeConfig[type] || typeConfig.recharge

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  )
}

type PaymentMethodType = "wechat" | "alipay" | "bankcard" | "other"

interface PaymentMethodBadgeProps {
  method: PaymentMethodType
  className?: string
}

const methodConfig: Record<PaymentMethodType, { label: string; className: string }> = {
  wechat: {
    label: "微信",
    className: "bg-green-500/20 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  },
  alipay: {
    label: "支付宝",
    className: "bg-blue-500/20 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
  },
  bankcard: {
    label: "银行卡",
    className: "bg-purple-500/20 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  },
  other: {
    label: "其他",
    className: "bg-gray-500/20 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
  },
}

export function PaymentMethodBadge({ method, className }: PaymentMethodBadgeProps) {
  const config = methodConfig[method] || methodConfig.other

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  )
}

type ConsumptionType = "chat" | "redeem" | "other"

interface ConsumptionTypeBadgeProps {
  type: ConsumptionType
  className?: string
}

const consumptionTypeConfig: Record<ConsumptionType, { label: string; className: string }> = {
  chat: {
    label: "聊天",
    className: "bg-blue-500/20 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
  redeem: {
    label: "兑换",
    className: "bg-purple-500/20 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  },
  other: {
    label: "其他",
    className: "bg-gray-500/20 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
  },
}

export function ConsumptionTypeBadge({ type, className }: ConsumptionTypeBadgeProps) {
  const config = consumptionTypeConfig[type] || consumptionTypeConfig.other

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  )
}