"use client"

import { useState } from "react"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RotateCcw } from "lucide-react"
import { toast } from "sonner"
import { useSkillRestore } from "../hooks/use-skill-lifecycle"
import type { Skill } from "@/types/skill"

interface Props {
  skill: Skill
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function SkillRestoreConfirmDialog({ skill, open, onOpenChange, onSuccess }: Props) {
  const [reason, setReason] = useState("")
  const restore = useSkillRestore(skill.id)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="size-5" />
            确认恢复
          </DialogTitle>
          <DialogDescription>
            将 <span className="font-medium">{skill.name}</span> 从 <code>archived</code> 恢复为 <code>published</code>。
            恢复后用户可重新在广场看到并启用此 Skill。
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="restore-reason">恢复原因 (可选)</Label>
          <Textarea
            id="restore-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="如:审核通过,重新上架"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button
            disabled={restore.isPending}
            onClick={async () => {
              try {
                await restore.mutateAsync(reason || undefined)
                onSuccess?.()
                onOpenChange(false)
              } catch (e) {
                console.error(e)
                const message = e instanceof Error && e.message ? e.message : "操作失败"
                toast.error(`恢复失败: ${message}`)
              }
            }}
          >
            确认恢复
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
