"use client"

import { useState, useCallback } from "react"
import { get, post, patch, del } from "@/lib/api"
import type { User, UserQueryParams } from "../types"
import { useAuth } from "@/contexts/auth-context"

export function useUsers() {
  const { token } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState({
    page: 0,
    pageSize: 10,
    total: 0,
  })

  const fetchUsers = useCallback(async (params: UserQueryParams = {}) => {
    setLoading(true)
    setError(null)
    try {
      const page = (params.page ?? 0) + 1 // Backend expects page starting from 1
      const limit = params.pageSize ?? 10
      const queryParams: Record<string, string | number> = { page, limit }
      if (params.role) queryParams.role = String(params.role)
      if (params.status) queryParams.status = String(params.status)
      if (params.tier) queryParams.tier = String(params.tier)
      if (params.search) queryParams.search = params.search

      const response = await get<{ data: User[], total: number, page: number, pageSize: number }>("/v1/users", { params: queryParams, token: token ?? undefined })
      // Transform API data to match frontend User type
      // API returns { data: [...], total, page, pageSize } but ApiResponse wraps it as { data: { data: [...], total, page, pageSize }, ... }
      // So we need to check if response.data.data exists (wrapped) or response.data is the array itself
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rawData = response.data as any
      const usersData = Array.isArray(rawData) ? rawData : (rawData?.data || [])
      // Fully transform to ensure no TypeORM entity objects remain
      const transformedUsers: User[] = usersData.map((user: any) => ({
        id: String(user.id),
        name: `${user.firstName || ''}${user.lastName || ''}`.trim() || user.email || 'Unknown',
        email: user.email || '',
        avatar: user.avatar,
        role: (typeof user.role === 'string' ? user.role : user.role?.name?.toLowerCase()) as User['role'] || 'user',
        tier: user.tier || 'Lv0',
        currentPlanId: user.currentPlanId,
        pointsBalance: user.pointsBalance || 0,
        chatQuotaUsed: user.chatQuotaUsed || 0,
        chatQuotaTotal: user.chatQuotaTotal || 0,
        subscriptionExpiredAt: user.subscriptionExpiredAt,
        registeredAt: user.registeredAt || '',
        lastLoginAt: user.lastLoginAt,
        status: (typeof user.status === 'string' ? user.status : user.status?.name?.toLowerCase()) as User['status'] || 'active',
      }))
      setUsers(transformedUsers)
      // Pagination info is at response root level, not response.data
      setPagination({
        page: response.page ?? 1,
        pageSize: response.pageSize ?? 10,
        total: response.total ?? 0,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch users")
    } finally {
      setLoading(false)
    }
  }, [token])

  const createUser = useCallback(async (data: Omit<User, "id">) => {
    setLoading(true)
    setError(null)
    try {
      // Transform frontend data to API format
      const apiData = {
        email: data.email,
        firstName: data.name.split(' ')[0] || data.name,
        lastName: data.name.split(' ').slice(1).join(' ') || '',
        role: { id: data.role === 'super_admin' ? 0 : data.role === 'admin' ? 1 : 2 },
        status: { id: data.status === 'active' ? 1 : data.status === 'inactive' ? 2 : 3 },
        tier: data.tier,
        currentPlanId: data.currentPlanId || null,
      }
      const response = await post<User>("/v1/users", apiData, token || undefined)
      // Transform response to frontend format
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rawData = response.data as any
      const newUser: User = {
        id: String(rawData.id),
        name: `${rawData.firstName || ''}${rawData.lastName || ''}`.trim() || rawData.email || 'Unknown',
        email: rawData.email || '',
        role: (typeof rawData.role === 'string' ? rawData.role : rawData.role?.name?.toLowerCase()) as User['role'] || 'user',
        tier: rawData.tier || 'Lv0',
        currentPlanId: rawData.currentPlanId,
        status: (typeof rawData.status === 'string' ? rawData.status : rawData.status?.name?.toLowerCase()) as User['status'] || 'active',
        pointsBalance: rawData.pointsBalance || 0,
        chatQuotaUsed: rawData.chatQuotaUsed || 0,
        chatQuotaTotal: rawData.chatQuotaTotal || 0,
        registeredAt: rawData.registeredAt || '',
        lastLoginAt: rawData.lastLoginAt,
      }
      setUsers((prev) => [newUser, ...prev])
      return newUser
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create user")
      throw err
    } finally {
      setLoading(false)
    }
  }, [token])

  const updateUser = useCallback(async (id: string, data: Partial<User>) => {
    setLoading(true)
    setError(null)
    try {
      // Transform frontend data to API format
      const apiData: Record<string, unknown> = {}
      if (data.name) {
        apiData.firstName = data.name.split(' ')[0] || data.name
        apiData.lastName = data.name.split(' ').slice(1).join(' ') || ''
      }
      if (data.role) {
        apiData.role = { id: data.role === 'super_admin' ? 0 : data.role === 'admin' ? 1 : 2 }
      }
      if (data.status) {
        apiData.status = { id: data.status === 'active' ? 1 : data.status === 'inactive' ? 2 : 3 }
      }
      if (data.tier) {
        apiData.tier = data.tier
      }
      if (data.currentPlanId !== undefined) {
        apiData.currentPlanId = data.currentPlanId || null
      }
      const response = await patch<User>(`/v1/users/${id}`, apiData, token || undefined)
      // Transform response to frontend format
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rawData = response.data as any
      const updatedUser: User = {
        id: String(rawData.id),
        name: `${rawData.firstName || ''}${rawData.lastName || ''}`.trim() || rawData.email || 'Unknown',
        email: rawData.email || '',
        role: (typeof rawData.role === 'string' ? rawData.role : rawData.role?.name?.toLowerCase()) as User['role'] || 'user',
        tier: rawData.tier || 'Lv0',
        currentPlanId: rawData.currentPlanId,
        status: (typeof rawData.status === 'string' ? rawData.status : rawData.status?.name?.toLowerCase()) as User['status'] || 'active',
        pointsBalance: rawData.pointsBalance || 0,
        chatQuotaUsed: rawData.chatQuotaUsed || 0,
        chatQuotaTotal: rawData.chatQuotaTotal || 0,
        registeredAt: rawData.registeredAt || '',
        lastLoginAt: rawData.lastLoginAt,
      }
      setUsers((prev) =>
        prev.map((user) => (user.id === id ? updatedUser : user))
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update user")
      throw err
    } finally {
      setLoading(false)
    }
  }, [token])

  const deleteUser = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)
    try {
      // API expects number id
      await del(`/v1/users/${id}`, token || undefined)
      setUsers((prev) => prev.filter((user) => user.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete user")
      throw err
    } finally {
      setLoading(false)
    }
  }, [token])

  return {
    users,
    loading,
    error,
    pagination,
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,
  }
}