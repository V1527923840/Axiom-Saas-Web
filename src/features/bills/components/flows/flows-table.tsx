import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { PaymentFlow } from "../../types"
import { flowsColumns } from "./flows-columns"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface FlowsTableProps {
  flows: PaymentFlow[]
  loading: boolean
  pagination: {
    page: number
    pageSize: number
    total: number
  }
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  onView: (flow: PaymentFlow) => void
}

export function FlowsTable({
  flows,
  loading,
  pagination,
  onPageChange,
  onPageSizeChange,
  onView,
}: FlowsTableProps) {
  const columns = flowsColumns({ onView })

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column: any, index: number) => (
                <TableHead key={index}>
                  {typeof column.header === "string" ? column.header : null}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: pagination.pageSize }).map((_, i) => (
                <TableRow key={i}>
                  {columns.map((_: any, j: number) => (
                    <TableCell key={j}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : flows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  暂无数据
                </TableCell>
              </TableRow>
            ) : (
              flows.map((flow: PaymentFlow) => (
                <TableRow key={flow.id}>
                  {columns.map((column: any, index: number) => {
                    const cell = column.cell
                    const value = column.accessorKey
                      ? flow[column.accessorKey as keyof PaymentFlow]
                      : null
                    return (
                      <TableCell key={index}>
                        {cell && value !== undefined
                          ? cell.render({
                              row: { original: flow } as any,
                              getValue: () => value,
                            } as any)
                          : null}
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between px-2">
        <div className="flex-1 text-sm text-muted-foreground hidden lg:block">
          共 {pagination.total} 条
        </div>
        <div className="flex items-center space-x-6 lg:space-x-8">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium">每页</p>
            <Select
              value={`${pagination.pageSize}`}
              onValueChange={(value) => onPageSizeChange(Number(value))}
            >
              <SelectTrigger className="h-8 w-[70px] cursor-pointer">
                <SelectValue placeholder={pagination.pageSize} />
              </SelectTrigger>
              <SelectContent side="top">
                {[10, 20, 30, 40, 50].map((pageSize) => (
                  <SelectItem key={pageSize} value={`${pageSize}`} className="cursor-pointer">
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium">
              第 {pagination.page} 页 / 共 {Math.ceil(pagination.total / pagination.pageSize) || 1} 页
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              className="h-8 w-8 p-0 cursor-pointer disabled:cursor-not-allowed"
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
            >
              <span className="sr-only">上一页</span>
              <ChevronLeft />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0 cursor-pointer disabled:cursor-not-allowed"
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page >= Math.ceil(pagination.total / pagination.pageSize)}
            >
              <span className="sr-only">下一页</span>
              <ChevronRight />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}