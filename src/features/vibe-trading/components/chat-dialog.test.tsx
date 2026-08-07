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
})
