'use client'

import { Folder, FileText, FileJson, Image, Music, FileSpreadsheet, File, Trash2, Download, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { OssItem } from '../types'

interface FileGridProps {
  items: OssItem[]
  loading: boolean
  viewMode: 'grid' | 'list'
  onItemClick: (item: OssItem) => void
  onDelete: (item: OssItem) => void
  onDownload: (item: OssItem) => void
  onPreview: (item: OssItem) => void
}

function getFileIcon(filename: string, type: 'file' | 'dir') {
  if (type === 'dir') return Folder

  const ext = filename.split('.').pop()?.toLowerCase() || ''

  switch (ext) {
    case 'md':
      return FileText
    case 'json':
    case 'jsonl':
      return FileJson
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'webp':
      return Image
    case 'mp3':
    case 'wav':
    case 'ogg':
      return Music
    case 'xlsx':
    case 'xls':
    case 'csv':
      return FileSpreadsheet
    case 'pdf':
      return FileText
    default:
      return File
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '-'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-24 rounded-lg border bg-muted animate-pulse" />
      ))}
    </div>
  )
}

export function FileGrid({ items, loading, viewMode, onItemClick, onDelete, onDownload, onPreview }: FileGridProps) {
  const isGridMode = viewMode === 'grid'
  if (loading) {
    return <LoadingSkeleton />
  }

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        目录为空
      </div>
    )
  }

  return (
    <div className={isGridMode ? 'grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4' : 'flex flex-col'}>
      {items.map((item) => {
        const Icon = getFileIcon(item.key, item.type)
        const isDir = item.type === 'dir'
        const displayName = isDir ? item.key.replace(/\/$/, '') : item.key

        return isGridMode ? (
          <div
            key={item.key}
            className="group relative flex flex-col items-center justify-center p-4 rounded-lg border bg-card hover:bg-muted/50 cursor-pointer transition-colors"
            onClick={() => onItemClick(item)}
          >
            <Icon className={`h-10 w-10 mb-2 ${isDir ? 'text-blue-500' : 'text-muted-foreground'}`} />
            <span className="text-xs text-center break-all line-clamp-2 w-full">
              {displayName}
            </span>
            {isDir && item.file_count !== undefined && (
              <span className="text-[10px] text-muted-foreground mt-1">
                {item.file_count === -1 ? 'many files' : `${item.file_count} files`}
              </span>
            )}
            {!isDir && (
              <span className="text-[10px] text-muted-foreground mt-1">
                {formatFileSize(item.size)}
              </span>
            )}

            {/* Action buttons */}
            <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {!isDir && (
                <>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={(e) => { e.stopPropagation(); onPreview(item) }} title="预览">
                    <Eye className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={(e) => { e.stopPropagation(); onDownload(item) }} title="下载">
                    <Download className="h-3 w-3" />
                  </Button>
                </>
              )}
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(item) }} title="删除">
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ) : (
          <div
            key={item.key}
            className="group relative flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 cursor-pointer transition-colors"
            onClick={() => onItemClick(item)}
          >
            <Icon className={`h-5 w-5 ${isDir ? 'text-blue-500' : 'text-muted-foreground'}`} />
            <span className="text-sm flex-1 break-all">
              {displayName}
            </span>
            {isDir && item.file_count !== undefined && (
              <span className="text-xs text-muted-foreground">
                {item.file_count === -1 ? 'many files' : `${item.file_count} files`}
              </span>
            )}
            {!isDir && (
              <span className="text-xs text-muted-foreground">
                {formatFileSize(item.size)}
              </span>
            )}
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {!isDir && (
                <>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={(e) => { e.stopPropagation(); onPreview(item) }} title="预览">
                    <Eye className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={(e) => { e.stopPropagation(); onDownload(item) }} title="下载">
                    <Download className="h-3 w-3" />
                  </Button>
                </>
              )}
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(item) }} title="删除">
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )
      })}
    </div>
  )
}