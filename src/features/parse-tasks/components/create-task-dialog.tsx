"use client"

import { useState, useEffect } from "react"
import { useParseTaskStore } from "../hooks/use-parse-task"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface CreateTaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateTaskDialog({ open, onOpenChange }: CreateTaskDialogProps) {
  const {
    versions,
    versionsLoading,
    versionFiles,
    versionFilesLoading,
    fetchVersions,
    fetchVersionFiles,
    createTask,
  } = useParseTaskStore()

  const [selectedSource, setSelectedSource] = useState<string>("")
  const [selectedVersion, setSelectedVersion] = useState<string>("")
  const [selectedFile, setSelectedFile] = useState<string>("")
  const [executeImmediately, setExecuteImmediately] = useState<boolean>(true)
  const [submitting, setSubmitting] = useState(false)

  // Get unique sources from versions
  const sources = [...new Set(versions.map(v => v.source))]

  // Get versions for selected source
  const filteredVersions = versions.filter(v => v.source === selectedSource)

  // Reset selection when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedSource("")
      setSelectedVersion("")
      setSelectedFile("")
      fetchVersions()
    }
  }, [open, fetchVersions])

  // Fetch files when version changes
  useEffect(() => {
    if (selectedSource && selectedVersion) {
      fetchVersionFiles(selectedSource, selectedVersion)
    }
  }, [selectedSource, selectedVersion, fetchVersionFiles])

  const handleSourceChange = (value: string) => {
    setSelectedSource(value)
    setSelectedVersion("")
    setSelectedFile("")
  }

  const handleVersionChange = (value: string) => {
    setSelectedVersion(value)
    setSelectedFile("")
  }

  const handleSubmit = async () => {
    if (!selectedSource || !selectedVersion || !selectedFile) return

    setSubmitting(true)
    try {
      await createTask({
        source: selectedSource,
        version: selectedVersion,
        source_file_key: selectedFile,
        execute_immediately: executeImmediately,
      })
      onOpenChange(false)
    } catch (error) {
      console.error("Create task failed:", error)
    } finally {
      setSubmitting(false)
    }
  }

  const isValid = selectedSource && selectedVersion && selectedFile

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>新建解析任务</DialogTitle>
          <DialogDescription>
            选择数据源、版本和文件来创建新的解析任务
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Data Source Select */}
          <div className="space-y-2">
            <Label htmlFor="source">数据源 *</Label>
            <Select value={selectedSource} onValueChange={handleSourceChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="选择数据源" />
              </SelectTrigger>
              <SelectContent>
                {sources.length === 0 && !versionsLoading ? (
                  <SelectItem value="empty" disabled>
                    暂无可用数据源
                  </SelectItem>
                ) : (
                  sources.map(source => (
                    <SelectItem key={source} value={source}>
                      {source}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Version Select */}
          <div className="space-y-2">
            <Label htmlFor="version">版本 *</Label>
            <Select
              value={selectedVersion}
              onValueChange={handleVersionChange}
              disabled={!selectedSource}
            >
              <SelectTrigger className="w-full">
                {versionsLoading ? (
                  <LoadingSpinner className="size-4" />
                ) : (
                  <SelectValue placeholder={selectedSource ? "选择版本" : "请先选择数据源"} />
                )}
              </SelectTrigger>
              <SelectContent>
                {filteredVersions.length === 0 ? (
                  <SelectItem value="empty" disabled>
                    暂无可用版本
                  </SelectItem>
                ) : (
                  filteredVersions.map(v => (
                    <SelectItem key={v.version} value={v.version}>
                      {v.version} ({v.file_count} 个文件)
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* File Select */}
          <div className="space-y-2">
            <Label htmlFor="file">源文件 *</Label>
            <Select
              value={selectedFile}
              onValueChange={setSelectedFile}
              disabled={!selectedVersion}
            >
              <SelectTrigger className="w-full">
                {versionFilesLoading ? (
                  <LoadingSpinner className="size-4" />
                ) : (
                  <SelectValue placeholder={selectedVersion ? "选择文件" : "请先选择版本"} />
                )}
              </SelectTrigger>
              <SelectContent>
                {versionFiles.length === 0 && !versionFilesLoading ? (
                  <SelectItem value="empty" disabled>
                    暂无可用文件
                  </SelectItem>
                ) : (
                  versionFiles.map(file => (
                    <SelectItem key={file.osspath} value={file.osspath}>
                      {file.filename}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Execute Immediately */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="execute_immediately"
              checked={executeImmediately}
              onChange={e => setExecuteImmediately(e.target.checked)}
              className="rounded border-gray-300"
            />
            <Label htmlFor="execute_immediately" className="cursor-pointer">
              创建后立即执行
            </Label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="cursor-pointer"
          >
            取消
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!isValid || submitting}
            className="cursor-pointer"
          >
            {submitting ? (
              <>
                <LoadingSpinner className="size-4 mr-2" />
                创建中...
              </>
            ) : (
              "创建任务"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}