// Plan billing cycle
export type PlanCycle = 'monthly' | 'quarterly' | 'yearly' | 'lifetime'

// Plan status
export type PlanStatus = 'active' | 'inactive' | 'deprecated'

// Plan tier levels
export type PlanTier = 'Lv0' | 'Lv1' | 'Lv2' | 'Lv3'

// Plan entity interface
export interface Plan {
  id: string
  name: string
  description?: string
  tier: PlanTier
  cycle: PlanCycle
  pointsQuota: number
  chatQuota: number
  price: number
  currency: string
  status: PlanStatus
  features?: string[]
  menuIds?: string[]
  createdAt: string
  updatedAt: string
}

// Plan form values for creating/editing
export interface PlanFormValues {
  name: string
  description?: string
  tier: PlanTier
  cycle: PlanCycle
  pointsQuota: number
  chatQuota: number
  price: number
  currency?: string
  status: PlanStatus
  features?: string[]
  menuIds?: string[]
}

// Query params for filtering plans
export interface PlanQueryParams {
  page?: number
  pageSize?: number
  status?: PlanStatus | string
  cycle?: PlanCycle | string
  tier?: PlanTier | string
  search?: string
}

// Pagination response
export interface PlanListResponse {
  data: Plan[]
  total: number
  page: number
  pageSize: number
}