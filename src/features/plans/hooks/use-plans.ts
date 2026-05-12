"use client"

import { useState, useCallback } from "react"
import { get, post, patch, del } from "@/lib/api"
import type { Plan, PlanQueryParams } from "../types"
import type { Menu } from "@/features/menus/types"
import { useAuth } from "@/contexts/auth-context"

export function usePlans() {
  const { token } = useAuth()
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState({
    page: 0,
    pageSize: 10,
    total: 0,
  })

  const fetchPlans = useCallback(async (params: PlanQueryParams = {}) => {
    setLoading(true)
    setError(null)
    try {
      const page = (params.page ?? 0) + 1
      const limit = params.pageSize ?? 10
      const queryParams: Record<string, string | number> = { page, limit }
      if (params.cycle) queryParams.cycle = String(params.cycle)
      if (params.status) queryParams.status = String(params.status)
      if (params.tier) queryParams.tier = String(params.tier)

      const response = await get<{ data: Plan[], total: number, page: number, pageSize: number }>("/v1/plans", { params: queryParams, token: token ?? undefined })
      // Handle both wrapped and unwrapped response formats
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rawData = response.data as any
      const plansData = Array.isArray(rawData) ? rawData : (rawData?.data || [])
      setPlans(plansData)
      setPagination({
        page: response.page ?? 1,
        pageSize: response.pageSize ?? 10,
        total: response.total ?? 0,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch plans")
    } finally {
      setLoading(false)
    }
  }, [token])

  const createPlan = useCallback(async (data: Omit<Plan, "id" | "createdAt" | "updatedAt">) => {
    setLoading(true)
    setError(null)
    try {
      const response = await post<Plan>("/v1/plans", data, token || undefined)
      const newPlan = response.data
      setPlans((prev) => [newPlan, ...prev])
      return newPlan
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create plan")
      throw err
    } finally {
      setLoading(false)
    }
  }, [token])

  const updatePlan = useCallback(async (id: string, data: Partial<Plan>) => {
    setLoading(true)
    setError(null)
    try {
      const response = await patch<Plan>(`/v1/plans/${id}`, data, token || undefined)
      const updatedPlan = response.data
      setPlans((prev) =>
        prev.map((plan) => (plan.id === id ? updatedPlan : plan))
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update plan")
      throw err
    } finally {
      setLoading(false)
    }
  }, [token])

  const deletePlan = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)
    try {
      await del(`/v1/plans/${id}`, token || undefined)
      setPlans((prev) => prev.filter((plan) => plan.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete plan")
      throw err
    } finally {
      setLoading(false)
    }
  }, [token])

  const fetchPlanMenus = useCallback(async (planId: string): Promise<Menu[]> => {
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
    plans,
    loading,
    error,
    pagination,
    fetchPlans,
    createPlan,
    updatePlan,
    deletePlan,
    fetchPlanMenus,
    assignPlanMenus,
  }
}
