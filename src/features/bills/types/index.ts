// ============= Bill Types =============

// Payment flow types
export type PaymentType = 'recharge' | 'refund'
export type PaymentMethod = 'wechat' | 'alipay' | 'bankcard' | 'other'
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded'

export interface PaymentFlow {
  id: string
  orderNo: string
  userId: number
  userName: string
  userEmail: string
  type: PaymentType
  paymentMethod: PaymentMethod
  amount: number
  points: number
  status: PaymentStatus
  metadata?: Record<string, unknown>
  createdAt: string
  updatedAt: string
  completedAt?: string | null
}

export interface PaymentFlowQueryParams {
  page?: number
  pageSize?: number
  dateFrom?: string
  dateTo?: string
  userSearch?: string
  type?: PaymentType
  paymentMethod?: PaymentMethod
  status?: PaymentStatus
}

export interface PaymentFlowListResponse {
  data: PaymentFlow[]
  total: number
  page: number
  pageSize: number
}

// Consumption types
export type ConsumptionType = 'chat' | 'redeem' | 'other'

export interface Consumption {
  id: string
  userId: number
  userName: string
  userEmail: string
  consumeType: ConsumptionType
  points: number
  balance: number
  businessId: string | null
  businessType: string | null
  description: string | null
  createdAt: string
  updatedAt: string
}

export interface ConsumptionQueryParams {
  page?: number
  pageSize?: number
  dateFrom?: string
  dateTo?: string
  userSearch?: string
  consumeType?: ConsumptionType
}

export interface ConsumptionListResponse {
  data: Consumption[]
  total: number
  page: number
  pageSize: number
}

// Filter types
export interface FlowFilters {
  dateRange: { from: Date; to: Date } | undefined
  userSearch: string
  type: 'all' | PaymentType
  paymentMethod: 'all' | PaymentMethod
  status: 'all' | PaymentStatus
}

export interface ConsumptionFilters {
  dateRange: { from: Date; to: Date } | undefined
  userSearch: string
  consumptionType: 'all' | ConsumptionType
}