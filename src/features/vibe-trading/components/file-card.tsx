"use client"
import { Paperclip } from "lucide-react"
import type { UploadResult } from "../lib/vibe-types"

/**
 * 在 user 气泡内展示的"文件卡片":Paperclip 图标 + 文件名 + 相对路径。
 *
 * 与 AttachmentChip(输入框上方的紧凑 chip,有 × 删除按钮)的区别:
 * - FileCard 是只读、不允许删除(已经 send 了)
 * - 视觉上更"卡片化",有边框和背景,适合在气泡里显眼地展示用户上传了什么
 * - 文件名溢出时 truncate,完整 file_path 在 title 属性里 hover 可见
 *
 * 设计原则:
 * - 单行布局,避免撑爆气泡的 narrow 容器
 * - 复用 shadcn/tailwind 原子,跟 AttachmentChip 视觉一致(都是 primary 色)
 * - 不渲染 MIME / size(后端没回这些字段);后续如果 UploadResult 加 mime_type
 *   字段,这里可以扩 `<FileText />` 之类的图标分支
 */
export function FileCard({
  attachment,
}: {
  attachment: Pick<UploadResult, "filename" | "file_path">
}) {
  return (
    <div
      className="inline-flex max-w-full items-center gap-2 rounded-md border bg-primary/5 px-2.5 py-1.5 text-xs"
      data-testid="file-card"
      aria-label={`已上传文件 ${attachment.filename}`}
    >
      <Paperclip className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium text-foreground">{attachment.filename}</div>
        <div
          className="truncate font-mono text-[10px] text-muted-foreground"
          title={attachment.file_path}
        >
          {attachment.file_path}
        </div>
      </div>
    </div>
  )
}
