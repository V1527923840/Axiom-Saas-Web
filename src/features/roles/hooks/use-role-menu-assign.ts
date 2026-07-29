"use client"

import { useState, useCallback } from "react"
import { get, post, del } from "@/lib/api"
import type { Role, MenuTreeNode } from "../../menus/types"
import { useAuth } from "@/contexts/auth-context"

export interface CreateRoleInput {
  name: string
  code: string
  description?: string
}

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
      // The RolesController returns `{ data: RoleEntity[] }`, which the
      // global TransformResponseInterceptor passes through unchanged
      // (it treats `{ data }` as already-enveloped). The resulting wire
      // body is `{ data: Role[], message: undefined }`. Through
      // api.ts's `get<T>` typing, `response.data` IS the array (T =
      // Role[]) — not a `{ data: Role[] }` wrapper. The previous code
      // tried `get<{data:Role[]}>` and then read
      // `(response.data as {data: Role[]}).data`, which is always
      // `undefined` at runtime and produced an empty roles array.
      const response = await get<Role[]>("/v1/roles", {
        token: token || undefined,
      })
      const rolesData = Array.isArray(response.data) ? response.data : []
      setRoles(rolesData)
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
      // API returns Menu[] directly (not wrapped in { data: ... })
      // Handle both wrapped and unwrapped responses
      const rawData = response.data as unknown as { data?: MenuTreeNode[] } | MenuTreeNode[]
      let treeData: MenuTreeNode[] = []
      if (Array.isArray(rawData)) {
        treeData = rawData
      } else if (rawData && 'data' in rawData && Array.isArray(rawData.data)) {
        treeData = rawData.data
      }
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
      // API returns Menu[] directly (not wrapped in { data: ... })
      const response = await get<{ id: string }[]>(`/v1/menus/roles/${roleId}/menus`, {
        token: token || undefined,
      })
      const menusData = Array.isArray(response.data) ? response.data : []
      const menuIds = menusData.map(m => m.id)
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
      // API is /v1/menus/roles/:roleId/menus
      await post(`/v1/menus/roles/${roleId}/menus`, { menuIds }, {
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

  // POST /v1/roles — add a brand-new role. The backend returns the
  // created `RoleEntity`, which the controller wraps via the global
  // interceptor as `{ data: Role, message }`. Reading `response.data`
  // is the unwrapped entity (same shape as Role).
  const createRole = useCallback(
    async (input: CreateRoleInput): Promise<Role | null> => {
      setLoading(true)
      setError(null)
      try {
        const response = await post<Role>("/v1/roles", input, {
          token: token || undefined,
        })
        const created = response.data
        if (!created) return null
        // Optimistic local update so the new row shows up immediately
        // without a round-trip. The next full fetch will reconcile if
        // the optimistic insert drifts from the server's source of truth.
        setRoles((prev) => [...prev, created])
        return created
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to create role",
        )
        throw err
      } finally {
        setLoading(false)
      }
    },
    [token],
  )

  // DELETE /v1/roles/:id — hard delete (the role entity doesn't soft-
  // delete). On success we drop the row from local state; on failure
  // we re-throw so the caller can surface a toast and skip the
  // optimistic removal.
  const deleteRole = useCallback(
    async (roleId: string): Promise<void> => {
      setLoading(true)
      setError(null)
      try {
        await del(`/v1/roles/${roleId}`, {
          token: token || undefined,
        })
        setRoles((prev) =>
          prev.filter((r) => String(r.id) !== String(roleId)),
        )
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to delete role",
        )
        throw err
      } finally {
        setLoading(false)
      }
    },
    [token],
  )

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
    createRole,
    deleteRole,
    selectRole,
    setCheckedMenuIds,
  }
}