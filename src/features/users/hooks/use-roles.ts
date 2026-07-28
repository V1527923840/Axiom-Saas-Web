"use client"

import { useState, useCallback } from "react"
import { get } from "@/lib/api"
import { useAuth } from "@/contexts/auth-context"
import type { RoleOption } from "../types"

/**
 * Read-only hook for the role management list. Used by `user-form.tsx`
 * to populate the role multi-select and by `users-columns.tsx` to
 * render badge variants. Lives independently of `useRoleMenuAssign`
 * (which mutates the list) to avoid mixing concerns.
 */
export function useRoles() {
  const { token } = useAuth()
  const [roles, setRoles] = useState<RoleOption[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchRoles = useCallback(async (): Promise<RoleOption[]> => {
    setLoading(true)
    setError(null)
    try {
      const response = await get<RoleOption[]>("/v1/roles", {
        token: token ?? undefined,
      })
      const data = Array.isArray(response.data) ? response.data : []
      // Sort super admin first, then by name asc.
      const sorted = [...data].sort((a, b) => {
        if (a.isSuperAdmin !== b.isSuperAdmin) return a.isSuperAdmin ? -1 : 1
        return a.name.localeCompare(b.name)
      })
      setRoles(sorted)
      return sorted
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch roles"
      setError(message)
      return []
    } finally {
      setLoading(false)
    }
  }, [token])

  return { roles, loading, error, fetchRoles }
}
