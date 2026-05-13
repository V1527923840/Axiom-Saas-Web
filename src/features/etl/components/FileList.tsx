"use client"

import { useState } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { FileText, RefreshCw } from "lucide-react"
import type { EtlFileItem } from "../types"

interface FileListProps {
  files: EtlFileItem[]
  loading: boolean
  selectedFiles: string[]
  onSelectionChange: (files: string[]) => void
  onRefresh: () => void
}

export function FileList({ files, loading, selectedFiles, onSelectionChange, onRefresh }: FileListProps) {
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(files.map(f => f.filename))
    } else {
      onSelectionChange([])
    }
  }

  const handleSelectFile = (filename: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedFiles, filename])
    } else {
      onSelectionChange(selectedFiles.filter(f => f !== filename))
    }
  }

  const isAllSelected = files.length > 0 && selectedFiles.length === files.length
  const isIndeterminate = selectedFiles.length > 0 && selectedFiles.length < files.length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">待入库文件</h3>
        <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading} className="cursor-pointer">
          <RefreshCw className={`size-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          刷新
        </Button>
      </div>

      {files.length === 0 && !loading ? (
        <div className="text-center py-8 text-muted-foreground">
          <FileText className="size-12 mx-auto mb-4 opacity-50" />
          <p>暂无待入库文件</p>
        </div>
      ) : (
        <div className="rounded-md border">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="py-3 px-4 text-left w-10">
                  <Checkbox
                    checked={isAllSelected}
                    ref={(el) => { if (el) el.indeterminate = isIndeterminate }}
                    onCheckedChange={handleSelectAll}
                  />
                </th>
                <th className="py-3 px-4 text-left font-medium">文件名</th>
                <th className="py-3 px-4 text-left font-medium">解析器</th>
                <th className="py-3 px-4 text-left font-medium">条目数</th>
                <th className="py-3 px-4 text-left font-medium">大小</th>
                <th className="py-3 px-4 text-left font-medium">修改时间</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-b">
                    <td className="py-3 px-4"><div className="h-4 w-4 bg-muted animate-pulse rounded" /></td>
                    <td className="py-3 px-4"><div className="h-4 w-48 bg-muted animate-pulse rounded" /></td>
                    <td className="py-3 px-4"><div className="h-4 w-24 bg-muted animate-pulse rounded" /></td>
                    <td className="py-3 px-4"><div className="h-4 w-16 bg-muted animate-pulse rounded" /></td>
                    <td className="py-3 px-4"><div className="h-4 w-20 bg-muted animate-pulse rounded" /></td>
                    <td className="py-3 px-4"><div className="h-4 w-28 bg-muted animate-pulse rounded" /></td>
                  </tr>
                ))
              ) : (
                files.map((file) => (
                  <tr key={file.filename} className="border-b hover:bg-muted/30">
                    <td className="py-3 px-4">
                      <Checkbox
                        checked={selectedFiles.includes(file.filename)}
                        onCheckedChange={(checked) => handleSelectFile(file.filename, !!checked)}
                      />
                    </td>
                    <td className="py-3 px-4 font-medium max-w-[300px] truncate">{file.filename}</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-muted">
                        {file.parser}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono">{file.entryCount}</td>
                    <td className="py-3 px-4 text-muted-foreground">{formatSize(file.size)}</td>
                    <td className="py-3 px-4 text-muted-foreground text-sm">{formatDate(file.modifiedAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}