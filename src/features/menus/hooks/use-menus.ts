"use client"

import { useState, useCallback } from "react"
import { get, post, patch, del } from "@/lib/api"
import type { Menu, MenuTreeNode, MenuQueryParams, MenuListResponse, MenuFormValues } from "../types"
import { useAuth } from "@/contexts/auth-context"

export function useMenus() {
  const { token } = useAuth()
  const [menus, setMenus] = useState<Menu[]>([])
  const [menuTree, setMenuTree] = useState<MenuTreeNode[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState({
    page: 0,
    pageSize: 10,
    total: 0,
  })

  const fetchMenus = useCallback(async (params: MenuQueryParams = {}) => {
    setLoading(true)
    setError(null)
    try {
      const page = (params.page ?? 0) + 1
      const limit = params.pageSize ?? 10
      const queryParams: Record<string, string | number> = { page, limit }

      if (params.status) queryParams.status = params.status
      if (params.search) queryParams.search = params.search

      const response = await get<MenuListResponse>("/v1/menus", {
        params: queryParams,
        token: token || undefined,
      })

      const responseData = response.data as MenuListResponse
      const menusData = responseData?.data ?? []

      const transformedMenus: Menu[] = menusData.map((menu: Menu) => ({
        id: String(menu.id),
        name: menu.name || '',
        code: menu.code || '',
        icon: menu.icon || '',
        path: menu.path || '',
        parentId: menu.parentId ?? null,
        sortOrder: menu.sortOrder ?? 0,
        status: menu.status || 'active',
        createdAt: menu.createdAt || '',
        updatedAt: menu.updatedAt || '',
      }))

      setMenus(transformedMenus)
      setPagination({
        page: response.page ?? 1,
        pageSize: response.pageSize ?? 10,
        total: response.total ?? 0,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch menus")
    } finally {
      setLoading(false)
    }
  }, [token])

  const fetchMenuTree = useCallback(async (): Promise<MenuTreeNode[]> => {
    setLoading(true)
    setError(null)
    try {
      const response = await get<Menu[]>("/v1/menus/tree", {
        token: token || undefined,
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rawData = response.data as any
      const flatMenus: Menu[] = Array.isArray(rawData)
        ? rawData
        : (rawData?.data?.data || rawData?.data || [])

      // Build tree from flat list
      const menuMap = new Map<string, MenuTreeNode>()
      const rootMenus: MenuTreeNode[] = []

      flatMenus.forEach(menu => {
        menuMap.set(menu.id, { ...menu, children: [] })
      })

      flatMenus.forEach(menu => {
        const node = menuMap.get(menu.id)!
        if (menu.parentId && menuMap.has(menu.parentId)) {
          const parent = menuMap.get(menu.parentId)!
          parent.children!.push(node)
        } else {
          rootMenus.push(node)
        }
      })

      setMenuTree(rootMenus)
      return rootMenus
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch menu tree")
      return []
    } finally {
      setLoading(false)
    }
  }, [token])

  const getMenuById = useCallback(async (id: string): Promise<Menu | null> => {
    setLoading(true)
    setError(null)
    try {
      const response = await get<Menu>(`/v1/menus/${id}`, {
        token: token || undefined,
      })
      return response.data as Menu
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch menu detail")
      return null
    } finally {
      setLoading(false)
    }
  }, [token])

  const createMenu = useCallback(async (data: MenuFormValues): Promise<Menu | null> => {
    setLoading(true)
    setError(null)
    try {
      const response = await post<Menu>("/v1/menus", data, {
        token: token || undefined,
      })
      const newMenu = response.data as Menu
      setMenus((prev) => [...prev, newMenu])
      return newMenu
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create menu")
      throw err
    } finally {
      setLoading(false)
    }
  }, [token])

  const updateMenu = useCallback(async (id: string, data: Partial<MenuFormValues>): Promise<Menu | null> => {
    setLoading(true)
    setError(null)
    try {
      const response = await patch<Menu>(`/v1/menus/${id}`, data, {
        token: token || undefined,
      })
      const updatedMenu = response.data as Menu
      setMenus((prev) =>
        prev.map((menu) => (menu.id === id ? updatedMenu : menu))
      )
      return updatedMenu
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update menu")
      throw err
    } finally {
      setLoading(false)
    }
  }, [token])

  const deleteMenu = useCallback(async (id: string): Promise<void> => {
    setLoading(true)
    setError(null)
    try {
      await del(`/v1/menus/${id}`, {
        token: token || undefined,
      })
      setMenus((prev) => prev.filter((menu) => menu.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete menu")
      throw err
    } finally {
      setLoading(false)
    }
  }, [token])

  return {
    menus,
    menuTree,
    loading,
    error,
    pagination,
    fetchMenus,
    fetchMenuTree,
    getMenuById,
    createMenu,
    updateMenu,
    deleteMenu,
  }
}