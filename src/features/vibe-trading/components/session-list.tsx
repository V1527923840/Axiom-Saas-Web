"use client"

import { Conversations } from "@ant-design/x"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
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
  const items = sessions.map((s) => ({
    key: s.id,
    label: s.title || "新会话",
    timestamp: s.lastActiveAt ? new Date(s.lastActiveAt).getTime() : undefined,
  }))

  return (
    <div className="flex h-full w-72 flex-col border-r">
      <div className="p-3 border-b">
        <Button
          onClick={onNew}
          disabled={loading}
          className="w-full"
          size="sm"
        >
          <Plus className="mr-1 h-4 w-4" />
          新建会话
        </Button>
      </div>
      <div className="flex-1 overflow-hidden">
        <Conversations
          items={items}
          activeKey={currentId ?? undefined}
          onActiveChange={(key: string | number) => onSelect(String(key))}
          menu={(item: { key: string }) => ({
            trigger: ["hover"],
            items: [
              {
                key: "delete",
                label: "删除",
                danger: true,
                onClick: () => onDelete(item.key),
              },
            ],
          })}
          className="h-full"
          styles={{
            item: { paddingInline: 12 },
          }}
        />
      </div>
    </div>
  )
}