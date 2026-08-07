"use client"

import { Bubble, Prompts, Sender, Welcome } from "@ant-design/x"
import { Bot, Lightbulb, Sparkles, TrendingUp } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { useChatStream } from "../hooks/use-chat-stream"

const SUGGESTIONS = [
  { key: "market-brief", icon: <TrendingUp className="h-4 w-4" />, label: "今日市场概览", description: "拉一下美股 / A 股 / 港股的当日行情速览" },
  { key: "stock-deepdive", icon: <Sparkles className="h-4 w-4" />, label: "深度分析某只股票", description: "基本面 + 技术面 + 资金面,给一份研报式的拆解" },
  { key: "strategy", icon: <Lightbulb className="h-4 w-4" />, label: "聊聊交易策略", description: "讨论仓位管理、止盈止损、风格切换思路" },
  { key: "macro", icon: <Bot className="h-4 w-4" />, label: "宏观经济解读", description: "利率、通胀、就业数据对资产价格的影响" },
]

export function ChatDialog({
  sessionId,
  title,
  pendingMessage,
  onPendingMessageConsumed,
  onCreateAndSend,
}: {
  sessionId: string | null
  title?: string | null
  pendingMessage?: string | null
  onPendingMessageConsumed?: () => void
  onCreateAndSend?: (content: string) => Promise<void> | void
}) {
  const { messages, streaming, error, send, cancel } =
    useChatStream(sessionId, title)
  const [input, setInput] = useState("")

  const handleSend = () => {
    const trimmed = input.trim()
    if (!trimmed) return
    if (sessionId) {
      // 有会话:正常提交。streaming 由 store 内部拒绝(per-session 串行保护)。
      if (streaming) return
      void send(trimmed)
    } else if (onCreateAndSend) {
      // 无会话:让上层建一个新会话并把内容作为 pendingMessage 自动发出。
      void onCreateAndSend(trimmed)
    } else {
      return
    }
    setInput("")
  }

  // pendingMessage 自动发送（保留 v1 行为）
  const consumedRef = useRef<string | null>(null)
  useEffect(() => {
    if (!pendingMessage || !sessionId) return
    if (consumedRef.current === pendingMessage) return
    consumedRef.current = pendingMessage
    void send(pendingMessage)
    onPendingMessageConsumed?.()
  }, [pendingMessage, sessionId, send, onPendingMessageConsumed])

  const bubbleItems = messages.map((m) => ({
    key: m.id,
    role: (m.role === "user" ? "user" : "ai") as "user" | "ai",
    content: m.content,
    loading: false,   // 占位消息的 loading 动效不再用 per-msg；流式已结束的 bubble 不再闪
  }))

  // 只要有消息就显示对话,空消息一律走欢迎态。
  // 不再用 loadingHistory 阻塞 — 历史是异步加载的,拉回来前就显示空列表/欢迎态,
  // 期间用户也可以照常输入;流式事件直接 append 到 Bubble.List,实时刷新。
  const showWelcome = messages.length === 0

  return (
    <div className="flex h-full min-h-0 flex-1 min-w-0 flex-col">
      <div className="flex-1 min-h-0 overflow-hidden">
        {showWelcome ? (
          <WelcomeState />
        ) : (
          <Bubble.List
            items={bubbleItems}
            autoScroll
            className="h-full px-4 py-4"
            role={{
              user: { placement: "end", variant: "filled", shape: "default" },
              ai: { placement: "start", variant: "filled", shape: "default" },
            }}
          />
        )}
      </div>

      {error && (
        <div className="text-destructive px-3 py-1 text-sm">错误: {error}</div>
      )}

      <div className="w-full shrink-0 border-t p-3">
        <Sender
          value={input}
          onChange={setInput}
          onSubmit={handleSend}
          onCancel={cancel}
          loading={streaming}
          submitType="shiftEnter"
          placeholder={
            sessionId
              ? "输入消息，Shift+Enter 发送…"
              : "输入消息,自动创建会话…"
          }
          autoFocus
          className="w-full"
        />
      </div>
    </div>
  )
}

function WelcomeState() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 py-8">
      <div className="w-full max-w-2xl">
        <Welcome
          icon={
            <div className="bg-primary text-primary-foreground flex h-12 w-12 items-center justify-center rounded-full">
              <Bot className="h-6 w-6" />
            </div>
          }
          title="AI 智能体"
          description="用自然语言提问,获取金融市场研究与交易思路。"
          className="mb-8"
        />
        <Prompts
          title="试试这些问题"
          wrap
          items={SUGGESTIONS.map((s) => ({ key: s.key, icon: s.icon, label: s.label, description: s.description }))}
          onItemClick={(info: { data: { label?: unknown } }) => {
            window.dispatchEvent(
              new CustomEvent("vibe-trading:prompt-select", {
                detail: { text: String(info.data.label ?? "") },
              }),
            )
          }}
        />
      </div>
    </div>
  )
}