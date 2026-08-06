import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import type { ChatMessage } from "../hooks/use-chat-stream"
import { useChatStream } from "../hooks/use-chat-stream"
import { MessageBubble } from "./message-bubble"

export function ChatDialog({ sessionId }: { sessionId: string | null }) {
  const { messages, streaming, error, send, cancel, reset } = useChatStream(sessionId)
  const [input, setInput] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    reset()
  }, [sessionId, reset])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" })
  }, [messages])

  const handleSend = () => {
    const trimmed = input.trim()
    if (!trimmed || !sessionId || streaming) return
    void send(trimmed)
    setInput("")
  }

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
        {messages.map((m: ChatMessage) => (
          <MessageBubble key={m.id} message={m} />
        ))}
        {error && (
          <div className="text-destructive text-sm px-3">错误: {error}</div>
        )}
      </div>
      <div className="border-t p-3 flex gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="输入消息…"
          className="min-h-[60px]"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !streaming) {
              e.preventDefault()
              handleSend()
            }
          }}
        />
        {streaming ? (
          <Button variant="destructive" onClick={cancel}>
            停止
          </Button>
        ) : (
          <Button disabled={!input.trim() || !sessionId} onClick={handleSend}>
            发送
          </Button>
        )}
      </div>
    </div>
  )
}