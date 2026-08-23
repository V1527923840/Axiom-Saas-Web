/**
 * useUsers — paginated user list + create/update/delete mutations.
 *
 * Migrated to TanStack Query (mirroring skill-plaza's use-skills pattern).
 * 列表通过 useQuery 缓存,mutators 在 onSuccess 里 invalidate 列表。
 * 分页元数据走 src/lib/paginated-response.ts 的 readRootPagination —
 * 处理 1-based API → 0-based 内部的转换 + 后端字段在响应根级别的事实
 * (admin-server CLAUDE.md 「格式 A」)。
 *
 * 旧的 useState+useCallback 版本里 fetchUserMenus / assignMenusToUser
 * 是 dead code(从来没被调用过)— 这次顺手删掉。RoleOption 由 useRoles
 * 单独提供(也走 TanStack Query),useUsers 不再 re-export。
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { get, post, patch, del } from "@/lib/api"
import type { User, UserQueryParams, UserFormValues } from "../types"
import { DEFAULT_USER_PASSWORD } from "../types"
import {
  readRootPagination,
  toApiPageParams,
  extractItems,
  type InternalPagination,
} from "@/lib/paginated-response"

const PAGE_SIZE_DEFAULT = 10

export interface UseUsersResult {
  items: User[]
  pagination: InternalPagination
  isLoading: boolean
  error: Error | null
  refetch: () => void
  createUser: (data: UserFormValues) => Promise<User>
  updateUser: (id: string, data: Partial<UserFormValues>) => Promise<void>
  deleteUser: (id: string) => Promise<void>
}

// 后端响应形状 — 列表端点返回 { data: User[], total, page, pageSize }
// (infinityPagination, admin-server CLAUDE.md 格式 A)
interface UsersApiResponse {
  data: User[]
  total: number
  page: number
  pageSize: number
}

// 19 字段的 raw→User 转换。封出来方便 queryFn 用,
// 也方便 createUser / updateUser 共用同一个 mapping。
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformUser(raw: any): User {
  return {
    id: String(raw.id),
    name: `${raw.firstName || ""}${raw.lastName || ""}`.trim() || raw.email || "Unknown",
    email: raw.email || "",
    avatar: raw.avatar,
    role: (typeof raw.role === "string"
      ? raw.role
      : raw.role?.name ?? null) as User["role"] ?? null,
    roles: Array.isArray(raw.roles) ? raw.roles : [],
    tier: raw.tier || "Lv0",
    currentPlanId: raw.currentPlanId,
    pointsBalance: raw.pointsBalance || 0,
    chatQuotaUsed: raw.chatQuotaUsed || 0,
    chatQuotaTotal: raw.chatQuotaTotal || 0,
    subscriptionExpiredAt: raw.subscriptionExpiredAt,
    registeredAt: raw.registeredAt || "",
    lastLoginAt: raw.lastLoginAt,
    status: (typeof raw.status === "string"
      ? raw.status
      : raw.status?.name?.toLowerCase()) as User["status"] || "active",
  }
}

// 把表单的 name 拆成 firstName/lastName,跟单空格分词的英文名兼容,
// 单 token(如中文名)整体塞进 firstName,避免 lastName 空字符串。
function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = (fullName ?? "").trim().split(/\s+/).filter(Boolean)
  return {
    firstName: parts[0] ?? fullName,
    lastName: parts.slice(1).join(" "),
  }
}

// 前端 UserFormValues → 后端 UserDto
function formToApi(data: Partial<UserFormValues>): Record<string, unknown> {
  const apiData: Record<string, unknown> = {}
  if (data.name) {
    const { firstName, lastName } = splitName(data.name)
    apiData.firstName = firstName
    apiData.lastName = lastName
  }
  if (data.email !== undefined) {
    apiData.email = data.email
  }
  if (data.roleIds !== undefined) {
    apiData.roleIds = data.roleIds
  }
  if (data.status) {
    apiData.status = {
      id: data.status === "active" ? 1 : data.status === "inactive" ? 2 : 3,
    }
  }
  if (data.tier) {
    apiData.tier = data.tier
  }
  if (data.currentPlanId !== undefined) {
    apiData.currentPlanId = data.currentPlanId || null
  }
  // 密码留空 = 重置成默认密码,跟 create 行为一致
  if (data.password !== undefined) {
    apiData.password = data.password.trim() || DEFAULT_USER_PASSWORD
  }
  return apiData
}

export function useUsers(params: UserQueryParams = {}): UseUsersResult {
  const qc = useQueryClient()

  const list = useQuery({
    queryKey: ["users", params] as const,
    queryFn: async (): Promise<UsersApiResponse> => {
      const { page, pageSize } = toApiPageParams(params, {
        pageSize: PAGE_SIZE_DEFAULT,
      })
      const queryParams: Record<string, string | number> = { page, pageSize }
      if (params.role) queryParams.role = String(params.role)
      if (params.status) queryParams.status = String(params.status)
      if (params.tier) queryParams.tier = String(params.tier)
      if (params.search) queryParams.search = params.search
      const res = await get<UsersApiResponse>("/v1/users", { params: queryParams })
      // 处理两种 response 形状(res.data 可能是数组本身,也可能包在 { data } 里)
      const rawData = res.data as unknown
      const items = extractItems<User>(rawData).map(transformUser)
      // rawData 可能是数组本身(后端直返),也可能是包络 { data, total, page, pageSize }。
      // extractItems 已经处理过数组情况;这里再用 extractItems 的结果补一个包络。
      const wrapped: UsersApiResponse = Array.isArray(rawData)
        ? { data: items, total: items.length, page: 1, pageSize: PAGE_SIZE_DEFAULT }
        : { ...(rawData as UsersApiResponse), data: items }
      return wrapped
    },
    staleTime: 30_000,
  })

  const create = useMutation({
    mutationFn: async (data: UserFormValues): Promise<User> => {
      const apiData = {
        ...formToApi(data),
        // 补 create 独有字段:password 默认值 + roleIds
        password: data.password?.trim() || DEFAULT_USER_PASSWORD,
        roleIds: data.roleIds ?? [],
      }
      const res = await post<unknown>("/v1/users", apiData)
      return transformUser(res.data)
    },
    // ★ 乐观更新:把新 user 塞进列表第一条,避免用户看着表格跳一下。
    // 后端 invalidate 之后这条会被真实数据覆盖。
    onMutate: async (data) => {
      await qc.cancelQueries({ queryKey: ["users"] })
      const snapshots = qc.getQueriesData<UsersApiResponse>({ queryKey: ["users"] })
      qc.setQueriesData<UsersApiResponse>({ queryKey: ["users"] }, (old) => {
        if (!old) return old
        const optimistic: User = {
          id: `temp-${Date.now()}`,
          name: data.name || data.email || "Unknown",
          email: data.email || "",
          role: null,
          roles: [],
          tier: data.tier || "Lv0",
          currentPlanId: data.currentPlanId,
          pointsBalance: 0,
          chatQuotaUsed: 0,
          chatQuotaTotal: 0,
          registeredAt: new Date().toISOString(),
          status: data.status || "active",
        }
        return { ...old, data: [optimistic, ...old.data], total: old.total + 1 }
      })
      return { snapshots }
    },
    onError: (_err, _vars, ctx) => {
      // 失败回滚到乐观前的快照
      ctx?.snapshots.forEach(([key, snap]) => qc.setQueryData(key, snap))
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["users"] })
    },
  })

  const update = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<UserFormValues> }) => {
      await patch(`/v1/users/${id}`, formToApi(data))
    },
    onMutate: async ({ id, data }) => {
      await qc.cancelQueries({ queryKey: ["users"] })
      const snapshots = qc.getQueriesData<UsersApiResponse>({ queryKey: ["users"] })
      qc.setQueriesData<UsersApiResponse>({ queryKey: ["users"] }, (old) => {
        if (!old) return old
        return {
          ...old,
          data: old.data.map((u) =>
            u.id === id
              ? {
                  ...u,
                  name: data.name ?? u.name,
                  email: data.email ?? u.email,
                  status: data.status ?? u.status,
                  tier: data.tier ?? u.tier,
                  currentPlanId:
                    data.currentPlanId !== undefined
                      ? (data.currentPlanId ?? null)
                      : u.currentPlanId,
                }
              : u,
          ),
        }
      })
      return { snapshots }
    },
    onError: (_err, _vars, ctx) => {
      ctx?.snapshots.forEach(([key, snap]) => qc.setQueryData(key, snap))
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["users"] })
    },
  })

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await del(`/v1/users/${id}`)
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["users"] })
      const snapshots = qc.getQueriesData<UsersApiResponse>({ queryKey: ["users"] })
      qc.setQueriesData<UsersApiResponse>({ queryKey: ["users"] }, (old) => {
        if (!old) return old
        return {
          ...old,
          data: old.data.filter((u) => u.id !== id),
          total: Math.max(0, old.total - 1),
        }
      })
      return { snapshots }
    },
    onError: (_err, _vars, ctx) => {
      ctx?.snapshots.forEach(([key, snap]) => qc.setQueryData(key, snap))
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["users"] })
    },
  })

  const rawData = list.data
  const items = rawData?.data ?? []
  const pagination = readRootPagination(rawData, { pageSize: PAGE_SIZE_DEFAULT })

  return {
    items,
    pagination,
    isLoading: list.isLoading,
    error: list.error,
    refetch: list.refetch,
    createUser: create.mutateAsync,
    updateUser: (id, data) => update.mutateAsync({ id, data }),
    deleteUser: remove.mutateAsync,
  }
}