"use client"

import { useState, useCallback } from "react"
import { get, post } from "@/lib/api"
import type { Role, MenuTreeNode } from "../types"
import { useAuth } from "@/contexts/auth-context"

export function useRoleMenuAssign() {
  const { token } = useAuth()
  const [roles, setRoles] = useState<Role[]>([])
  const [selectedRoleId, setSelectedRoleId] = useState<string | undefined>()
  const [menuTree, setMenuTree] = useState<MenuTreeNode[]>([])
  const [checkedMenuIds, setCheckedMenuIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchRoles = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await get<Role[]>("/v1/roles", {
        token: token || undefined,
      })
      setRoles(response.data as Role[])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch roles")
    } finally {
      setLoading(false)
    }
  }, [token])

  const fetchMenuTree = useCallback(async (): Promise<MenuTreeNode[]> => {
    setLoading(true)
    setError(null)
    try {
      const response = await get<MenuTreeNode[]>("/v1/menus/tree", {
        token: token || undefined,
      })
      const treeData = response.data as MenuTreeNode[]
      setMenuTree(treeData)
      return treeData
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch menu tree")
      return []
    } finally {
      setLoading(false)
    }
  }, [token])

  const fetchRoleMenus = useCallback(async (roleId: string): Promise<string[]> => {
    setLoading(true)
    setError(null)
    try {
      const response = await get<string[]>(`/v1/roles/${roleId}/menus`, {
        token: token || undefined,
      })
      const menuIds = response.data as string[]
      setCheckedMenuIds(menuIds)
      return menuIds
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch role menus")
      return []
    } finally {
      setLoading(false)
    }
  }, [token])

  const saveRoleMenus = useCallback(async (roleId: string, menuIds: string[]): Promise<void> => {
    setSaving(true)
    setError(null)
    try {
      await post(`/v1/roles/${roleId}/menus`, { menuIds }, {
        token: token || undefined,
      })
      setCheckedMenuIds(menuIds)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save role menus")
      throw err
    } finally {
      setSaving(false)
    }
  }, [token])

  const selectRole = useCallback((roleId: string) => {
    setSelectedRoleId(roleId)
  }, [])

  return {
    roles,
    selectedRoleId,
    menuTree,
    checkedMenuIds,
    loading,
    saving,
    error,
    fetchRoles,
    fetchMenuTree,
    fetchRoleMenus,
    saveRoleMenus,
    selectRole,
    setCheckedMenuIds,
  }
}