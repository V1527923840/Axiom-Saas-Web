"use client"

import { useEffect } from "react"
import { BaseLayout } from "@/components/layouts/base-layout"
import { DataTable } from "@/components/data-table"
import { columns, AudioInterpretationDetailDialog } from "./components/columns"
import { useAudioInterpretationStore } from "./hooks/use-audio-interpretation"

export default function AudioInterpretationPage() {
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
  } = useAudioInterpretationStore()

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  // Listen for custom event to open detail
  useEffect(() => {
    const handleOpenDetail = (event: CustomEvent) => {
      openDetail(event.detail)
    }

    window.addEventListener('open-audio-detail', handleOpenDetail as EventListener)
    return () => {
      window.removeEventListener('open-audio-detail', handleOpenDetail as EventListener)
    }
  }, [openDetail])

  return (
    <BaseLayout title="音频解读" description="管理音频解读内容">
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

        <AudioInterpretationDetailDialog
          item={selectedItem}
          open={detailDialogOpen}
          onOpenChange={closeDetail}
        />
      </div>
    </BaseLayout>
  )
}