"use client"

import { useEffect, useState } from "react"
import { BaseLayout } from "@/components/layouts/base-layout"
import { DataTable } from "@/components/data-table"
import { columns, AudioInterpretationDetailDialog } from "./components/columns"
import { useAudioInterpretation } from "./hooks/use-audio-interpretation"
import type { AudioInterpretationItem } from "@/features/content/types"

export default function AudioInterpretationPage() {
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)

  const { items, isLoading, pagination } = useAudioInterpretation({ page, pageSize })

  const [selectedItem, setSelectedItem] = useState<AudioInterpretationItem | null>(null)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)

  // Listen for custom event to open detail
  useEffect(() => {
    const handleOpenDetail = (event: CustomEvent) => {
      setSelectedItem(event.detail as AudioInterpretationItem)
      setDetailDialogOpen(true)
    }

    window.addEventListener('open-audio-detail', handleOpenDetail as EventListener)
    return () => {
      window.removeEventListener('open-audio-detail', handleOpenDetail as EventListener)
    }
  }, [])

  return (
    <BaseLayout title="音频解读" description="管理音频解读内容">
      <div className="px-4 lg:px-6">
        <DataTable
          columns={columns}
          data={items}
          loading={isLoading}
          pagination={{
            page: pagination.page,
            pageSize: pagination.pageSize,
            total: pagination.total,
            onPageChange: setPage,
            onPageSizeChange: (size) => {
              setPageSize(size)
              setPage(0)
            },
          }}
        />

        <AudioInterpretationDetailDialog
          item={selectedItem}
          open={detailDialogOpen}
          onOpenChange={(open) => {
            setDetailDialogOpen(open)
            if (!open) setSelectedItem(null)
          }}
        />
      </div>
    </BaseLayout>
  )
}
