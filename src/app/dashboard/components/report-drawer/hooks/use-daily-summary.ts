import { useCallback } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/contexts/auth-context"
import {
  getDailySummary,
  getLatestDailySummary,
  type DailySummary,
  type Frequency,
} from "@/services/daily-summary"

/**
 * useLatestReports / useReportDetail — 迁到 TanStack Query 后保留原来的
 * `{ report, loading, error, refresh }` 返回形状,LatestDailyCard /
 * LatestWeeklyCard / ReportDrawer 这些老消费者一行都不用改。TanStack
 * Query 自动处理 race condition(之前的 cancelled-flag 不需要了)。
 *
 * queryKey 设计:
 *   - `['daily-summary', 'latest', frequency]` — latest 一份频率一档
 *   - `['daily-summary', reportId]` — detail 一份报告一档,drawer 切换时
 *     自动按 reportId 切缓存,不需要手动 invalidate
 */
export function useLatestReports(frequency: Frequency) {
  const { token } = useAuth()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ["daily-summary", "latest", frequency] as const,
    queryFn: async () => {
      const res = await getLatestDailySummary(token, frequency)
      return res.data ?? null
    },
  })

  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: ["daily-summary", "latest", frequency],
    })
  }, [queryClient, frequency])

  return {
    report: (query.data ?? null) as DailySummary | null,
    loading: query.isLoading,
    error: (query.error as Error | null) ?? null,
    refresh,
  }
}

export function useReportDetail(reportId: string | null) {
  const { token } = useAuth()
  const query = useQuery({
    queryKey: ["daily-summary", reportId] as const,
    queryFn: async () => {
      const res = await getDailySummary(token, reportId as string)
      return res.data
    },
    enabled: !!reportId,
  })

  return {
    report: (query.data ?? null) as DailySummary | null,
    loading: query.isLoading,
    error: (query.error as Error | null) ?? null,
  }
}
