import { cn } from "@/lib/utils"
import type { ChatMessage } from "../hooks/use-chat-stream"

export function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user"
  return (
    <div className={cn("flex w-full mb-2", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[70%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap break-words",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted",
        )}
      >
        {message.content || <span className="opacity-50">…</span>}
      </div>
    </div>
  )
}