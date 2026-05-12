"use client"

import { useEffect } from "react"
import { BaseLayout } from "@/components/layouts/base-layout"
import { DataTable } from "@/components/data-table"
import { columns, DailyNewsDetailDialog } from "./components/columns"
import { useDailyNewsStore } from "./hooks/use-daily-news"

export default function DailyNewsPage() {
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
  } = useDailyNewsStore()

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  // Listen for custom event to open detail
  useEffect(() => {
    const handleOpenDetail = (event: CustomEvent) => {
      openDetail(event.detail)
    }

    window.addEventListener('open-daily-news-detail', handleOpenDetail as EventListener)
    return () => {
      window.removeEventListener('open-daily-news-detail', handleOpenDetail as EventListener)
    }
  }, [openDetail])

  return (
    <BaseLayout title="每日消息" description="管理每日资讯内容">
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

        <DailyNewsDetailDialog
          item={selectedItem}
          open={detailDialogOpen}
          onOpenChange={closeDetail}
        />
      </div>
    </BaseLayout>
  )
}