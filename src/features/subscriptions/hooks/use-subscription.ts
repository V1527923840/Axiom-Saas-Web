"use client"

import { useState, useCallback } from "react"
import { get, post, del } from "@/lib/api"
import type { Subscription, SubscriptionQueryParams, CurrentSubscriptionInfo } from "../types"
import { useAuth } from "@/contexts/auth-context"

export function useSubscription() {
  const { token } = useAuth()
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [currentSubscription, setCurrentSubscription] = useState<CurrentSubscriptionInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState({
    page: 0,
    pageSize: 10,
    total: 0,
  })

  const fetchSubscriptions = useCallback(async (params: SubscriptionQueryParams = {}) => {
    setLoading(true)
    setError(null)
    try {
      const page = (params.page ?? 0) + 1
      const limit = params.pageSize ?? 10
      const queryParams: Record<string, string | number> = { page, limit }

      const response = await get<{ data: Subscription[], total: number, page: number, pageSize: number }>("/v1/subscriptions", { params: queryParams, token: token ?? undefined })
      // Handle both wrapped and unwrapped response formats
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rawData = response.data as any
      const subsData = Array.isArray(rawData) ? rawData : (rawData?.data || [])
      setSubscriptions(subsData)
      setPagination({
        page: response.page ?? 1,
        pageSize: response.pageSize ?? 10,
        total: response.total ?? 0,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch subscriptions")
    } finally {
      setLoading(false)
    }
  }, [token])

  const fetchCurrentSubscription = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await get<CurrentSubscriptionInfo>("/v1/subscriptions/current", token || undefined)
      setCurrentSubscription(response.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch current subscription")
    } finally {
      setLoading(false)
    }
  }, [token])

  const subscribe = useCallback(async (planId: string, autoRenew: boolean = false) => {
    setLoading(true)
    setError(null)
    try {
      const response = await post<Subscription>("/v1/subscriptions", { planId, autoRenew }, token || undefined)
      const newSub = response.data
      setSubscriptions((prev) => [newSub, ...prev])
      return newSub
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to subscribe")
      throw err
    } finally {
      setLoading(false)
    }
  }, [token])

  const cancelSubscription = useCallback(async (subscriptionId: string) => {
    setLoading(true)
    setError(null)
    try {
      await del(`/v1/subscriptions/${subscriptionId}`, token || undefined)
      setSubscriptions((prev) =>
        prev.map((sub) =>
          sub.id === subscriptionId
            ? { ...sub, status: "cancelled" as const, updatedAt: new Date().toISOString() }
            : sub
        )
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel subscription")
      throw err
    } finally {
      setLoading(false)
    }
  }, [token])

  const upgradeSubscription = useCallback(async (newPlanId: string) => {
    setLoading(true)
    setError(null)
    try {
      const response = await post<{ success: boolean, subscription: Subscription }>("/v1/subscriptions/upgrade", { newPlanId }, token || undefined)
      return response.data
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upgrade subscription")
      throw err
    } finally {
      setLoading(false)
    }
  }, [token])

  return {
    subscriptions,
    currentSubscription,
    loading,
    error,
    pagination,
    fetchSubscriptions,
    fetchCurrentSubscription,
    subscribe,
    cancelSubscription,
    upgradeSubscription,
  }
}
