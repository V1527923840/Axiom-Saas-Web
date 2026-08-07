"use client"
import { Paperclip, X } from "lucide-react"
import type { UploadResult } from "../lib/vibe-types"

export function AttachmentChip({
  attachment,
  onClear,
}: {
  attachment: Pick<UploadResult, "filename" | "file_path">
  onClear: () => void
}) {
  return (
    <div className="flex items-center gap-1">
      <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
        <Paperclip className="h-3 w-3" />
        {attachment.filename}
        <button
          type="button"
          onClick={onClear}
          aria-label="移除附件"
          className="hover:text-destructive transition-colors"
        >
          <X className="h-3 w-3" />
        </button>
      </span>
    </div>
  )
}
