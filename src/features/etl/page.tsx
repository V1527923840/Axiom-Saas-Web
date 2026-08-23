"use client"
import { useState, useMemo } from "react"
import { BaseLayout } from "@/components/layouts/base-layout"
import { FileList } from "./components/FileList"
import { ImportDialog } from "./components/ImportDialog"
import { JobHistory } from "./components/JobHistory"
import { useEtlFiles, useEtlImport, useEtlJobs } from "./hooks/use-etl"

export default function EtlManagementPage() {
  const { files, isLoading: filesLoading, refetch: refetchFiles } = useEtlFiles()
  // 翻页 state 提到 page 层 — params 变 → queryKey 变 → TanStack Query
  // 自动 refetch。useEtlJobs 内部不能 capture initialParams by closure,
  // 否则翻页请求带新参数但 queryFn 用旧参数,翻页静默失效。
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(20)
  const jobsParams = useMemo(() => ({ page, pageSize }), [page, pageSize])
  const { jobs, isLoading: jobsLoading, pagination } = useEtlJobs(jobsParams)
  const {
    importFiles,
    isPending: importLoading,
    error: importError,
    reset: resetImport,
  } = useEtlImport()

  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [importDialogOpen, setImportDialogOpen] = useState(false)

  const handleImport = async (dryRun: boolean) => {
    try {
      await importFiles(selectedFiles, { dryRun })
      // import 成功后无需手动 refetch jobs — useEtlImport 的 onSuccess
      // 已经 invalidate ['etl', 'jobs'],TanStack Query 会自动刷新。
      setImportDialogOpen(false)
      setSelectedFiles([])
    } catch (error) {
      // 错误已经挂在 mutation.error 上,ImportDialog 通过 importError prop 渲染。
      console.error("Import failed:", error)
    }
  }

  return (
    <BaseLayout title="数据入库管理" description="管理待入库文件和执行导入操作">
      <div className="px-4 lg:px-6 space-y-8">
        {/* File List Section */}
        <FileList
          files={files}
          loading={filesLoading}
          selectedFiles={selectedFiles}
          onSelectionChange={setSelectedFiles}
          onRefresh={refetchFiles}
        />

        {/* Action Buttons */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setImportDialogOpen(true)}
            disabled={selectedFiles.length === 0}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            导入选中文件 ({selectedFiles.length})
          </button>
          {selectedFiles.length > 0 && (
            <button
              onClick={() => setSelectedFiles([])}
              className="text-sm text-muted-foreground hover:text-foreground cursor-pointer"
            >
              清除选择
            </button>
          )}
        </div>

        {/* Job History Section */}
        <JobHistory
          jobs={jobs}
          loading={jobsLoading}
          pagination={pagination}
          // pagination.page 是 1-based(JobHistory 契约),useEtlJobs 内部 0-based,
          // 这里 -1 转回 0-based 给 state,翻页 state 推进 → params 变 → refetch
          onPageChange={(next) => setPage(next - 1)}
          onPageSizeChange={(size) => {
            setPageSize(size)
            setPage(0)
          }}
        />

        {/* Import Dialog */}
        <ImportDialog
          open={importDialogOpen}
          onOpenChange={(open) => {
            setImportDialogOpen(open)
            if (!open) resetImport()
          }}
          selectedFiles={selectedFiles}
          importLoading={importLoading}
          importError={importError?.message ?? null}
          onImport={handleImport}
        />
      </div>
    </BaseLayout>
  )
}