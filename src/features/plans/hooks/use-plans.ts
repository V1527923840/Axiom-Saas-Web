/**
 * usePlans — paginated plan list + create/update/delete mutations +
 * 套餐关联菜单树 (usePlanMenus)。
 *
 * Migrated to TanStack Query (mirroring skill-plaza's use-skills pattern
 * 和 use-users.ts)。
 *  - 列表通过 useQuery 缓存,mutators 在 onSettled 里 invalidate。
 *  - 分页元数据走 src/lib/paginated-response.ts 的 readRootPagination —
 *    处理 1-based API → 0-based 内部的转换。后端的 TransformResponseInterceptor
 *    把分页响应包成 { data: items[], meta: { total, page, pageSize } },
 *    readRootPagination 从 res.meta 读元数据,extractItems 从 res.data 读 items。
 *  - 套餐关联菜单走独立 queryKey `['plans', planId, 'menus']`,仅在
 *    planId 非空时启用 — 编辑套餐时由 planId 触发自动 fetch,assign 后
 *    自动 invalidate 重拉。
 *
 * 注:list endpoint `/v1/plans` 历史用 query 参数 `limit`(不是 `pageSize`),
 * 保留这个老行为 — 后端 contract 不能改。如果未来后端改成 `pageSize`,
 * 把 `queryParams.limit` 改成 `pageSize` 即可,toApiPageParams 那边的
 * pageSize 命名都是前端内部概念。
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { get, post, patch, del } from "@/lib/api"
import type { Plan, PlanQueryParams, PlanFormValues } from "../types"
import type { MenuTreeNode } from "@/features/menus/types"
import {
  readRootPagination,
  toApiPageParams,
  extractItems,
  type InternalPagination,
  type PaginationMeta,
} from "@/lib/paginated-response"

const PAGE_SIZE_DEFAULT = 10

export interface UsePlansResult {
  items: Plan[]
  pagination: InternalPagination
  isLoading: boolean
  error: Error | null
  refetch: () => void
  createPlan: (data: PlanFormValues) => Promise<Plan>
  updatePlan: (id: string, data: Partial<PlanFormValues>) => Promise<void>
  deletePlan: (id: string) => Promise<void>
}

export interface UsePlanMenusResult {
  data: MenuTreeNode[] | undefined
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

// 后端响应形状 — TransformResponseInterceptor 包络:
// { data: Plan[], meta: { total, page, pageSize } }
// items 走 res.data,分页元数据走 res.meta。

// 14 字段的 raw→Plan 转换。封出来方便 queryFn 用,
// 也方便 createPlan / updatePlan 共用同一个 mapping。
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformPlan(raw: any): Plan {
  return {
    id: String(raw.id),
    name: raw.name || "",
    description: raw.description,
    tier: (raw.tier || "Lv0") as Plan["tier"],
    cycle: (raw.cycle || "monthly") as Plan["cycle"],
    pointsQuota: raw.pointsQuota ?? 0,
    chatQuota: raw.chatQuota ?? 0,
    price: raw.price ?? 0,
    currency: raw.currency || "CNY",
    status: (raw.status === "inactive" || raw.status === "deprecated"
      ? raw.status
      : "active") as Plan["status"],
    features: Array.isArray(raw.features) ? raw.features : [],
    menuIds: Array.isArray(raw.menuIds) ? raw.menuIds : [],
    createdAt: raw.createdAt || "",
    updatedAt: raw.updatedAt || "",
  }
}

export function usePlans(params: PlanQueryParams = {}): UsePlansResult {
  const qc = useQueryClient()

  const list = useQuery({
    queryKey: ["plans", params] as const,
    queryFn: async () => {
      const { page, pageSize } = toApiPageParams(params, {
        pageSize: PAGE_SIZE_DEFAULT,
      })
      // 后端 /v1/plans 用 `limit` 而不是 `pageSize`(历史 contract),
      // 保留这个名字 — 改之前先跟后端对齐。
      const queryParams: Record<string, string | number> = { page, limit: pageSize }
      if (params.cycle) queryParams.cycle = String(params.cycle)
      if (params.status) queryParams.status = String(params.status)
      if (params.tier) queryParams.tier = String(params.tier)
      if (params.search) queryParams.search = params.search
      const res = await get<Plan[]>("/v1/plans", { params: queryParams })
      // res.data 是 items 数组(res.meta 是分页元数据,见 readRootPagination 调用)
      const items = (extractItems<Plan>(res.data) as Plan[]).map(transformPlan)
      return { items, meta: res.meta }
    },
    staleTime: 30_000,
  })

  const create = useMutation({
    mutationFn: async (data: PlanFormValues): Promise<Plan> => {
      const res = await post<unknown>("/v1/plans", data)
      return transformPlan(res.data)
    },
    // ★ 乐观更新:把新 plan 塞进列表第一条,避免用户看着表格跳一下。
    // 后端 invalidate 之后这条会被真实数据覆盖。
    onMutate: async (data) => {
      await qc.cancelQueries({ queryKey: ["plans"] })
      const snapshots = qc.getQueriesData<{ items: Plan[]; meta: PaginationMeta | undefined }>({
        queryKey: ["plans"],
      })
      qc.setQueriesData<{ items: Plan[]; meta: PaginationMeta | undefined }>(
        { queryKey: ["plans"] },
        (old) => {
          if (!old) return old
          const optimistic: Plan = {
            id: `temp-${Date.now()}`,
            name: data.name,
            description: data.description,
            tier: data.tier,
            cycle: data.cycle,
            pointsQuota: data.pointsQuota ?? 0,
            chatQuota: data.chatQuota ?? 0,
            price: data.price ?? 0,
            currency: data.currency || "CNY",
            status: data.status,
            features: data.features || [],
            menuIds: data.menuIds || [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
          const meta = old.meta ?? { total: 0, page: 1, pageSize: PAGE_SIZE_DEFAULT }
          return {
            ...old,
            items: [optimistic, ...old.items],
            meta: { ...meta, total: (meta.total ?? 0) + 1 },
          }
        },
      )
      return { snapshots }
    },
    onError: (_err, _vars, ctx) => {
      // 失败回滚到乐观前的快照
      ctx?.snapshots.forEach(([key, snap]) => qc.setQueryData(key, snap))
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["plans"] })
    },
  })

  const update = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<PlanFormValues> }) => {
      await patch(`/v1/plans/${id}`, data)
    },
    onMutate: async ({ id, data }) => {
      await qc.cancelQueries({ queryKey: ["plans"] })
      const snapshots = qc.getQueriesData<{ items: Plan[]; meta: PaginationMeta | undefined }>({
        queryKey: ["plans"],
      })
      qc.setQueriesData<{ items: Plan[]; meta: PaginationMeta | undefined }>(
        { queryKey: ["plans"] },
        (old) => {
          if (!old) return old
          return {
            ...old,
            items: old.items.map((p) =>
              p.id === id
                ? {
                    ...p,
                    name: data.name ?? p.name,
                    description: data.description ?? p.description,
                    tier: data.tier ?? p.tier,
                    cycle: data.cycle ?? p.cycle,
                    pointsQuota: data.pointsQuota ?? p.pointsQuota,
                    chatQuota: data.chatQuota ?? p.chatQuota,
                    price: data.price ?? p.price,
                    currency: data.currency ?? p.currency,
                    status: data.status ?? p.status,
                  }
                : p,
            ),
          }
        },
      )
      return { snapshots }
    },
    onError: (_err, _vars, ctx) => {
      ctx?.snapshots.forEach(([key, snap]) => qc.setQueryData(key, snap))
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["plans"] })
    },
  })

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await del(`/v1/plans/${id}`)
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["plans"] })
      const snapshots = qc.getQueriesData<{ items: Plan[]; meta: PaginationMeta | undefined }>({
        queryKey: ["plans"],
      })
      qc.setQueriesData<{ items: Plan[]; meta: PaginationMeta | undefined }>(
        { queryKey: ["plans"] },
        (old) => {
          if (!old) return old
          const meta = old.meta ?? { total: 0, page: 1, pageSize: PAGE_SIZE_DEFAULT }
          return {
            ...old,
            items: old.items.filter((p) => p.id !== id),
            meta: { ...meta, total: Math.max(0, (meta.total ?? 0) - 1) },
          }
        },
      )
      return { snapshots }
    },
    onError: (_err, _vars, ctx) => {
      ctx?.snapshots.forEach(([key, snap]) => qc.setQueryData(key, snap))
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["plans"] })
    },
  })

  const items = list.data?.items ?? []
  const pagination = readRootPagination(list.data?.meta, { pageSize: PAGE_SIZE_DEFAULT })

  return {
    items,
    pagination,
    isLoading: list.isLoading,
    error: list.error,
    refetch: list.refetch,
    createPlan: create.mutateAsync,
    updatePlan: (id, data) => update.mutateAsync({ id, data }),
    deletePlan: remove.mutateAsync,
  }
}

/**
 * 单个 plan 的关联菜单树 — 编辑套餐时由 usePlans 调用方通过 planId 触发。
 *
 * 重要: queryKey 跟 list queryKey `['plans', params]` **互不相交**,
 * 因为 list 的 queryKey 是对象 params,而这里是 `['plans', planId, 'menus']` —
 * TanStack Query 用结构匹配,`['plans', {page:0}]` 跟 `['plans', 'plan-1', 'menus']`
 * 不会互相 invalidate。assignPlanMenus 完成后只 invalidate 这个 key,
 * 不会触发整个 plans 列表重拉。
 */
