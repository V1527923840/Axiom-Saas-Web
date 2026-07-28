// src/features/industry-chain/components/md-preview-dialog.tsx
"use client"

import { useEffect, useState } from "react"
import { Copy, ExternalLink, Loader2, AlertCircle } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface MdPreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  chainName: string
  version: number
  qiniuUrl: string
}

export function MdPreviewDialog({
  open,
  onOpenChange,
  chainName,
  version,
  qiniuUrl,
}: MdPreviewDialogProps) {
  const [content, setContent] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !qiniuUrl) return

    let cancelled = false
    setLoading(true)
    setError(null)
    setContent("")

    fetch(qiniuUrl)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`)
        }
        return res.text()
      })
      .then((text) => {
        if (!cancelled) setContent(text)
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "加载 Markdown 失败（可能 CORS 受限）",
          )
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, qiniuUrl])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(qiniuUrl)
      toast.success("链接已复制到剪贴板")
    } catch {
      toast.error("复制失败")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {chainName} · v{version}
          </DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="size-6 animate-spin mr-2" />
            加载 Markdown 中...
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="size-5" />
              <p className="text-sm">
                加载失败：{error}（可能是 CORS 限制）
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleCopy}>
                <Copy className="size-4 mr-1" />
                复制链接
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(qiniuUrl, "_blank", "noopener")}
              >
                <ExternalLink className="size-4 mr-1" />
                在浏览器打开
              </Button>
            </div>
          </div>
        )}

        {!loading && !error && content && (
          <div className="flex-1 overflow-y-auto px-6 pb-6">
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
