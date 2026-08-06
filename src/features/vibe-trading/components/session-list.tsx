"use client"

import { Conversations } from "@ant-design/x"
import { Pencil, Plus, Trash2 } from "lucide-react"
import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { AiSession } from "@/services/vibe-trading"

export function SessionList({
  sessions,
  currentId,
  onSelect,
  onNew,
  onDelete,
  onRename,
  loading,
}: {
  sessions: AiSession[]
  currentId: string | null
  onSelect: (id: string) => void
  onNew: () => void
  onDelete: (id: string) => void
  onRename: (id: string, newTitle: string) => Promise<void>
  loading: boolean
}) {
  const [editingId, setEditingId] = useState<string | null>(null)

  const items = sessions.map((s) => ({
    key: s.id,
    label:
      editingId === s.id ? (
        <SessionRenameInput
          initial={s.title ?? ""}
          onCommit={async (v) => {
            setEditingId(null)
            const t = v.trim()
            if (t && t !== s.title) {
              try {
                await onRename(s.id, t)
              } catch {
                // 重命名失败时列表保留原标题,错误由上层 hook 上报
              }
            }
          }}
          onCancel={() => setEditingId(null)}
        />
      ) : (
        s.title || "新会话"
      ),
    timestamp: s.lastActiveAt ? new Date(s.lastActiveAt).getTime() : undefined,
  }))

  return (
    <div className="flex h-full min-h-0 w-72 flex-col border-r">
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
      <div className="flex-1 min-h-0 overflow-hidden">
        <Conversations
          items={items}
          activeKey={currentId ?? undefined}
          onActiveChange={(key: string | number) => {
            if (editingId) return // 编辑态禁止切换
            onSelect(String(key))
          }}
          menu={(item: { key: string }) => ({
            items: [
              {
                key: "rename",
                label: "重命名",
                icon: <Pencil className="h-3.5 w-3.5" />,
                onClick: () => setEditingId(item.key),
              },
              { type: "divider" as const },
              {
                key: "delete",
                label: "删除",
                icon: <Trash2 className="h-3.5 w-3.5" />,
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

function SessionRenameInput({
  initial,
  onCommit,
  onCancel,
}: {
  initial: string
  onCommit: (value: string) => void | Promise<void>
  onCancel: () => void
}) {
  // Enter/Escape 都会卸载本组件,而卸载本身触发一次 blur。若不加锁,
  // Escape 取消后紧接着的 blur 仍会用输入框的值提交,取消就失效了。
  const settled = useRef(false)

  return (
    <Input
      autoFocus
      defaultValue={initial}
      className="h-6 text-sm"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault()
          if (settled.current) return
          settled.current = true
          void onCommit((e.target as HTMLInputElement).value)
        } else if (e.key === "Escape") {
          e.preventDefault()
          if (settled.current) return
          settled.current = true
          onCancel()
        }
      }}
      onBlur={(e) => {
        if (settled.current) return
        settled.current = true
        void onCommit(e.target.value)
      }}
    />
  )
}
