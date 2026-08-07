import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { ThinkingBlock } from "./thinking-block"
import { ToolCallBlock } from "./tool-call-block"
import { parseMessageSegments } from "../lib/parse-message"

/**
 * AI 消息的渲染器:把 content 解析成 [thinking | tool | main] 段,
 * 思考块 / 工具调用各自走专属折叠组件,主内容走 react-markdown + GFM。
 *
 * 设计:
 * - 解析在每次渲染时跑(纯函数,O(n)),React 按 content 已做 memo 不会无谓重渲染。
 * - 空 main 段(<=0 字符)直接跳过,不显示空 markdown 框。
 * - 流式场景下未闭合的 <think>/<tool_call> 段被解析器视为开块,UI 自然延展。
 */
export function AiMessageContent({ content }: { content: string }) {
  const segments = parseMessageSegments(content)
  return (
    <>
      {segments.map((seg, i) => {
        if (seg.type === "thinking") {
          return <ThinkingBlock key={`t-${i}`} content={seg.content} closed={seg.closed} />
        }
        if (seg.type === "tool") {
          return <ToolCallBlock key={`x-${i}`} content={seg.content} />
        }
        if (!seg.content.trim()) return null
        return (
          <div key={`m-${i}`} className="ai-md">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                // 代码块:黑底等宽,可滚动
                pre: ({ children, ...rest }) => (
                  <pre
                    {...rest}
                    className="bg-muted overflow-x-auto rounded-md p-3 text-xs leading-relaxed"
                  >
                    {children}
                  </pre>
                ),
                code: ({ children, className, ...rest }) => {
                  // 行内 code vs 代码块:代码块的 className 会被 react-markdown 加 "language-xxx"
                  const isBlock = typeof className === "string" && className.startsWith("language-")
                  if (isBlock) {
                    return (
                      <code className={className} {...rest}>
                        {children}
                      </code>
                    )
                  }
                  return (
                    <code
                      className="bg-muted rounded px-1 py-0.5 font-mono text-xs"
                      {...rest}
                    >
                      {children}
                    </code>
                  )
                },
                a: ({ children, ...rest }) => (
                  <a {...rest} target="_blank" rel="noreferrer noopener" className="text-primary underline">
                    {children}
                  </a>
                ),
                table: ({ children }) => (
                  <div className="my-2 overflow-x-auto">
                    <table className="border-collapse text-sm">{children}</table>
                  </div>
                ),
                th: ({ children }) => (
                  <th className="border-muted-foreground/30 border px-2 py-1 text-left font-medium">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="border-muted-foreground/30 border px-2 py-1">{children}</td>
                ),
              }}
            >
              {seg.content}
            </ReactMarkdown>
          </div>
        )
      })}
    </>
  )
}