'use client'

import { useState, useEffect } from 'react'
import { Plus, RefreshCw, Upload, LayoutGrid, List } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { BaseLayout } from '@/components/layouts/base-layout'
import { Breadcrumb } from './Breadcrumb'
import { FileGrid } from './FileGrid'
import {
  useOssList,
  useOssDownload,
  useOssDelete,
  useOssMkdir,
  useOssUpload,
} from '../hooks/use-oss'
import { useAuth } from '@/contexts/auth-context'
import type { OssItem } from '../types'

export default function OssBrowserPage() {
  const { token } = useAuth()
  const { items, loading, fetchList, currentPath } = useOssList()
  const { downloadFile } = useOssDownload()
  const { deleteFiles } = useOssDelete()
  const { mkdir } = useOssMkdir()
  const { getUploadUrl } = useOssUpload()

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [mkdirDialogOpen, setMkdirDialogOpen] = useState(false)
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<OssItem | null>(null)
  const [newDirName, setNewDirName] = useState('')
  const [uploadFileName, setUploadFileName] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [folderNotEmpty, setFolderNotEmpty] = useState(false)
  const [isCheckingFolder, setIsCheckingFolder] = useState(false)
  const [deleteRejectReason, setDeleteRejectReason] = useState('')

  // Initial fetch on mount
  useEffect(() => {
    fetchList({ path: '/' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleNavigate = (path: string) => {
    fetchList({ path })
  }

  const handleItemClick = (item: OssItem) => {
    if (item.type === 'dir') {
      let newPath: string
      if (item.key.startsWith('/')) {
        newPath = item.key
      } else if (currentPath === '/') {
        newPath = '/' + item.key
      } else {
        newPath = currentPath + item.key
      }
      if (!newPath.endsWith('/')) {
        newPath = newPath + '/'
      }
      fetchList({ path: newPath })
    }
  }

  const checkFolderFileCount = async (folderPath: string): Promise<number> => {
    try {
      const response = await fetch(`/api/v1/oss/list?path=${encodeURIComponent(folderPath)}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const data = await response.json()
      return data?.data?.items?.length || 0
    } catch {
      return 0
    }
  }

  const handleDelete = async (item: OssItem) => {
    setSelectedItem(item)
    setFolderNotEmpty(false)
    setDeleteRejectReason('')
    setDeleteDialogOpen(true)

    // If it's a directory, check if it contains files
    if (item.type === 'dir') {
      setIsCheckingFolder(true)
      const folderPath = item.key.startsWith('/') ? item.key : `${currentPath === '/' ? '' : currentPath}${item.key}`
      const fileCount = await checkFolderFileCount(folderPath)
      const isNotEmpty = fileCount > 0
      setFolderNotEmpty(isNotEmpty)
      if (isNotEmpty) {
        setDeleteRejectReason(`文件夹不为空，包含 ${fileCount} 个文件或文件夹。请先删除所有内容后再试。`)
      }
      setIsCheckingFolder(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (selectedItem) {
      // Check if trying to delete a non-empty folder
      if (selectedItem.type === 'dir' && folderNotEmpty) {
        setDeleteDialogOpen(false)
        setSelectedItem(null)
        setFolderNotEmpty(false)
        return
      }

      await deleteFiles([selectedItem.key])
      setDeleteDialogOpen(false)
      setSelectedItem(null)
      setFolderNotEmpty(false)
      fetchList({ path: currentPath })
    }
  }

  const handleMkdir = async () => {
    if (newDirName.trim()) {
      const dirPath = `${currentPath === '/' ? '' : currentPath}${newDirName.trim()}`
      await mkdir(dirPath)
      setMkdirDialogOpen(false)
      setNewDirName('')
      fetchList({ path: currentPath })
    }
  }

  const handleUpload = async () => {
    if (uploadFileName.trim()) {
      const filePath = `${currentPath === '/' ? '' : currentPath}${uploadFileName.trim()}`
      const result = await getUploadUrl(filePath)
      if (result?.url) {
        window.open(result.url, '_blank')
        setUploadDialogOpen(false)
        setUploadFileName('')
      }
    }
  }

  const handleDownload = (item: OssItem) => {
    downloadFile(item.key)
  }

  const handlePreview = (item: OssItem) => {
    downloadFile(item.key)
  }

  return (
    <BaseLayout title="OSS 文件管理" description="浏览和管理 OSS 存储的文件">
      <div className="px-4 lg:px-6 space-y-6">
        {/* Toolbar */}
        <div className="flex items-center justify-between">
          <Breadcrumb path={currentPath} onNavigate={handleNavigate} />

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMkdirDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              新建文件夹
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setUploadDialogOpen(true)}
            >
              <Upload className="h-4 w-4 mr-1" />
              上传文件
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchList({ path: currentPath })}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              className="h-9 w-9 p-0"
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              title={viewMode === 'grid' ? '切换到列表视图' : '切换到网格视图'}
            >
              {viewMode === 'grid' ? <List className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* File Grid */}
        <FileGrid
          items={items}
          loading={loading}
          viewMode={viewMode}
          onItemClick={handleItemClick}
          onDelete={handleDelete}
          onDownload={handleDownload}
          onPreview={handlePreview}
        />

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>确认删除</DialogTitle>
              <DialogDescription>
                {isCheckingFolder ? (
                  <span className="text-muted-foreground">检查文件夹中...</span>
                ) : deleteRejectReason ? (
                  <span className="text-destructive">{deleteRejectReason}</span>
                ) : (
                  <>确定要删除 {selectedItem?.type === 'dir' ? '文件夹' : '文件'} &quot;{selectedItem?.key}&quot; 吗？此操作无法撤销。</>
                )}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                取消
              </Button>
              <Button
                onClick={handleConfirmDelete}
                disabled={isCheckingFolder || folderNotEmpty}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                删除
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Mkdir Dialog */}
        <Dialog open={mkdirDialogOpen} onOpenChange={setMkdirDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新建文件夹</DialogTitle>
              <DialogDescription>
                在当前目录下创建新文件夹
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Input
                placeholder="文件夹名称"
                value={newDirName}
                onChange={(e) => setNewDirName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleMkdir()}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setMkdirDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleMkdir} disabled={!newDirName.trim()}>
                创建
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Upload Dialog */}
        <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>上传文件</DialogTitle>
              <DialogDescription>
                获取上传预签名 URL，请在打开的页面中完成上传
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Input
                placeholder="文件路径（如 folder/file.txt）"
                value={uploadFileName}
                onChange={(e) => setUploadFileName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleUpload()}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleUpload} disabled={!uploadFileName.trim()}>
                获取上传链接
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </BaseLayout>
  )
}