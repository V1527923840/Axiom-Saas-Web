// Tests for the ChatDialog goal composer "no-session" path.
//
// Verifies the bug fix: when the user activates 目标设定模式 (goalComposerActive)
// without an existing session and submits an objective, the component must
// transparently create a session via `onCreateSessionOnly`, persist the
// objective as `pendingGoalObjective`, and NOT alert the user to "send a
// message first". After the session is created, a useEffect should call
// createGoalAction(objective) and then send the kickoff prompt.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createRoot, type Root } from "react-dom/client"
import { act } from "react"

// `vi.hoisted` lifts these vi.fn() instances to the top of the module so
// they exist before the `vi.mock` factories run.
const { submitMessageMock, createGoalMock, alertSpy } = vi.hoisted(() => ({
  submitMessageMock: vi.fn(),
  createGoalMock: vi.fn(),
  alertSpy: vi.fn(),
}))

vi.mock("@/services/vibe-trading", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("@/services/vibe-trading")
  return {
    ...actual,
    submitMessage: (...args: unknown[]) => submitMessageMock(...args),
  }
})

vi.mock("../services/vibe-api", () => ({
  vibeApi: {
    uploadFile: vi.fn(),
    createGoal: (...args: unknown[]) => createGoalMock(...args),
    getGoal: vi.fn().mockResolvedValue(null),
    updateGoal: vi.fn(),
    addGoalEvidence: vi.fn(),
    updateGoalStatus: vi.fn(),
    listSwarmPresets: vi.fn().mockResolvedValue([]),
    createSwarmRun: vi.fn(),
    listSwarmRuns: vi.fn().mockResolvedValue([]),
    getSwarmRun: vi.fn(),
    cancelSwarmRun: vi.fn(),
    retrySwarmRun: vi.fn(),
  },
}))

vi.stubGlobal("alert", alertSpy)

// Use vi.hoisted to define the use-chat-stream mock implementation lazily.
const useChatStreamModule = vi.hoisted(() => ({
  sendFn: (_content: string) => {
    // Replaced in beforeEach with the actual hoisted mock.
  },
}))

vi.mock("../hooks/use-chat-stream", () => ({
  useChatStream: () => ({
    messages: [],
    streaming: false,
    error: null,
    send: (content: string) => useChatStreamModule.sendFn(content),
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
  createGoalMock.mockReset()
  alertSpy.mockReset()
  // Wire the hoisted send to forward into submitMessageMock.
  useChatStreamModule.sendFn = (content: string) => {
    submitMessageMock({ content })
  }
  createGoalMock.mockResolvedValue({
    goal: {
      goal_id: "g-1",
      session_id: "s-1",
      objective: "test",
      status: "active",
      ui_summary: "test",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    criteria: [],
    evidence: [],
    evidence_count: 0,
  })
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
})

function clickNewGoal(): void {
  const trigger = container.querySelector('button[aria-label="更多选项"]') as HTMLButtonElement | null
  expect(trigger).not.toBeNull()
  act(() => {
    trigger!.click()
  })
  const items = Array.from(container.querySelectorAll("button"))
  const goalBtn = items.find((b) => b.textContent?.includes("新建研究目标")) as
    | HTMLButtonElement
    | undefined
  expect(goalBtn).toBeDefined()
  act(() => {
    goalBtn!.click()
  })
}

function setInputValue(text: string): void {
  const input = container.querySelector('input[data-testid="sender-input"]') as HTMLInputElement
  act(() => {
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value",
    )?.set
    setter?.call(input, text)
    input.dispatchEvent(new Event("input", { bubbles: true }))
  })
}

function clickSubmit(): void {
  const submit = container.querySelector('button[data-testid="sender-submit"]') as HTMLButtonElement
  act(() => {
    submit.click()
  })
}

describe("ChatDialog goal composer with no session", () => {
  it("activates goal composer mode via MoreMenu", () => {
    act(() => {
      root.render(<ChatDialog sessionId={null} />)
    })
    clickNewGoal()
    expect(container.textContent).toContain("目标模式")
  })

  it("calls onCreateSessionOnly instead of alerting when submitting without a session", () => {
    const onCreateSessionOnly = vi.fn().mockResolvedValue(undefined)
    act(() => {
      root.render(
        <ChatDialog sessionId={null} onCreateSessionOnly={onCreateSessionOnly} />,
      )
    })
    clickNewGoal()
    setInputValue("分析 2024 年 A 股新能源板块")
    clickSubmit()
    // The bug fix: must NOT alert the user to send a message first.
    expect(alertSpy).not.toHaveBeenCalled()
    // Must delegate session creation to the parent.
    expect(onCreateSessionOnly).toHaveBeenCalledTimes(1)
    // No direct POST /messages happens before the session exists.
    expect(submitMessageMock).not.toHaveBeenCalled()
    // No direct POST /goal happens before the session exists.
    expect(createGoalMock).not.toHaveBeenCalled()
  })

  it("creates goal and sends kickoff after the parent provides a sessionId", async () => {
    const onCreateSessionOnly = vi.fn().mockResolvedValue(undefined)
    act(() => {
      root.render(
        <ChatDialog sessionId={null} onCreateSessionOnly={onCreateSessionOnly} />,
      )
    })
    clickNewGoal()
    setInputValue("分析 2024 年 A 股新能源板块")
    clickSubmit()
    // Simulate parent propagating the new sessionId.
    await act(async () => {
      root.render(
        <ChatDialog sessionId="s-new" onCreateSessionOnly={onCreateSessionOnly} />,
      )
      // Flush any pending microtasks (effect's async IIFE).
      await new Promise((r) => setTimeout(r, 0))
    })
    // After session appears, the useEffect should call createGoalAction (POST /goal)
    // and then send the kickoff prompt (POST /messages).
    expect(createGoalMock).toHaveBeenCalledTimes(1)
    expect(createGoalMock).toHaveBeenCalledWith(
      "s-new",
      expect.objectContaining({ objective: "分析 2024 年 A 股新能源板块" }),
    )
    expect(submitMessageMock).toHaveBeenCalledTimes(1)
    const sentArg = submitMessageMock.mock.calls[0][0] as { content: string }
    expect(sentArg.content).toContain("Goal: 分析 2024 年 A 股新能源板块")
  })
})