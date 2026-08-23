/**
 * useSubscription — paginated subscription list + current-subscription +
 * subscribe / cancel / upgrade mutations.
 *
 * Migrated to TanStack Query (mirroring use-users.ts pattern).
 * 列表 + current 都用 useQuery 缓存;mutators 在 onSuccess 里
 * invalidate 列表和 current。
 *
 * 分页元数据走 src/lib/paginated-response.ts 的 readRootPagination —
 * 处理 1-based API → 0-based 内部的转换。后端的 TransformResponseInterceptor
 * 把分页响应包成 { data: items[], meta: { total, page, pageSize } },
 * readRootPagination 从 res.meta 读元数据,extractItems 从 res.data 读 items。
 *
 * 老的 useState+useCallback 版本里 cancelSubscription 会在前端把 row 的
 * status 强行置成 'cancelled',然后不 refetch — 这种本地合成会让 cache
 * 跟 backend 状态慢慢错位(尤其是订阅还有异步关单、自动续费等流程)。
 * 现在改成 invalidate 让 backend 当单一事实源。
 */
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query"
import { get, post, del } from "@/lib/api"
import type {
  Subscription,
  SubscriptionQueryParams,
  CurrentSubscriptionInfo,
} from "../types"
import {
  readRootPagination,
  toApiPageParams,
  extractItems,
  type InternalPagination,
} from "@/lib/paginated-response"

const PAGE_SIZE_DEFAULT = 10

export interface UseSubscriptionResult {
  items: Subscription[]
  pagination: InternalPagination
  currentSubscription: CurrentSubscriptionInfo | null
  isLoading: boolean
  isLoadingCurrent: boolean
  isMutating: boolean
  error: Error | null
  refetch: () => void
  refetchCurrent: () => void
  subscribe: (planId: string, autoRenew?: boolean) => Promise<Subscription>
  cancelSubscription: (subscriptionId: string) => Promise<void>
  upgradeSubscription: (newPlanId: string) => Promise<{
    success: boolean
    subscription: Subscription
  }>
}

export function useSubscription(
  params: SubscriptionQueryParams = {},
): UseSubscriptionResult {
  const qc = useQueryClient()

  const list = useQuery({
    queryKey: ["subscriptions", params] as const,
    queryFn: async () => {
      const { page, pageSize } = toApiPageParams(params, {
        pageSize: PAGE_SIZE_DEFAULT,
      })
      const queryParams: Record<string, string | number> = { page, pageSize }
      if (params.status) queryParams.status = String(params.status)
      if (params.userId) queryParams.userId = params.userId
      if (params.planId) queryParams.planId = params.planId
      if (params.startDate) queryParams.startDate = params.startDate
      if (params.endDate) queryParams.endDate = params.endDate
      const res = await get<Subscription[]>("/v1/subscriptions", {
        params: queryParams,
      })
      // res.data 是 items 数组(res.meta 是分页元数据,见 readRootPagination 调用)
      const items = extractItems<Subscription>(res.data)
      return { items, meta: res.meta }
    },
    staleTime: 30_000,
  })

  // current subscription 是 auth-scoped (走 Bearer token 自动确定当前用户),
  // 不需要 userId 注入 queryKey — token 切换时 invalidate 即可。
  const current = useQuery({
    queryKey: ["subscriptions", "current"] as const,
    queryFn: async (): Promise<CurrentSubscriptionInfo | null> => {
      try {
        const res = await get<CurrentSubscriptionInfo>("/v1/subscriptions/current")
        return res.data ?? null
      } catch {
        // 当前用户没订阅时后端经常返回 404 — 当作「无活跃订阅」,返回 null
        return null
      }
    },
    staleTime: 30_000,
  })

  const subscribeMut = useMutation({
    mutationFn: async (vars: {
      planId: string
      autoRenew: boolean
    }): Promise<Subscription> => {
      const res = await post<Subscription>("/v1/subscriptions", vars)
      return res.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["subscriptions"] })
    },
  })

  const cancelMut = useMutation({
    mutationFn: async (subscriptionId: string) => {
      await del(`/v1/subscriptions/${subscriptionId}`)
    },
    // ★ 老代码在 onSuccess 把 row 的 status 强行写成本地 'cancelled',但不 refetch —
    // 这种「本地合成」会让 cache 跟 backend 状态慢慢错位(订阅还有自动续费 /
    // 异步关单 / 退款等流程)。现在改成 invalidate 让 backend 当事实源,
    // row 的 cancelled 状态由下一次 fetch 拉回来。
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["subscriptions"] })
    },
  })

  const upgradeMut = useMutation({
    mutationFn: async (newPlanId: string) => {
      const res = await post<{ success: boolean; subscription: Subscription }>(
        "/v1/subscriptions/upgrade",
        { newPlanId },
      )
      return res.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["subscriptions"] })
    },
  })

  const items = list.data?.items ?? []
  const pagination = readRootPagination(list.data?.meta, { pageSize: PAGE_SIZE_DEFAULT })

  return {
    items,
    pagination,
    currentSubscription: current.data ?? null,
    isLoading: list.isLoading,
    isLoadingCurrent: current.isLoading,
    isMutating:
      subscribeMut.isPending || cancelMut.isPending || upgradeMut.isPending,
    error: (list.error ?? current.error ?? null) as Error | null,
    refetch: list.refetch,
    refetchCurrent: current.refetch,
    subscribe: (planId, autoRenew = false) =>
      subscribeMut.mutateAsync({ planId, autoRenew }),
    cancelSubscription: (id) => cancelMut.mutateAsync(id),
    upgradeSubscription: (newPlanId) => upgradeMut.mutateAsync(newPlanId),
  }
}
