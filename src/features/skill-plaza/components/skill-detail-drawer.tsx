"use client"

import { format } from "date-fns"
import { zhCN } from "date-fns/locale"
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Archive, PencilLine, RotateCcw } from "lucide-react"
import { useSkillUpdateEvents } from "../hooks/use-skill-update-events"
import type { Skill, SkillUpdateEvent } from "@/types/skill"

interface Props {
  skill: Skill
  open: boolean
  onOpenChange: (open: boolean) => void
}

const actionMeta = {
  update: { icon: PencilLine, label: "更新", variant: "default" as const },
  archive: { icon: Archive, label: "停用", variant: "destructive" as const },
  restore: { icon: RotateCcw, label: "恢复", variant: "secondary" as const },
}

const roleLabel = {
  self: "本人",
  admin: "管理员",
  super_admin: "超级管理员",
}

function formatDate(iso: string): string {
  try {
    return format(new Date(iso), "yyyy-MM-dd HH:mm", { locale: zhCN })
  } catch {
    return iso
  }
}

function truncateHash(h: string | null): string {
  if (!h) return "-"
  return h.slice(0, 8) + "…"
}

export function SkillDetailDrawer({ skill, open, onOpenChange }: Props) {
  const { data: events = [], isLoading } = useSkillUpdateEvents(open ? skill.id : null)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[480px] sm:max-w-full p-0">
        <SheetHeader className="p-6 pb-4 border-b">
          <SheetTitle>Skill 详情</SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-80px)]">
          {/* Skill info */}
          <section className="p-6 space-y-3 border-b">
            <h3 className="text-sm font-medium text-muted-foreground">基本信息</h3>
            <Row label="名称" value={skill.name} />
            <Row label="code" value={<span className="font-mono text-xs">{skill.code}</span>} />
            <Row label="分类" value={skill.category ?? "—"} />
            <Row label="状态" value={<Badge variant="outline">{skill.status}</Badge>} />
            <Row label="作者" value={`${skill.uploaderType} / ${skill.uploaderId ?? "—"}`} />
            <Row label="contentHash" value={<span className="font-mono text-xs">{truncateHash(skill.contentHash)}</span>} />
            <Row label="最后更新" value={formatDate(skill.updatedAt)} />
          </section>

          {/* Update timeline */}
          <section className="p-6 space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">
              更新记录 {events.length > 0 && <span className="ml-2">({events.length} 条)</span>}
            </h3>
            {isLoading && <div className="text-sm text-muted-foreground">加载中…</div>}
            {!isLoading && events.length === 0 && (
              <div className="text-sm text-muted-foreground">暂无更新记录</div>
            )}
            <ol className="space-y-3">
              {events.map((ev) => (
                <TimelineItem key={ev.id} ev={ev} />
              ))}
            </ol>
            {events.length > 0 && (
              <p className="text-xs text-muted-foreground pt-3 border-t">
                历史源文件不保留(仅记录变更元数据),如需回滚请联系管理员从备份恢复。
              </p>
            )}
          </section>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="col-span-2">{value}</span>
    </div>
  )
}

function TimelineItem({ ev }: { ev: SkillUpdateEvent }) {
  const meta = actionMeta[ev.action]
  const Icon = meta.icon
  return (
    <li className="flex gap-3">
      <div className="mt-1 shrink-0">
        <Icon className="size-4" />
      </div>
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2 text-sm">
          <Badge variant={meta.variant}>{meta.label}</Badge>
          <span className="text-muted-foreground">
            {formatDate(ev.createdAt)} · userId={ev.actorUserId} ({roleLabel[ev.actorRole]})
          </span>
        </div>
        {ev.action === "update" && (
          <div className="text-xs text-muted-foreground font-mono">
            {truncateHash(ev.oldHash)} → {truncateHash(ev.newHash)}
            {ev.sourceFormat && <span className="ml-2">[{ev.sourceFormat}]</span>}
          </div>
        )}
        {ev.changelog && (
          <div className="text-sm bg-muted/30 px-2 py-1 rounded">
            {ev.changelog}
          </div>
        )}
      </div>
    </li>
  )
}