export function usePlanMenus(planId: string | null | undefined): UsePlanMenusResult {
  const tree = useQuery({
    queryKey: ["plans", planId, "menus"] as const,
    queryFn: async (): Promise<MenuTreeNode[]> => {
      const res = await get<unknown>(`/v1/plans/${planId}/menus`)
      // 后端可能直返 nested tree,也可能返 { data: tree[] } 包络
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rawData = res.data as any
      if (Array.isArray(rawData)) return rawData as MenuTreeNode[]
      const wrapped = rawData?.data
      return Array.isArray(wrapped) ? (wrapped as MenuTreeNode[]) : []
    },
    enabled: !!planId,
    staleTime: 30_000,
  })

  return {
    data: tree.data,
    isLoading: tree.isLoading,
    error: tree.error,
    refetch: tree.refetch,
  }
}

/**
 * 分配菜单给套餐的 mutation hook。
 *
 * 调用方负责拿到 planId + menuIds 后调用 `mutateAsync({ planId, menuIds })`,
 * 完成后会 invalidate `['plans', planId, 'menus']`,让对应的 usePlanMenus
 * 重新拉取 — 这样编辑套餐的对话框能在 assign 之后立刻看到最新菜单树。
 *
 * 注意:这个 hook 不挂在 usePlans() 返回值里(它是 mutation,不是 list state),
 * 由 plan 编辑流程单独调用。
 */
export function useAssignPlanMenus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ planId, menuIds }: { planId: string; menuIds: string[] }) => {
      await post(`/v1/plans/${planId}/menus`, { menuIds })
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["plans", vars.planId, "menus"] })
    },
  })
}
