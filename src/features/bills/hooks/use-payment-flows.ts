"use client"

import { useState, useCallback } from "react"
import { get } from "@/lib/api"
import type { PaymentFlow, PaymentFlowQueryParams, PaymentFlowListResponse } from "../types"
import { useAuth } from "@/contexts/auth-context"

export function usePaymentFlows() {
  const { token } = useAuth()
  const [flows, setFlows] = useState<PaymentFlow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState({
    page: 0,
    pageSize: 10,
    total: 0,
  })

  const fetchFlows = useCallback(async (params: PaymentFlowQueryParams = {}) => {
    setLoading(true)
    setError(null)
    try {
      const page = (params.page ?? 0) + 1
      const limit = params.pageSize ?? 10
      const queryParams: Record<string, string | number> = { page, limit }

      if (params.dateFrom) queryParams.dateFrom = params.dateFrom
      if (params.dateTo) queryParams.dateTo = params.dateTo
      if (params.userSearch) queryParams.userSearch = params.userSearch
      if (params.type) queryParams.type = params.type
      if (params.paymentMethod) queryParams.paymentMethod = params.paymentMethod
      if (params.status) queryParams.status = params.status

      const response = await get<PaymentFlowListResponse>("/v1/bills/flows", {
        params: queryParams,
        token: token || undefined,
      })

      // API returns {data: [...], total, page, pageSize} but response.data might be the raw array
      // or the data structure needs to be extracted correctly
      const responseData = response.data as any
      // Handle both array response and object with data property
      const flowsData = Array.isArray(responseData)
        ? responseData
        : (responseData?.data ?? [])

      const transformedFlows: PaymentFlow[] = flowsData.map((flow: PaymentFlow) => ({
        id: String(flow.id),
        orderNo: flow.orderNo || '',
        userId: flow.userId || 0,
        userName: flow.userName || '',
        userEmail: flow.userEmail || '',
        type: flow.type || 'recharge',
        paymentMethod: flow.paymentMethod || 'other',
        amount: flow.amount || 0,
        points: flow.points || 0,
        status: flow.status || 'pending',
        metadata: flow.metadata,
        createdAt: flow.createdAt || '',
        updatedAt: flow.updatedAt || '',
        completedAt: flow.completedAt,
      }))

      setFlows(transformedFlows)
      // Extract pagination info - could be at root level or nested
      const responseAny = response as any
      setPagination({
        page: responseAny.page ?? responseAny.data?.page ?? 1,
        pageSize: responseAny.pageSize ?? responseAny.data?.pageSize ?? 10,
        total: responseAny.total ?? responseAny.data?.total ?? 0,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch flows")
    } finally {
      setLoading(false)
    }
  }, [token])

  const getFlowById = useCallback(async (id: string): Promise<PaymentFlow | null> => {
    setLoading(true)
    setError(null)
    try {
      const response = await get<PaymentFlow>(`/v1/bills/flows/${id}`, {
        token: token || undefined,
      })
      return response.data as PaymentFlow
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch flow detail")
      return null
    } finally {
      setLoading(false)
    }
  }, [token])

  return {
    flows,
    loading,
    error,
    pagination,
    fetchFlows,
    getFlowById,
  }
}