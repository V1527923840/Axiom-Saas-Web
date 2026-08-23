/**
 * useMenus — paginated menu list + tree + create/update/delete mutations.
 *
 * Migrated to TanStack Query (mirroring skill-plaza's use-skills pattern
 * and use-users.ts).
 *  - 列表通过 useQuery 缓存,mutators 在 onSuccess/onSettled 里 invalidate。
 *  - 树形视图(`useMenuTree`)走独立 queryKey `['menus', 'tree']` —
 *    创建/更新/删除时一并 invalidate,让任何挂载的菜单树自动刷新。
 *  - flat→tree 转换下沉到 `useMenuTree` 的 `select` transformer,
 *    不再让调用方手写。
 *
 * 跨模块消费方:`plans/plans/page.tsx` 通过独立导出的 `useMenuTree()`
 * hook 直接订阅树(无需自己写 useState/useEffect 拉数据)。
 *
 * `getMenuById` 保留为 async 函数:目前没有组件以「响应式」方式读单个 menu,
 * 只是偶尔在 view 弹窗里用 `menu` props 直接拿到 — 没必要为它建一个
 * cache entry。
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { get, post, patch, del } from "@/lib/api"
import type {
  Menu,
  MenuTreeNode,
  MenuQueryParams,
  MenuFormValues,
} from "../types"
import {
  readRootPagination,
  toApiPageParams,
  extractItems,
  type InternalPagination,
} from "@/lib/paginated-response"

const PAGE_SIZE_DEFAULT = 10

export interface UseMenusResult {
  items: Menu[]
  pagination: InternalPagination
  isLoading: boolean
  error: Error | null
  refetch: () => void
  createMenu: (data: MenuFormValues) => Promise<Menu>
  updateMenu: (id: string, data: Partial<MenuFormValues>) => Promise<Menu>
  deleteMenu: (id: string) => Promise<void>
}

export interface UseMenuTreeResult {
  data: MenuTreeNode[] | undefined
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

// 后端响应形状 — 列表端点返回 { data: Menu[], total, page, pageSize }
// (infinityPagination, admin-server CLAUDE.md 格式 A)
interface MenusApiResponse {
  data: Menu[]
  total: number
  page: number
  pageSize: number
}

// 9 字段的 raw→Menu 转换。封出来方便 queryFn 用,
// 也方便 createMenu / updateMenu 共用同一个 mapping。
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformMenu(raw: any): Menu {
  return {
    id: String(raw.id),
    name: raw.name || "",
    code: raw.code || "",
    icon: raw.icon || "",
    path: raw.path || "",
    parentId: raw.parentId ?? null,
    sortOrder: raw.sortOrder ?? 0,
    status: (raw.status === "inactive" ? "inactive" : "active"),
    createdAt: raw.createdAt || "",
    updatedAt: raw.updatedAt || "",
  }
}

/**
 * flat list (with parentId) → nested tree。
 * 后端有时直返 nested tree(已经带 children),
 * 这种情况 select 直接 return rawData 避免无谓重排。
 *
 * 走 1) flat array; 2) { data: flat[] }; 3) 已经 nested 这三种 shape —
 * 跟旧 use-menus.ts 的兼容行为一致(历史 endpoint 形态变化过几次)。
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildMenuTreeFromFlat(rawData: any): MenuTreeNode[] {
  const flatMenus: Menu[] = Array.isArray(rawData)
    ? (rawData as Menu[])
    : (rawData?.data?.data || rawData?.data || [])

  const menuMap = new Map<string, MenuTreeNode>()
  const rootMenus: MenuTreeNode[] = []

  flatMenus.forEach((menu) => {
    menuMap.set(String(menu.id), { ...menu, id: String(menu.id), children: [] })
  })

  flatMenus.forEach((menu) => {
    const node = menuMap.get(String(menu.id))!
    if (menu.parentId && menuMap.has(String(menu.parentId))) {
      const parent = menuMap.get(String(menu.parentId))!
      parent.children!.push(node)
    } else {
      rootMenus.push(node)
    }
  })

  return rootMenus
}

export function useMenus(params: MenuQueryParams = {}): UseMenusResult {
  const qc = useQueryClient()

  const list = useQuery({
    queryKey: ["menus", params] as const,
    queryFn: async (): Promise<MenusApiResponse> => {
      const { page, pageSize } = toApiPageParams(params, {
        pageSize: PAGE_SIZE_DEFAULT,
      })
      const queryParams: Record<string, string | number> = { page, pageSize }
      if (params.status) queryParams.status = String(params.status)
      if (params.search) queryParams.search = params.search
      const res = await get<MenusApiResponse>("/v1/menus", { params: queryParams })
      const rawData = res.data as unknown
      const items = extractItems<Menu>(rawData).map(transformMenu)
      const wrapped: MenusApiResponse = Array.isArray(rawData)
        ? { data: items, total: items.length, page: 1, pageSize: PAGE_SIZE_DEFAULT }
        : { ...(rawData as MenusApiResponse), data: items }
      return wrapped
    },
    staleTime: 30_000,
  })

  const create = useMutation({
    mutationFn: async (data: MenuFormValues): Promise<Menu> => {
      const res = await post<unknown>("/v1/menus", data)
      // 后端可能直接返 Menu,也可能返 { data: Menu }
      const raw = res.data as unknown
      const inner = Array.isArray(raw) ? raw[0] : (raw as { data?: unknown })?.data ?? raw
      return transformMenu(inner)
    },
    // ★ 乐观更新:把新 menu 塞到列表末尾(append,不是 prepend —
    // 菜单的展示顺序由 sortOrder 控制,新菜单默认 sortOrder=0
    // prepend 会顶到第一位造成视觉跳变)。
    onMutate: async (data) => {
      await qc.cancelQueries({ queryKey: ["menus"] })
      const snapshots = qc.getQueriesData<MenusApiResponse>({ queryKey: ["menus"] })
      qc.setQueriesData<MenusApiResponse>({ queryKey: ["menus"] }, (old) => {
        if (!old) return old
        const optimistic: Menu = {
          id: `temp-${Date.now()}`,
          name: data.name,
          code: data.code,
          icon: data.icon,
          path: data.path,
          parentId: data.parentId ?? null,
          sortOrder: data.sortOrder ?? 0,
          status: data.status,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        return { ...old, data: [...old.data, optimistic], total: old.total + 1 }
      })
      return { snapshots }
    },
    onError: (_err, _vars, ctx) => {
      ctx?.snapshots.forEach(([key, snap]) => qc.setQueryData(key, snap))
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["menus"] })
      // 树形视图独立 invalidate,确保 plans / menus 页面里的 menuTree 立刻刷新
      qc.invalidateQueries({ queryKey: ["menus", "tree"] })
    },
  })

  const update = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<MenuFormValues> }) => {
      const res = await patch<unknown>(`/v1/menus/${id}`, data)
      const raw = res.data as unknown
      const inner = Array.isArray(raw) ? raw[0] : (raw as { data?: unknown })?.data ?? raw
      return transformMenu(inner)
    },
    onMutate: async ({ id, data }) => {
      await qc.cancelQueries({ queryKey: ["menus"] })
      const snapshots = qc.getQueriesData<MenusApiResponse>({ queryKey: ["menus"] })
      qc.setQueriesData<MenusApiResponse>({ queryKey: ["menus"] }, (old) => {
        if (!old) return old
        return {
          ...old,
          data: old.data.map((m) =>
            m.id === id
              ? {
                  ...m,
                  name: data.name ?? m.name,
                  code: data.code ?? m.code,
                  icon: data.icon ?? m.icon,
                  path: data.path ?? m.path,
                  parentId: data.parentId !== undefined ? data.parentId : m.parentId,
                  sortOrder: data.sortOrder ?? m.sortOrder,
                  status: data.status ?? m.status,
                }
              : m,
          ),
        }
      })
      return { snapshots }
    },
    onError: (_err, _vars, ctx) => {
      ctx?.snapshots.forEach(([key, snap]) => qc.setQueryData(key, snap))
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["menus"] })
      qc.invalidateQueries({ queryKey: ["menus", "tree"] })
    },
  })

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await del(`/v1/menus/${id}`)
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["menus"] })
      const snapshots = qc.getQueriesData<MenusApiResponse>({ queryKey: ["menus"] })
      qc.setQueriesData<MenusApiResponse>({ queryKey: ["menus"] }, (old) => {
        if (!old) return old
        return {
          ...old,
          data: old.data.filter((m) => m.id !== id),
          total: Math.max(0, old.total - 1),
        }
      })
      return { snapshots }
    },
    onError: (_err, _vars, ctx) => {
      ctx?.snapshots.forEach(([key, snap]) => qc.setQueryData(key, snap))
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["menus"] })
      qc.invalidateQueries({ queryKey: ["menus", "tree"] })
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
    createMenu: create.mutateAsync,
    updateMenu: (id, data) => update.mutateAsync({ id, data }),
    deleteMenu: remove.mutateAsync,
  }
}

/**
 * 菜单树 hook — 跨模块消费方(`plans/plans/page.tsx`)用这个,
 * 不需要再自己写 useState/useEffect 拉数据。
 *
 * 重要: queryKey 跟 list queryKey `['menus', params]` **互不相交**,
 * 树形数据走 `['menus', 'tree']`,让 mutators 可以精准 invalidate
 * 其中一个而不影响另一个。
 *
 * select 兼顾两种后端返回:
 *   1. 已 nested(数组里直接有 children)→ 直接 return
 *   2. 平铺 flat list(带 parentId)→ 走 buildMenuTreeFromFlat
 */
