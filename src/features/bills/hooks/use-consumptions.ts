"use client"

import { useState, useCallback } from "react"
import { get } from "@/lib/api"
import type { Consumption, ConsumptionQueryParams, ConsumptionListResponse } from "../types"
import { useAuth } from "@/contexts/auth-context"

export function useConsumptions() {
  const { token } = useAuth()
  const [consumptions, setConsumptions] = useState<Consumption[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState({
    page: 0,
    pageSize: 10,
    total: 0,
  })

  const fetchConsumptions = useCallback(async (params: ConsumptionQueryParams = {}) => {
    setLoading(true)
    setError(null)
    try {
      const page = (params.page ?? 0) + 1
      const limit = params.pageSize ?? 10
      const queryParams: Record<string, string | number> = { page, limit }

      if (params.dateFrom) queryParams.dateFrom = params.dateFrom
      if (params.dateTo) queryParams.dateTo = params.dateTo
      if (params.userSearch) queryParams.userSearch = params.userSearch
      if (params.consumeType) queryParams.consumeType = params.consumeType

      const response = await get<ConsumptionListResponse>("/v1/bills/consumptions", {
        params: queryParams,
        token: token || undefined,
      })

      // API returns {data: [...], total, page, pageSize} but response.data might be the raw array
      // or the data structure needs to be extracted correctly
      const responseData = response.data as any
      // Handle both array response and object with data property
      const consumptionsData = Array.isArray(responseData)
        ? responseData
        : (responseData?.data ?? [])

      const transformedConsumptions: Consumption[] = consumptionsData.map((c: Consumption) => ({
        id: String(c.id),
        userId: c.userId || 0,
        userName: c.userName || '',
        userEmail: c.userEmail || '',
        consumeType: c.consumeType || 'other',
        points: c.points || 0,
        balance: c.balance || 0,
        businessId: c.businessId ?? null,
        businessType: c.businessType ?? null,
        description: c.description ?? null,
        createdAt: c.createdAt || '',
        updatedAt: c.updatedAt || '',
      }))

      setConsumptions(transformedConsumptions)
      // Extract pagination info - could be at root level or nested
      const responseAny = response as any
      setPagination({
        page: responseAny.page ?? responseAny.data?.page ?? 1,
        pageSize: responseAny.pageSize ?? responseAny.data?.pageSize ?? 10,
        total: responseAny.total ?? responseAny.data?.total ?? 0,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch consumptions")
    } finally {
      setLoading(false)
    }
  }, [token])

  const getConsumptionById = useCallback(async (id: string): Promise<Consumption | null> => {
    setLoading(true)
    setError(null)
    try {
      const response = await get<Consumption>(`/v1/bills/consumptions/${id}`, {
        token: token || undefined,
      })
      return response.data as Consumption
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch consumption detail")
      return null
    } finally {
      setLoading(false)
    }
  }, [token])

  return {
    consumptions,
    loading,
    error,
    pagination,
    fetchConsumptions,
    getConsumptionById,
  }
}