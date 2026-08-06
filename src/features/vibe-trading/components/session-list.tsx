import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import type { AiSession } from "@/services/vibe-trading"

export function SessionList({
  sessions,
  currentId,
  onSelect,
  onNew,
  onDelete,
  loading,
}: {
  sessions: AiSession[]
  currentId: string | null
  onSelect: (id: string) => void
  onNew: () => void
  onDelete: (id: string) => void
  loading: boolean
}) {
  return (
    <div className="flex h-full flex-col border-r">
      <div className="p-3 border-b">
        <Button onClick={onNew} className="w-full" disabled={loading}>
          新建会话
        </Button>
      </div>
      <ScrollArea className="flex-1">
        {sessions.map((s) => (
          <div
            key={s.id}
            className={cn(
              "group flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-muted",
              currentId === s.id && "bg-muted",
            )}
            onClick={() => onSelect(s.id)}
          >
            <div className="truncate text-sm">{s.title || "新会话"}</div>
            <Button
              variant="ghost"
              size="sm"
              className="opacity-0 group-hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(s.id)
              }}
            >
              删除
            </Button>
          </div>
        ))}
      </ScrollArea>
    </div>
  )
}