"use client"

import { useEffect } from "react"
import { BaseLayout } from "@/components/layouts/base-layout"
import { DataTable } from "@/components/data-table"
import { columns, InstitutionReportsDetailDialog } from "./components/columns"
import { useInstitutionReportsStore } from "./hooks/use-institution-reports"

export default function InstitutionReportsPage() {
  const {
    items,
    loading,
    pagination,
    selectedItem,
    detailDialogOpen,
    fetchItems,
    setPage,
    setPageSize,
    openDetail,
    closeDetail,
  } = useInstitutionReportsStore()

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  // Listen for custom event to open detail
  useEffect(() => {
    const handleOpenDetail = (event: CustomEvent) => {
      openDetail(event.detail)
    }

    window.addEventListener('open-reports-detail', handleOpenDetail as EventListener)
    return () => {
      window.removeEventListener('open-reports-detail', handleOpenDetail as EventListener)
    }
  }, [openDetail])

  return (
    <BaseLayout title="机构研报" description="管理机构研究报告">
      <div className="px-4 lg:px-6">
        <DataTable
          columns={columns}
          data={items}
          loading={loading}
          pagination={{
            page: pagination.page,
            pageSize: pagination.pageSize,
            total: pagination.total,
            onPageChange: setPage,
            onPageSizeChange: setPageSize,
          }}
        />

        <InstitutionReportsDetailDialog
          item={selectedItem}
          open={detailDialogOpen}
          onOpenChange={closeDetail}
        />
      </div>
    </BaseLayout>
  )
}