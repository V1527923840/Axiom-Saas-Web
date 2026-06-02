import { useState, useEffect } from "react"
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type PaginationState,
  type SortingState,
} from "@tanstack/react-table"
import { ChevronLeftIcon, ChevronRightIcon, ChevronsLeftIcon, ChevronsRightIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { DataTableToolbar } from "./data-table-toolbar"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { DataTableProps } from "./types"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function DataTable<TData = any>({
  className,
  columns,
  data: externalData,
  total: externalTotal,
  loading: externalLoading,
  fetchData,
  createDialog: CreateDialog,
  editDialog: EditDialog,
  deleteAction,
  searchPlaceholder,
  onRowClick,
  pagination: externalPagination,
  error: externalError,
  showToolbar = true,
  showSearch = true,
  onSortingChange,
  initialSorting = [],
  ...props
}: DataTableProps<TData>) {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: externalPagination?.page ?? 0,
    pageSize: externalPagination?.pageSize ?? 10,
  })
  const [sorting, setSorting] = useState<SortingState>(initialSorting)
  const [globalFilter, setGlobalFilter] = useState("")
  const [data, setData] = useState<TData[]>(externalData ?? [])
  const [total, setTotal] = useState(externalPagination?.total ?? externalTotal ?? 0)
  const [isLoading, setIsLoading] = useState(externalLoading ?? false)
  const [internalError] = useState<Error | null>(null)
  const error = externalError ?? (internalError?.message ?? null)

  const handleCreate = () => {
    // Parent component should handle the create dialog via createDialog prop
    // This is a no-op unless parent passes a CreateDialog
  }

  // Use external data if provided, otherwise use internal fetchData
  const isExternalMode = externalData !== undefined

  useEffect(() => {
    if (isExternalMode) {
      setData(externalData)
      setIsLoading(externalLoading ?? false)
    }
  }, [externalData, externalLoading, isExternalMode])

  // Handle page size change
  const handlePageSizeChange = (newPageSize: number) => {
    setPagination({ pageIndex: 0, pageSize: newPageSize })
    // Notify parent - setPageSize will reset page to 0 and fetch new data
    externalPagination?.onPageSizeChange?.(newPageSize)
  }

  // Handle page change - update internal state only, parent handles API calls
  const handlePageChange = (newPageIndex: number) => {
    if (newPageIndex < 0) return
    if (table.getPageCount() > 0 && newPageIndex >= table.getPageCount()) return
    if (pagination.pageIndex === newPageIndex) return

    setPagination((prev) => ({ ...prev, pageIndex: newPageIndex }))
    // Notify parent - parent will update store which will trigger re-render with new data
    externalPagination?.onPageChange?.(newPageIndex)
  }

  // Sync pagination from parent when page changes
  useEffect(() => {
    if (isExternalMode && externalPagination) {
      if (externalPagination.page !== undefined) {
        setPagination((prev) => ({ ...prev, pageIndex: externalPagination.page }))
      }
    }
  }, [isExternalMode, externalPagination?.page])

  // Sync total from parent when it changes
  useEffect(() => {
    if (isExternalMode && externalPagination) {
      setTotal(externalPagination.total ?? 0)
    }
  }, [isExternalMode, externalPagination?.total])

  const table = useReactTable({
    data,
    columns,
    state: {
      pagination,
      sorting,
      globalFilter,
    },
    onPaginationChange: setPagination,
    onSortingChange: (updater) => {
      const newSorting = typeof updater === "function" ? updater(sorting) : updater
      setSorting(newSorting)
      onSortingChange?.(newSorting)
    },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    pageCount: Math.ceil(total / pagination.pageSize) || 0,
  })

  return (
    <div className={cn("space-y-4", className)} {...props}>
      {showToolbar && (
        <DataTableToolbar
          searchPlaceholder={searchPlaceholder}
          showCreateButton={!!CreateDialog}
          onCreate={handleCreate}
          onSearch={setGlobalFilter}
          showSearch={showSearch}
        />
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: pagination.pageSize }).map((_, i) => (
                <TableRow key={i}>
                  {columns.map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : error ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-destructive">
                  {error}
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  暂无数据
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  onClick={() => onRowClick?.(row.original)}
                  className={cn(onRowClick && "cursor-pointer")}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {(cell.column.columnDef.meta as any)?.tooltip ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="truncate cursor-help">
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[400px] break-words">
                            {String(cell.getValue() ?? "")}
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        flexRender(cell.column.columnDef.cell, cell.getContext())
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between px-2">
        <div className="text-sm text-muted-foreground">
          共 {total} 条记录
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">每页</span>
            <Select
              value={String(pagination.pageSize)}
              onValueChange={(value) => handlePageSizeChange(Number(value))}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 20, 50, 100].map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => handlePageChange(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronsLeftIcon className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => handlePageChange(pagination.pageIndex - 1)}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeftIcon className="size-4" />
            </Button>
            <span className="flex items-center gap-1 px-2 text-sm">
              <span>第</span>
              <span className="font-medium">{pagination.pageIndex + 1}</span>
              <span>页</span>
            </span>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => handlePageChange(pagination.pageIndex + 1)}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRightIcon className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => handlePageChange(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <ChevronsRightIcon className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
