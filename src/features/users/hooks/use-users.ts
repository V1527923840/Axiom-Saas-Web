"use client"

import { useState, useCallback } from "react"
import { get, post, patch, del } from "@/lib/api"
import type { User, UserQueryParams } from "../types"
import { DEFAULT_USER_PASSWORD } from "../types"
import { useAuth } from "@/contexts/auth-context"
import { useRoles } from "./use-roles"

export function useUsers() {
  const { token } = useAuth()
  const { fetchRoles } = useRoles()
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
        role: (typeof user.role === 'string'
          ? user.role
          : user.role?.name ?? null) as User['role'] ?? null,
        roles: Array.isArray(user.roles) ? user.roles : [],
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
        page: response.meta?.page ?? 1,
        pageSize: response.meta?.pageSize ?? 10,
        total: response.meta?.total ?? 0,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch users")
    } finally {
      setLoading(false)
    }
  }, [token])

  const createUser = useCallback(async (data: Omit<User, "id"> & { password?: string; roleIds?: number[] }) => {
    setLoading(true)
    setError(null)
    try {
      // Split a single "name" (nickname/display name) into firstName / lastName.
      // - Multiple whitespace-separated words: first word → firstName, remainder → lastName.
      // - Single word (e.g. Chinese names like "公开测试", or single tokens):
      //   whole name → firstName, lastName stays empty.
      // This avoids sending an empty lastName for names without spaces.
      const nameParts = (data.name ?? "").trim().split(/\s+/).filter(Boolean)
      const apiData = {
        email: data.email,
        firstName: nameParts[0] ?? data.name,
        lastName: nameParts.slice(1).join(" "),
        // If the operator left the password field blank, fall back to the
        // shared default so the user can actually log in. The backend
        // hashes whatever string it receives.
        password: data.password?.trim() || DEFAULT_USER_PASSWORD,
        roleIds: data.roleIds ?? [],
        status: { id: data.status === "active" ? 1 : data.status === "inactive" ? 2 : 3 },
        tier: data.tier,
        currentPlanId: data.currentPlanId || null,
      }
      const response = await post<User>("/v1/users", apiData, { token: token ?? undefined })
      // Transform response to frontend format
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rawData = response.data as any
      const newUser: User = {
        id: String(rawData.id),
        name: `${rawData.firstName || ''}${rawData.lastName || ''}`.trim() || rawData.email || 'Unknown',
        email: rawData.email || '',
        role: rawData.role ?? null,
        roles: Array.isArray(rawData.roles) ? rawData.roles : [],
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

  const updateUser = useCallback(async (id: string, data: Partial<User> & { password?: string; roleIds?: number[] }) => {
    setLoading(true)
    setError(null)
    try {
      // Transform frontend data to API format
      const apiData: Record<string, unknown> = {}
      if (data.name) {
        // Mirror the splitting logic used in createUser so update + create stay consistent.
        const nameParts = data.name.trim().split(/\s+/).filter(Boolean)
        apiData.firstName = nameParts[0] ?? data.name
        apiData.lastName = nameParts.slice(1).join(" ")
      }
      // Forward email edits — without this branch the operator can change
      // the email input in the form but the change is silently dropped
      // before the PATCH leaves the browser, making the field appear
      // "un-editable".
      if (data.email !== undefined) {
        apiData.email = data.email
      }
      if (data.roleIds !== undefined) {
        apiData.roleIds = data.roleIds
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
      // Forward a password reset if the caller supplied one. Empty string
      // is treated as "reset to default password" — same fallback rule
      // createUser uses, so admins can hand the account back to the user
      // without having to type the literal default.
      if (data.password !== undefined) {
        apiData.password = data.password.trim() || DEFAULT_USER_PASSWORD
      }
      const response = await patch<User>(`/v1/users/${id}`, apiData, { token: token ?? undefined })
      // Transform response to frontend format
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rawData = response.data as any
      const updatedUser: User = {
        id: String(rawData.id),
        name: `${rawData.firstName || ''}${rawData.lastName || ''}`.trim() || rawData.email || 'Unknown',
        email: rawData.email || '',
        role: rawData.role ?? null,
        roles: Array.isArray(rawData.roles) ? rawData.roles : [],
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
      await del(`/v1/users/${id}`, { token: token ?? undefined })
      setUsers((prev) => prev.filter((user) => user.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete user")
      throw err
    } finally {
      setLoading(false)
    }
  }, [token])

  const fetchUserMenus = useCallback(async (userId: string): Promise<string[]> => {
    try {
      const response = await get<{ id: string }[]>(`/v1/users/${userId}/extra-menus`, {
        token: token || undefined,
      })
      const menusData = Array.isArray(response.data) ? response.data : []
      return menusData.map((m: { id: string }) => m.id)
    } catch (err) {
      console.error("Failed to fetch user menus:", err)
      return []
    }
  }, [token])

  const assignMenusToUser = useCallback(async (userId: string, menuIds: string[]): Promise<void> => {
    setLoading(true)
    setError(null)
    try {
      await post(`/v1/users/${userId}/extra-menus`, { menuIds }, {
        token: token || undefined,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to assign menus")
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
    fetchUserMenus,
    assignMenusToUser,
    fetchRoles,
  }
}
