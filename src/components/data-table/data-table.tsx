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
  ...props
}: DataTableProps<TData>) {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: externalPagination?.page ?? 0,
    pageSize: externalPagination?.pageSize ?? 10,
  })
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState("")
  const [data, setData] = useState<TData[]>(externalData ?? [])
  const [total, setTotal] = useState(externalTotal ?? 0)
  const [isLoading, setIsLoading] = useState(externalLoading ?? false)
  const [internalError, setError] = useState<Error | null>(null)
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
      setTotal(externalTotal ?? 0)
      setIsLoading(externalLoading ?? false)
    }
  }, [externalData, externalTotal, externalLoading, isExternalMode])

  useEffect(() => {
    if (!isExternalMode && fetchData) {
      const loadData = async () => {
        setIsLoading(true)
        setError(null)
        try {
          const result = await fetchData({
            pagination,
            sorting,
            globalFilter,
          })
          setData(result.data)
          setTotal(result.total)
        } catch (err) {
          setError(err instanceof Error ? err : new Error("Failed to fetch data"))
        } finally {
          setIsLoading(false)
        }
      }
      loadData()
    }
  }, [pagination, sorting, globalFilter, isExternalMode, fetchData])

  const handlePageSizeChange = (newPageSize: number) => {
    setPagination({ pageIndex: 0, pageSize: newPageSize })
    externalPagination?.onPageSizeChange?.(newPageSize)
  }

  const table = useReactTable({
    data,
    columns,
    state: {
      pagination,
      sorting,
      globalFilter,
    },
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
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
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
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
              onClick={() => table.firstPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronsLeftIcon className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => table.previousPage()}
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
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRightIcon className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => table.lastPage()}
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
