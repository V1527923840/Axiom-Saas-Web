// Server-side role option shape (matches GET /v1/roles wire output).
export interface RoleOption {
  id: number
  name: string
  code: string
  isSuperAdmin: boolean
}

// User status (still string from the existing /v1/users payload).
export type UserStatus = 'active' | 'inactive' | 'suspended' | 'pending'

// User tier levels (unchanged).
export type UserTier = 'Lv0' | 'Lv1' | 'Lv2' | 'Lv3'

// User entity interface
export interface User {
  id: string
  name: string
  email: string
  firstName?: string
  lastName?: string
  avatar?: string
  // Legacy single-role field. Server still returns it for backward
  // compatibility; new code should prefer `roles`.
  role?: { id: number; name: string } | null
  // Multi-role set (the new authoritative list).
  roles: RoleOption[]
  tier: UserTier
  currentPlanId?: string
  pointsBalance: number
  chatQuotaUsed: number
  chatQuotaTotal: number
  subscriptionExpiredAt?: string
  registeredAt: string
  lastLoginAt?: string
  status: UserStatus
}

// User form values for creating/editing. `roleIds` is the only role-
// related field the form manipulates; the legacy `role` is derived
// from `roleIds[0]` in the hook before send.
export interface UserFormValues {
  name: string
  email: string
  roleIds: number[]
  tier: UserTier
  status: UserStatus
  currentPlanId?: string
  // Password is only collected on create. If left blank, the hook
  // applies a default password so the user account is usable out of
  // the box (the operator can share the default with the new user,
  // who can change it later via profile / forgot-password flow).
  password?: string
}

// Default password used when the operator leaves the password field
// empty. Must satisfy the backend `@MinLength(6)` validator.
export const DEFAULT_USER_PASSWORD = "Welcome@123"

// Query params for filtering users
export interface UserQueryParams {
  page?: number
  pageSize?: number
  role?: string | number
  status?: UserStatus | string
  tier?: UserTier | string
  search?: string
}

// Pagination response
export interface UserListResponse {
  data: User[]
  total: number
  page: number
  pageSize: number
}