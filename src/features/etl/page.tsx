"use client"

import { useEffect, useState } from "react"
import { BaseLayout } from "@/components/layouts/base-layout"
import { FileList } from "./components/FileList"
import { ImportDialog } from "./components/ImportDialog"
import { JobHistory } from "./components/JobHistory"
import { useEtlFiles, useEtlImport, useEtlJobs } from "./hooks/use-etl"

export default function EtlManagementPage() {
  const { files, loading: filesLoading, fetchFiles } = useEtlFiles()
  const { importFiles, loading: importLoading, error: importError } = useEtlImport()
  const { jobs, loading: jobsLoading, pagination, fetchJobs } = useEtlJobs()

  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [importDialogOpen, setImportDialogOpen] = useState(false)

  // Initial fetch
  useEffect(() => {
    fetchFiles()
    fetchJobs()
  }, [fetchFiles, fetchJobs])

  const handleImport = async (dryRun: boolean) => {
    try {
      const result = await importFiles(selectedFiles, { dryRun })
      console.log("Import started:", result)
      setImportDialogOpen(false)
      setSelectedFiles([])
      // Refresh jobs list to see the new job
      fetchJobs()
    } catch (error) {
      // Error is already handled in the hook
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
          onRefresh={fetchFiles}
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
          onPageChange={(page) => fetchJobs({ page: page - 1, pageSize: pagination.pageSize })}
          onPageSizeChange={(pageSize) => fetchJobs({ page: 0, pageSize })}
        />

        {/* Import Dialog */}
        <ImportDialog
          open={importDialogOpen}
          onOpenChange={setImportDialogOpen}
          selectedFiles={selectedFiles}
          importLoading={importLoading}
          importError={importError}
          onImport={handleImport}
        />
      </div>
    </BaseLayout>
  )
}