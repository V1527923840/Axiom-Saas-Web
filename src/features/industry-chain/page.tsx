// src/features/industry-chain/page.tsx
"use client"

import { useEffect } from "react"
import { BaseLayout } from "@/components/layouts/base-layout"
import { TreeTable } from "./components/tree-table"
import { EmptyState } from "./components/empty-state"
import { MdPreviewDialog } from "./components/md-preview-dialog"
import { useTree } from "./hooks/use-tree"

export default function IndustryChainPage() {
  const {
    tree,
    loadingL1,
    l1Error,
    expandedIds,
    toggle,
    openPreview,
    closePreview,
    preview,
    fetchL1,
  } = useTree()

  useEffect(() => {
    fetchL1()
  }, [fetchL1])

  const hasData = tree.length > 0

  return (
    <BaseLayout
      title="产业链"
      description="按申万行业分类浏览产业链知识库"
    >
      <div className="px-4 lg:px-6 space-y-4">
        {l1Error ? (
          <EmptyState error={l1Error} onRetry={fetchL1} />
        ) : loadingL1 && !hasData ? (
          <EmptyState loading />
        ) : !hasData ? (
          <EmptyState />
        ) : (
          <TreeTable
            data={tree}
            expandedIds={expandedIds}
            onToggle={toggle}
            onPreview={openPreview}
          />
        )}
      </div>

      <MdPreviewDialog
        open={preview.open}
        onOpenChange={(open) => {
          if (!open) closePreview()
        }}
        chainName={preview.chainName}
        version={preview.version}
        qiniuUrl={preview.qiniuUrl}
      />
    </BaseLayout>
  )
}
