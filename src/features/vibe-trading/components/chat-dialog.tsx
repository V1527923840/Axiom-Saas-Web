"use client"

import { Bubble, Prompts, Sender, Welcome } from "@ant-design/x"
import { Bot, Lightbulb, Sparkles, TrendingUp } from "lucide-react"
import { useState } from "react"
import type { ChatMessage } from "../hooks/use-chat-stream"
import { useChatStream } from "../hooks/use-chat-stream"

const SUGGESTIONS = [
  {
    key: "market-brief",
    icon: <TrendingUp className="h-4 w-4" />,
    label: "今日市场概览",
    description: "拉一下美股 / A 股 / 港股的当日行情速览",
  },
  {
    key: "stock-deepdive",
    icon: <Sparkles className="h-4 w-4" />,
    label: "深度分析某只股票",
    description: "基本面 + 技术面 + 资金面,给一份研报式的拆解",
  },
  {
    key: "strategy",
    icon: <Lightbulb className="h-4 w-4" />,
    label: "聊聊交易策略",
    description: "讨论仓位管理、止盈止损、风格切换思路",
  },
  {
    key: "macro",
    icon: <Bot className="h-4 w-4" />,
    label: "宏观经济解读",
    description: "利率、通胀、就业数据对资产价格的影响",
  },
]

export function ChatDialog({ sessionId }: { sessionId: string | null }) {
  const { messages, streaming, loadingHistory, error, send, cancel } =
    useChatStream(sessionId)
  const [input, setInput] = useState("")

  const handleSend = () => {
    const trimmed = input.trim()
    if (!trimmed || !sessionId || streaming) return
    void send(trimmed)
    setInput("")
  }

  // Identify the streaming assistant message so we can show loading dots
  // before the first token arrives. Once content has been written, the bubble
  // updates live as deltas stream in (no `typing` re-animation).
  const streamingAssistant = messages.find(
    (m) => m.role === "assistant" && m.content === "" && streaming,
  )
  const streamingMessageId = streamingAssistant?.id

  const bubbleItems = messages.map((m: ChatMessage) => ({
    key: m.id,
    role: m.role === "user" ? ("user" as const) : ("assistant" as const),
    content: m.content,
    loading: m.id === streamingMessageId,
  }))

  return (
    <div className="flex h-full flex-col">
      {/* Message list area */}
      <div className="flex-1 overflow-hidden">
        {!sessionId ? (
          <WelcomeState />
        ) : loadingHistory ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            加载历史消息…
          </div>
        ) : messages.length === 0 ? (
          <WelcomeState onPromptClick={(text) => setInput(text)} />
        ) : (
          <Bubble.List
            items={bubbleItems}
            autoScroll
            className="h-full px-4 py-4"
            roles={{
              user: {
                placement: "end",
                variant: "filled",
                shape: "default",
              },
              assistant: {
                placement: "start",
                variant: "filled",
                shape: "default",
              },
            }}
          />
        )}
      </div>

      {error && (
        <div className="text-destructive px-3 py-1 text-sm">错误: {error}</div>
      )}

      {/* Sender */}
      <div className="border-t p-3">
        <Sender
          value={input}
          onChange={setInput}
          onSubmit={handleSend}
          onCancel={cancel}
          loading={streaming}
          submitType="shiftEnter"
          placeholder={sessionId ? "输入消息，Shift+Enter 发送…" : "请先在左侧选择或新建会话"}
          disabled={!sessionId || loadingHistory}
          className="w-full"
        />
      </div>
    </div>
  )
}

function WelcomeState({
  onPromptClick,
}: {
  onPromptClick?: (text: string) => void
}) {
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
          className="mb-6"
        />
        {onPromptClick && (
          <Prompts
            title="试试这些问题"
            wrap
            items={SUGGESTIONS.map((s) => ({
              key: s.key,
              icon: s.icon,
              label: s.label,
              description: s.description,
            }))}
            onItemClick={(info: { data: { label?: unknown } }) =>
              onPromptClick(String(info.data.label))
            }
          />
        )}
      </div>
    </div>
  )
}