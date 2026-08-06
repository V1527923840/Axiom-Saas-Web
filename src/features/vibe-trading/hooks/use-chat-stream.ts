import { useCallback, useRef, useState } from "react"
import { sendMessageStream } from "@/services/vibe-trading"

export type ChatMessage = {
  id: string
  role: "user" | "assistant"
  content: string
  createdAt: string
}

export function useChatStream(sessionId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const send = useCallback(
    async (content: string) => {
      if (!sessionId) return
      setError(null)
      const userMsg: ChatMessage = {
        id: `u-${Date.now()}`,
        role: "user",
        content,
        createdAt: new Date().toISOString(),
      }
      const assistantMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: "",
        createdAt: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, userMsg, assistantMsg])
      setStreaming(true)
      const controller = new AbortController()
      abortRef.current = controller
      try {
        for await (const chunk of sendMessageStream(sessionId, content, {
          signal: controller.signal,
        })) {
          if (chunk.type === "message") {
            const delta = chunk.data.delta ?? ""
            if (!delta) continue
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsg.id ? { ...m, content: m.content + delta } : m,
              ),
            )
          } else if (chunk.type === "error") {
            setError(chunk.data.message ?? "Stream error")
          } else if (chunk.type === "done") {
            // stream finished — no-op
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to send message")
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null
        }
        setStreaming(false)
      }
    },
    [sessionId],
  )

  const cancel = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setStreaming(false)
  }, [])

  const reset = useCallback(() => {
    cancel()
    setMessages([])
    setError(null)
  }, [cancel])

  return { messages, streaming, error, send, cancel, reset }
}