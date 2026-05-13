// Category Types

// Category layer types
export type CategoryLayer = 'carrier' | 'info_type' | 'financial'

// Content Category interface
export interface ContentCategory {
  id: string
  name: string
  code: string
  layer: CategoryLayer
  parentCode: string | null
  description?: string
  sortOrder: number
  isActive: boolean
  metadata?: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

// Category tree node for hierarchical display
export interface CategoryTreeNode extends ContentCategory {
  children: CategoryTreeNode[]
}

// Create category request
export interface CreateCategoryRequest {
  name: string
  code: string
  layer: CategoryLayer
  parentCode?: string | null
  description?: string
  sortOrder?: number
  isActive?: boolean
}

// Update category request
export interface UpdateCategoryRequest {
  name?: string
  description?: string
  sortOrder?: number
  isActive?: boolean
}

// Query categories params
export interface CategoryQueryParams {
  layer?: CategoryLayer
  parentCode?: string | null
  isActive?: boolean
}

// List response interface
export interface ListResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}