"use client"

import { useState } from "react"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Archive, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import { useSkillArchive } from "../hooks/use-skill-lifecycle"
import type { Skill } from "@/types/skill"

interface Props {
  skill: Skill
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function SkillArchiveConfirmDialog({ skill, open, onOpenChange, onSuccess }: Props) {
  const [reason, setReason] = useState("")
  const archive = useSkillArchive(skill.id)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Archive className="size-5" />
            确认强制停用
          </DialogTitle>
          <DialogDescription>
            <div className="space-y-2 mt-2 text-sm">
              <div>Skill: <span className="font-medium">{skill.name}</span></div>
              <div>当前状态: <span className="font-medium">{skill.status}</span></div>
              <div className="flex items-start gap-2 text-amber-600 bg-amber-50 p-2 rounded">
                <AlertTriangle className="size-4 mt-0.5 shrink-0" />
                <div>
                  停用后:广场不再展示;已启用此 Skill 的用户将无法继续使用。<br />
                  user_skill_binding 不会被删除,恢复后用户需重新启用。
                </div>
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="archive-reason">停用原因 (可选)</Label>
          <Textarea
            id="archive-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="如:违反社区规范"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button
            variant="destructive"
            disabled={archive.isPending}
            onClick={async () => {
              try {
                await archive.mutateAsync(reason || undefined)
                onSuccess?.()
                onOpenChange(false)
              } catch (e) {
                console.error(e)
                const message = e instanceof Error && e.message ? e.message : "操作失败"
                toast.error(`停用失败: ${message}`)
              }
            }}
          >
            确认停用
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
