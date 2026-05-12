import type { ColumnDef } from "@tanstack/react-table"

export interface FilterOption {
  label: string
  value: string
}

export interface PaginationState {
  pageIndex: number
  pageSize: number
}

export interface SortingState {
  id: string
  desc: boolean
}

export interface FetchDataParams {
  pagination: PaginationState
  sorting: SortingState[]
  globalFilter: string
}

export interface FetchDataResult<TData> {
  data: TData[]
  total: number
}

export type FetchData<TData = unknown> = (
  params: FetchDataParams
) => Promise<FetchDataResult<TData>>

export interface ColumnDefExtra<TData> {
  enableSorting?: boolean
  format?: (value: unknown, row: TData) => React.ReactNode
}

export type CreateColumnDef<TData, TValue> = ColumnDef<TData, TValue> &
  ColumnDefExtra<TData>

export interface RowAction<TData = unknown> {
  label: string
  onClick: (row: TData) => void
  variant?: "default" | "destructive"
}

export interface DialogProps<TData = unknown> {
  open: boolean
  onOpenChange: (open: boolean) => void
  data?: TData
  onSubmit?: (data: TData) => void | Promise<void>
}

// eslint-disable-next-line @typescript-eslint/no-generic-type-declaration
export interface DataTableProps<TData = any>
  extends React.HTMLAttributes<HTMLDivElement> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns: ColumnDef<TData, any>[]
  // Data prop for direct data passing
  data?: TData[]
  total?: number
  loading?: boolean
  error?: string | null
  // FetchData prop for async data loading
  fetchData?: FetchData<TData>
  createDialog?: React.ComponentType<DialogProps<TData>>
  editDialog?: React.ComponentType<DialogProps<TData>>
  deleteAction?: (data: TData) => Promise<void>
  searchPlaceholder?: string
  searchColumn?: string
  showToolbar?: boolean
  onRowClick?: (row: TData) => void
  // Pagination callbacks when using data prop directly
  pagination?: {
    page: number
    pageSize: number
    total: number
    onPageChange?: (page: number) => void
    onPageSizeChange?: (pageSize: number) => void
  }
}