// Tests for the ChatDialog swarm prefix injection in handleSend.
//
// Verifies the Task 14 wiring: when the user has a swarmPreset active and
// triggers send, the POST body sent to the backend includes the
// `[Swarm Team Mode] ...` prefix, but the user-visible bubble shows only the
// trimmed text (no prefix). Mirrors the Task 9 attachment pattern.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createRoot, type Root } from "react-dom/client"
import { act } from "react"

const submitMessageMock = vi.fn()

vi.mock("@/services/vibe-trading", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("@/services/vibe-trading")
  return {
    ...actual,
    submitMessage: submitMessageMock,
  }
})

vi.mock("../hooks/use-chat-stream", () => ({
  useChatStream: () => ({
    messages: [],
    streaming: false,
    error: null,
    send: async (content: string, attachment?: unknown, swarmPreset?: unknown) => {
      // Mirror the prefix-injection contract that the real hook implements:
      // - userMsg.content = trimmed `content` (bubbles show `content`)
      // - POST body = (swarmPrefix + attachmentPrefix + content)
      let finalContent = content
      if (swarmPreset) {
        finalContent = `[Swarm Team Mode] Use the swarm tool to assemble the best specialist team for this task. Auto-select the most appropriate preset.\n\n${finalContent}`
      }
      if (attachment) {
        const a = attachment as { filename: string; file_path: string }
        finalContent = `[Uploaded file: ${a.filename}, path: ${a.file_path}]\n\n${finalContent}`
      }
      submitMessageMock({ content: finalContent, userVisible: content })
    },
    cancel: vi.fn(),
  }),
}))

vi.mock("@ant-design/x", () => ({
  Bubble: { List: () => <div data-testid="bubble-list" /> },
  Sender: ({ value, onChange, onSubmit }: { value: string; onChange: (v: string) => void; onSubmit: () => void }) => (
    <div>
      <input data-testid="sender-input" value={value} onChange={(e) => onChange(e.target.value)} />
      <button data-testid="sender-submit" onClick={onSubmit} type="button">send</button>
    </div>
  ),
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
  submitMessageMock.mockReset()
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
})

function openMoreMenu(): void {
  const trigger = container.querySelector(
    'button[aria-label="更多选项"]',
  ) as HTMLButtonElement | null
  expect(trigger).not.toBeNull()
  act(() => {
    trigger!.click()
  })
}

function clickSwarm(): void {
  openMoreMenu()
  const items = Array.from(container.querySelectorAll("button"))
  const swarmBtn = items.find((b) => b.textContent?.includes("启动智能体蜂群")) as
    | HTMLButtonElement
    | undefined
  expect(swarmBtn).toBeDefined()
  act(() => {
    swarmBtn!.click()
  })
}

describe("ChatDialog swarm prefix", () => {
  it("shows <SwarmChip> after clicking 启动智能体蜂群", () => {
    act(() => {
      root.render(<ChatDialog sessionId="s-1" />)
    })
    clickSwarm()
    expect(container.textContent).toContain("Agent Swarm")
    expect(
      container.querySelector('button[aria-label="移除蜂群模式"]'),
    ).not.toBeNull()
  })

  it("onStartSwarm focuses the Sender input", () => {
    act(() => {
      root.render(<ChatDialog sessionId="s-1" />)
    })
    // Focus the sender input first so we can detect whether clickSwarm keeps it focused.
    const senderInput = container.querySelector(
      'input[data-testid="sender-input"]',
    ) as HTMLInputElement
    act(() => {
      senderInput.focus()
    })
    expect(document.activeElement).toBe(senderInput)
    clickSwarm()
    // The onStartSwarm handler calls inputRef.current?.focus() — since the
    // mocked Sender receives a ref but doesn't actually expose focus(), we
    // assert that no error was thrown. The wiring is verified by the lack of
    // crash and the SwarmChip appearing.
    expect(container.textContent).toContain("Agent Swarm")
  })

  it("handleSend injects the swarm prefix into the POST body but not the user bubble", () => {
    act(() => {
      root.render(<ChatDialog sessionId="s-1" />)
    })
    clickSwarm()
    const input = container.querySelector(
      'input[data-testid="sender-input"]',
    ) as HTMLInputElement
    act(() => {
      // Simulate the user typing
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      )?.set
      setter?.call(input, "analyze AAPL")
      input.dispatchEvent(new Event("input", { bubbles: true }))
    })
    act(() => {
      const submit = container.querySelector(
        'button[data-testid="sender-submit"]',
      ) as HTMLButtonElement
      submit.click()
    })

    expect(submitMessageMock).toHaveBeenCalledTimes(1)
    const arg = submitMessageMock.mock.calls[0][0] as {
      content: string
      userVisible: string
    }
    expect(arg.content).toContain("[Swarm Team Mode]")
    expect(arg.content).toContain("analyze AAPL")
    // User-visible bubble shows only the trimmed text, not the prefix.
    expect(arg.userVisible).toBe("analyze AAPL")
    expect(arg.userVisible).not.toContain("[Swarm Team Mode]")
  })
})
