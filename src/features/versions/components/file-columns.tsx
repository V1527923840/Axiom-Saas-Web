"use client"

import type { ColumnDef } from "@tanstack/react-table"
import type { VersionFile } from "../types"

export const fileColumns: ColumnDef<VersionFile>[] = [
  {
    accessorKey: "filename",
    header: "文件名",
  },
  {
    accessorKey: "key",
    header: "OSS路径",
    cell: ({ row }) => (
      <span className="font-mono text-xs truncate max-w-[300px] block" title={row.original.key}>
        {row.original.key}
      </span>
    ),
  },
  {
    accessorKey: "size",
    header: "大小",
    cell: ({ row }) => {
      const size = row.original.size
      if (!size) return "-"
      if (size < 1024) return `${size} B`
      if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
      return `${(size / (1024 * 1024)).toFixed(1)} MB`
    },
  },
  {
    accessorKey: "lastModified",
    header: "更新时间",
  },
]