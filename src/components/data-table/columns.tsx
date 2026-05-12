import type { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import { Button } from "@/components/ui/button"

export interface ColumnConfig<TData, TValue> {
  id: string
  header: string
  accessorKey?: keyof TData
  enableSorting?: boolean
  cell?: (props: { row: TData; getValue: () => TValue }) => React.ReactNode
}

export function createColumns<TData>(config: ColumnConfig<TData, unknown>[]): ColumnDef<TData, unknown>[] {
  return config.map((col) => {
    const columnDef: ColumnDef<TData, unknown> = {
      id: col.id,
      header: ({ column }) => {
        if (col.enableSorting) {
          return (
            <Button
              variant="ghost"
              size="sm"
              className="-ml-3 h-8"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
              {col.header}
              {column.getIsSorted() === "asc" ? (
                <ArrowUp className="ml-2 size-4" />
              ) : column.getIsSorted() === "desc" ? (
                <ArrowDown className="ml-2 size-4" />
              ) : (
                <ArrowUpDown className="ml-2 size-4" />
              )}
            </Button>
          )
        }
        return col.header
      },
    }

    if (col.accessorKey) {
      (columnDef as ColumnDef<TData, unknown> & { accessorKey?: string }).accessorKey = col.accessorKey as string
    }

    if (col.cell) {
      columnDef.cell = (info) => col.cell!({ row: info.row.original, getValue: info.getValue })
    }

    return columnDef
  })
}

export function defaultSortableColumn<TData>(
  id: string,
  header: string,
  accessorKey?: keyof TData
): ColumnDef<TData, unknown> {
  return createColumns<TData>([{ id, header, accessorKey, enableSorting: true }])[0]
}