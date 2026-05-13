"use client"

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react"
import { get } from "@/lib/api"
import type { MenuTreeNode } from "@/features/menus/types"
import { useAuth } from "@/contexts/auth-context"

interface MenuContextType {
  menus: MenuTreeNode[]
  loading: boolean
  error: string | null
  fetchMenuTree: () => Promise<MenuTreeNode[]>
}

const MenuContext = createContext<MenuContextType | undefined>(undefined)

export function MenuProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth()
  const [menus, setMenus] = useState<MenuTreeNode[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchMenuTree = useCallback(async (): Promise<MenuTreeNode[]> => {
    setLoading(true)
    setError(null)
    try {
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

  // Fetch menus when token changes (login/logout)
  useEffect(() => {
    if (token) {
      fetchMenuTree()
    } else {
      // Clear menus on logout
      setMenus([])
    }
  }, [token, fetchMenuTree])

  return (
    <MenuContext.Provider value={{ menus, loading, error, fetchMenuTree }}>
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
