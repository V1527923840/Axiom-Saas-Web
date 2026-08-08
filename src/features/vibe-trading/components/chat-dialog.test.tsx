// Tests for <ChatDialog>'s `bubbleItems` mapping.
//
// Scope note: these tests exercise the *mapping* — messages[] -> Bubble.List
// items — not antd-x's own rendering. `@ant-design/x` is mocked with a minimal
// Bubble.List that applies each item's `contentRender` (falling back to
// `content`), which is exactly the contract chat-dialog relies on. Sender /
// Welcome / Prompts are inert stubs so the component tree mounts in jsdom.
//
// `useChatStream` is mocked to feed a fixed message list; the Zustand store is
// left real (untouched slots yield `undefined`, so the DEV debug panel and the
// goal chip stay hidden).

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createRoot, type Root } from "react-dom/client"
import { act } from "react"
import type { ChatMessage } from "../stores/session-store"
import type { SwarmRunStatus } from "../lib/vibe-types"

const messagesRef: { current: ChatMessage[] } = { current: [] }

vi.mock("../hooks/use-chat-stream", () => ({
  useChatStream: () => ({
    messages: messagesRef.current,
    streaming: false,
    error: null,
    send: vi.fn(),
    cancel: vi.fn(),
  }),
}))

vi.mock("@ant-design/x", () => ({
  Bubble: {
    List: ({
      items,
    }: {
      items: Array<{
        key: string
        content: string
        contentRender?: (content: string) => React.ReactNode
      }>
    }) => (
      <div data-testid="bubble-list">
        {items.map((item) => (
          <div key={item.key} data-testid="bubble-item">
            {item.contentRender ? item.contentRender(item.content) : item.content}
          </div>
        ))}
      </div>
    ),
  },
  Sender: () => <div data-testid="sender" />,
  Welcome: () => <div data-testid="welcome" />,
  Prompts: () => <div data-testid="prompts" />,
}))

const { ChatDialog } = await import("./chat-dialog")

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement("div")
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  messagesRef.current = []
  act(() => {
    root.unmount()
  })
  container.remove()
})

function render(messages: ChatMessage[]): void {
  messagesRef.current = messages
  act(() => {
    root.render(<ChatDialog sessionId="s-1" />)
  })
}

function makeSwarmStatus(overrides: Partial<SwarmRunStatus> = {}): SwarmRunStatus {
  return {
    runId: "run-1",
    preset: "deep_research",
    status: "running",
    currentLayer: 0,
    totalLayers: 2,
    startedAt: 0,
    agents: [
      { agentId: "planner-alpha", status: "done", role: "planner" },
      { agentId: "researcher-beta", status: "running" },
    ],
    ...overrides,
  }
}

