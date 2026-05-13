"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, AlertCircle } from "lucide-react"

interface ImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedFiles: string[]
  importLoading: boolean
  importError: string | null
  onImport: (dryRun: boolean) => void
}

export function ImportDialog({
  open,
  onOpenChange,
  selectedFiles,
  importLoading,
  importError,
  onImport,
}: ImportDialogProps) {
  const [dryRun, setDryRun] = useState(false)

  const handleImport = () => {
    onImport(dryRun)
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setDryRun(false)
    }
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>确认导入</DialogTitle>
          <DialogDescription>
            确认将以下 {selectedFiles.length} 个文件导入数据库？
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {importError && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="size-4 mt-0.5 shrink-0" />
              <span>{importError}</span>
            </div>
          )}

          <div className="space-y-2 max-h-48 overflow-y-auto">
            {selectedFiles.map((filename) => (
              <div key={filename} className="text-sm py-1 px-2 rounded bg-muted/50">
                {filename}
              </div>
            ))}
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="dryRun"
              checked={dryRun}
              onCheckedChange={(checked) => setDryRun(!!checked)}
            />
            <label
              htmlFor="dryRun"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              预览模式（不入库）
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={importLoading}
            className="cursor-pointer"
          >
            取消
          </Button>
          <Button
            onClick={handleImport}
            disabled={importLoading}
            className="cursor-pointer"
          >
            {importLoading ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                导入中...
              </>
            ) : (
              "确认导入"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}