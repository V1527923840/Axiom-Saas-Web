"use client"

import { useState, useCallback } from "react"
import { get, post } from "@/lib/api"
import type { Menu } from "@/features/menus/types"
import { useAuth } from "@/contexts/auth-context"

export function usePlanMenus() {
  const { token } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getPlanMenus = useCallback(async (planId: string): Promise<Menu[]> => {
    setLoading(true)
    setError(null)
    try {
      const response = await get<Menu[]>(`/v1/plans/${planId}/menus`, {
        token: token || undefined,
      })
      return response.data as Menu[]
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch plan menus")
      return []
    } finally {
      setLoading(false)
    }
  }, [token])

  const assignPlanMenus = useCallback(async (planId: string, menuIds: string[]): Promise<void> => {
    setLoading(true)
    setError(null)
    try {
      await post(`/v1/plans/${planId}/menus`, { menuIds }, {
        token: token || undefined,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to assign plan menus")
      throw err
    } finally {
      setLoading(false)
    }
  }, [token])

  return {
    loading,
    error,
    getPlanMenus,
    assignPlanMenus,
  }
}