export function useMenuTree(): UseMenuTreeResult {
  const tree = useQuery({
    queryKey: ["menus", "tree"] as const,
    queryFn: async (): Promise<MenuTreeNode[]> => {
      const res = await get<unknown>("/v1/menus/tree")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rawData = res.data as any
      const isNestedTree =
        Array.isArray(rawData) && rawData.length > 0 && "children" in rawData[0]
      if (isNestedTree) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (rawData as any[]).map((m) => ({
          ...m,
          id: String(m.id),
          parentId: m.parentId ?? null,
          children: Array.isArray(m.children) ? m.children : [],
        })) as MenuTreeNode[]
      }
      return buildMenuTreeFromFlat(rawData)
    },
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
 * 按 id 取单个 menu — 保留为 async 函数,不进 cache。
 * 当前 view 弹窗已经通过 props 拿到 menu 数据,
 * 没有响应式 use case;一旦未来出现「打开 dialog 时按 id 拉详情」,
 * 可以再升级成 `useQuery({ queryKey: ['menu', id], enabled: !!id })`。
 */
export async function getMenuById(id: string): Promise<Menu | null> {
  try {
    const res = await get<unknown>(`/v1/menus/${id}`)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = res.data as any
    const inner = Array.isArray(raw) ? raw[0] : (raw as { data?: unknown })?.data ?? raw
    if (!inner) return null
    return transformMenu(inner)
  } catch {
    return null
  }
}