describe("ChatDialog bubbleItems", () => {
  it("renders a SwarmStatusCard for a swarm_status message", () => {
    render([
      {
        id: "m-swarm",
        role: "assistant",
        content: "",
        createdAt: "2026-08-07T00:00:00.000Z",
        type: "swarm_status",
        swarmStatus: makeSwarmStatus(),
      },
    ])

    const text = container.textContent ?? ""
    // SwarmStatusCard's agent table: preset header + per-agent rows.
    expect(text).toContain("deep_research")
    expect(text).toContain("planner-alpha")
    expect(text).toContain("researcher-beta")
    // Column headers are unique to SwarmStatusCard, not to AiMessageContent.
    expect(text).toContain("耗时")
    expect(container.querySelector("progress")).not.toBeNull()
  })

  it("still renders text assistant messages through AiMessageContent", () => {
    render([
      {
        id: "m-text",
        role: "assistant",
        content: "hello **world**",
        createdAt: "2026-08-07T00:00:00.000Z",
        type: "text",
      },
    ])

    // AiMessageContent runs the content through react-markdown + GFM, so the
    // bold marker becomes a <strong>. A raw `content` passthrough would not.
    const strong = container.querySelector(".ai-md strong")
    expect(strong).not.toBeNull()
    expect(strong!.textContent).toBe("world")
    expect(container.querySelector("progress")).toBeNull()
  })

  // ────── 重新进入会话: prefix 渲染为 FileCard ───────────────
  //
  // 回归:之前 reload 后 m.attachment 是 undefined (新消息才写),
  // contentRender 走 undefined 分支,气泡直接渲染 "[Uploaded file: ...]"
  // 字符串给用户看。修复后即使没有 attachment 字段,也从 content 里 parse
  // 出 prefix 渲染成 FileCard。
  describe("ChatDialog user bubble — reloaded session", () => {
    it("renders FileCard when content has [Uploaded file: ...] prefix but no attachment field", () => {
      // 模拟"重新进入会话"场景:服务端返回的 content 含 prefix,
      // 但 m.attachment 是 undefined (新消息才有,reload 后丢了)。
      const reloadedContent =
        "[Uploaded file: 财联社早知道.pdf, path: uploads/bbb5df2d93b1431e91f707068cdb943c.pdf]\n\n帮我分析这份文件"
      render([
        {
          id: "m-user-reload",
          role: "user",
          content: reloadedContent,
          createdAt: "2026-08-07T00:00:00.000Z",
          // 注意:attachment 故意不传 —— 这就是 reload 后的真实状态
        },
      ])

      // 必须渲染 FileCard(用我们新加的 data-testid)
      const fileCard = container.querySelector('[data-testid="file-card"]')
      expect(fileCard).not.toBeNull()
      expect(fileCard!.textContent).toContain("财联社早知道.pdf")
      expect(fileCard!.textContent).toContain("uploads/bbb5df2d93b1431e91f707068cdb943c.pdf")

      // 剩余文字(content 里 prefix 后面的部分)必须显示出来,不能丢
      expect(container.textContent).toContain("帮我分析这份文件")

      // 关键回归断言:气泡里**不**应该出现原始的 "[Uploaded file:" 字符串
      // (因为已经被解析并替换成 FileCard 了)
      // 注意 textContent 里会有 "[Uploaded file" 来自 aria-label "已上传文件 ..."
      // 所以精确断言原始 prefix 串不在 DOM 里 —— 我们检查 file-card 之外
      // 的位置没有这段文本。
      const bubbleItems = container.querySelectorAll('[data-testid="bubble-item"]')
      expect(bubbleItems.length).toBeGreaterThan(0)
      const bubbleText = bubbleItems[0].textContent ?? ""
      // FileCard 的 filename 行包含 "财联社早知道.pdf",但 prefix 字符串
      // "[Uploaded file:" 不应该再出现(它是 prefix marker 本身)
      expect(bubbleText).not.toContain("[Uploaded file:")
    })

    it("prefers m.attachment field over parsed prefix when both are present", () => {
      // 当 m.attachment 存在时,直接用它,不重新 parse content。
      // (新消息场景:content 是 trimmed 文本,但 attachment 字段写入了完整信息。)
      render([
        {
          id: "m-user-new",
          role: "user",
          content: "帮我分析这份文件",
          createdAt: "2026-08-07T00:00:00.000Z",
          attachment: {
            filename: "explicit.pdf",
            file_path: "uploads/explicit.pdf",
          },
        },
      ])

      const fileCard = container.querySelector('[data-testid="file-card"]')
      expect(fileCard).not.toBeNull()
      expect(fileCard!.textContent).toContain("explicit.pdf")
      expect(container.textContent).toContain("帮我分析这份文件")
    })

    it("renders plain text when no attachment field and no prefix in content", () => {
      // 普通 user 消息没有附件时,走纯文本渲染分支。
      render([
        {
          id: "m-user-plain",
          role: "user",
          content: "你好,普通的问候",
          createdAt: "2026-08-07T00:00:00.000Z",
        },
      ])

      expect(container.querySelector('[data-testid="file-card"]')).toBeNull()
      expect(container.textContent).toContain("你好,普通的问候")
    })
  })
})
