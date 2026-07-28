// src/features/industry-chain/components/empty-state.tsx
"use client"

import { AlertCircle, FileText, Loader2 } from "lucide-react"

interface EmptyStateProps {
  loading?: boolean
  error?: string | null
  hasData?: boolean
  onRetry?: () => void
}

export function EmptyState({
  loading,
  error,
  hasData,
  onRetry,
}: EmptyStateProps) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="size-8 animate-spin mb-2" />
        <p className="text-sm">加载中...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-destructive">
        <AlertCircle className="size-8 mb-2" />
        <p className="text-sm mb-3">{error}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="text-sm underline underline-offset-2"
          >
            重试
          </button>
        )}
      </div>
    )
  }

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <FileText className="size-8 mb-2" />
        <p className="text-sm">暂无产业链数据</p>
      </div>
    )
  }

  return null
}
