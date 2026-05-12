// Subscription status
export type SubscriptionStatus = 'active' | 'expired' | 'cancelled' | 'pending' | 'trial'

// Subscription entity interface
export interface Subscription {
  id: string
  userId: string
  planId: string
  planName: string
  price: number
  currency: string
  status: SubscriptionStatus
  startedAt: string
  expiredAt: string
  autoRenew: boolean
  createdAt: string
  updatedAt: string
}

// Subscription with user info for admin view
export interface SubscriptionWithUser extends Subscription {
  userName: string
  userEmail: string
}

// Query params for filtering subscriptions
export interface SubscriptionQueryParams {
  page?: number
  pageSize?: number
  status?: SubscriptionStatus
  userId?: string
  planId?: string
  startDate?: string
  endDate?: string
}

// Pagination response
export interface SubscriptionListResponse {
  data: Subscription[]
  total: number
  page: number
  pageSize: number
}

// Current user's subscription info display
export interface CurrentSubscriptionInfo {
  planName: string
  status: SubscriptionStatus
  pointsBalance: number
  pointsQuota: number
  chatQuotaUsed: number
  chatQuotaTotal: number
  expiredAt: string
  autoRenew: boolean
}