/**
 * useRoles — read-only role list for the role multi-select in user-form.tsx
 * 和 role badge 渲染。
 *
 * 走 TanStack Query,跟 use-users / use-plans 的迁移对齐。
 * 排序(super_admin 优先 + name asc)在 queryFn 里做完,
 * 缓存里直接放排序后的数组。
 */
import { useQuery } from "@tanstack/react-query"
import { get } from "@/lib/api"
import type { RoleOption } from "../types"

export function useRoles() {
  return useQuery<RoleOption[]>({
    queryKey: ["roles"],
    queryFn: async () => {
      const res = await get<RoleOption[]>("/v1/roles")
      const data = Array.isArray(res.data) ? res.data : []
      return [...data].sort((a, b) => {
        if (a.isSuperAdmin !== b.isSuperAdmin) return a.isSuperAdmin ? -1 : 1
        return a.name.localeCompare(b.name)
      })
    },
    staleTime: 30_000,
  })
}