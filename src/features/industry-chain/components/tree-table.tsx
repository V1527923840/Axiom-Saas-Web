// src/features/industry-chain/components/tree-table.tsx
"use client"

import {
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  useReactTable,
  type ExpandedState,
} from "@tanstack/react-table"
import { useMemo } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { TreeNode } from "../hooks/use-tree"
import { buildColumns } from "./columns"

interface TreeTableProps {
  data: TreeNode[]
  expandedIds: Set<string>
  onToggle: (id: string) => void
  onPreview: (node: TreeNode) => void
}

export function TreeTable({
  data,
  expandedIds,
  onToggle,
  onPreview,
}: TreeTableProps) {
  const columns = useMemo(
    () => buildColumns({ expandedIds, onToggle, onPreview }),
    [expandedIds, onToggle, onPreview],
  )

  const expandedRecord = useMemo<ExpandedState>(() => {
    const out: Record<string, boolean> = {}
    expandedIds.forEach((id) => {
      out[id] = true
    })
    return out
  }, [expandedIds])

  const table = useReactTable({
    data,
    columns,
    state: { expanded: expandedRecord },
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getSubRows: (row) => row.children,
    getRowId: (row) => row.id,
    enableSubRowSelection: false,
  })

  return (
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
                        header.getContext(),
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                暂无数据
              </TableCell>
            </TableRow>
          ) : (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
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
  )
}
