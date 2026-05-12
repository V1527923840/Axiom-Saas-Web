// User roles
export type UserRole = 'super_admin' | 'admin' | 'user'

// User tier levels
export type UserTier = 'Lv0' | 'Lv1' | 'Lv2' | 'Lv3'

// User status
export type UserStatus = 'active' | 'inactive' | 'suspended' | 'pending'

// User entity interface
export interface User {
  id: string
  name: string
  email: string
  firstName?: string
  lastName?: string
  avatar?: string
  role: UserRole
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

// User form values for creating/editing
export interface UserFormValues {
  name: string
  email: string
  role: UserRole
  tier: UserTier
  status: UserStatus
}

// Query params for filtering users
export interface UserQueryParams {
  page?: number
  pageSize?: number
  role?: UserRole | string
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