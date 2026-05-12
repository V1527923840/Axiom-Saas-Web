"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"
import { get } from "@/lib/api"
import type { Menu, MenuTreeNode } from "@/features/menus/types"
import { useAuth } from "@/contexts/auth-context"

interface MenuContextType {
  menus: MenuTreeNode[]
  loading: boolean
  error: string | null
  fetchMenus: () => Promise<void>
  fetchMenuTree: () => Promise<MenuTreeNode[]>
}

const MenuContext = createContext<MenuContextType | undefined>(undefined)

export function MenuProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth()
  const [menus, setMenus] = useState<MenuTreeNode[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchMenus = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await get<Menu[]>("/v1/menus", {
        token: token || undefined,
      })
      // Transform flat menus to tree
      const menusData = (response.data as any)?.data ?? response.data ?? []
      const tree = buildMenuTree(menusData)
      setMenus(tree)
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
      // Get menus for current user's role from /v1/menus/my endpoint
      const response = await get<MenuTreeNode[]>("/v1/menus/my", {
        token: token || undefined,
      })
      const treeData = response.data as MenuTreeNode[]
      setMenus(treeData)
      return treeData
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch menu tree")
      return []
    } finally {
      setLoading(false)
    }
  }, [token])

  return (
    <MenuContext.Provider value={{ menus, loading, error, fetchMenus, fetchMenuTree }}>
      {children}
    </MenuContext.Provider>
  )
}

export function useMenusContext() {
  const context = useContext(MenuContext)
  if (context === undefined) {
    throw new Error("useMenusContext must be used within a MenuProvider")
  }
  return context
}

// Helper function to build tree from flat menu list
function buildMenuTree(menus: Menu[]): MenuTreeNode[] {
  const menuMap = new Map<string, MenuTreeNode>()
  const roots: MenuTreeNode[] = []

  // First pass: create MenuTreeNode for each menu
  menus.forEach((menu) => {
    menuMap.set(menu.id, { ...menu, children: [] })
  })

  // Second pass: build tree structure
  menus.forEach((menu) => {
    const node = menuMap.get(menu.id)!
    if (menu.parentId && menuMap.has(menu.parentId)) {
      const parent = menuMap.get(menu.parentId)!
      parent.children.push(node)
    } else {
      roots.push(node)
    }
  })

  return roots
}
