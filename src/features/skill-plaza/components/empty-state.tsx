/**
 * Skill Plaza — EmptyState (loading / error / empty 三态)。
 *
 * 与 industry-chain/components/empty-state 风格一致。
 */
import { AlertCircle, FileText, Loader2, Wand2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface EmptyStateProps {
  loading?: boolean
  error?: string | null
  hasData?: boolean
  emptyHint?: string
  onRetry?: () => void
}

export function EmptyState({
  loading,
  error,
  hasData,
  emptyHint = "暂无可用 Skill",
  onRetry,
}: EmptyStateProps) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="size-8 animate-spin mb-2" />
        <p className="text-sm">加载中…</p>
      </div>
    )
  }
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-destructive">
        <AlertCircle className="size-8 mb-2" />
        <p className="text-sm mb-3">{error}</p>
        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="cursor-pointer"
          >
            重试
          </Button>
        )}
      </div>
    )
  }
  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        {emptyHint.includes("Skill") ? (
          <Wand2 className="size-8 mb-2" />
        ) : (
          <FileText className="size-8 mb-2" />
        )}
        <p className="text-sm">{emptyHint}</p>
      </div>
    )
  }
  return null
}