// ============= Menu Types =============

export type MenuStatus = 'active' | 'inactive'

export interface Menu {
  id: string
  name: string
  code: string
  icon: string
  path: string
  parentId: string | null
  sortOrder: number
  status: MenuStatus
  createdAt: string
  updatedAt: string
}

export interface MenuTreeNode extends Menu {
  children: MenuTreeNode[]
}

export interface MenuQueryParams {
  page?: number
  pageSize?: number
  status?: MenuStatus
  search?: string
}

export interface MenuListResponse {
  data: Menu[]
  total: number
  page: number
  pageSize: number
}

export interface MenuFormValues {
  name: string
  code: string
  parentId: string | null
  path: string
  icon: string
  sortOrder: number
  status: MenuStatus
}

// ============= Role Types =============

export interface Role {
  id: string
  name: string
  code: string
  description: string
}

export interface RoleMenuAssignParams {
  roleId: string
  menuIds: string[]
}