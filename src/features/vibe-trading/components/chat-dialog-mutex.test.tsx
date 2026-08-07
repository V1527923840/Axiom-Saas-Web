// Tests for the ChatDialog mode mutex: goal composer and swarm are
// mutually exclusive — activating one must clear the other.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createRoot, type Root } from "react-dom/client"
import { act } from "react"

const submitMessageMock = vi.fn()
const createGoalMock = vi.fn()

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

vi.stubGlobal("alert", vi.fn())

vi.mock("../hooks/use-chat-stream", () => ({
  useChatStream: () => ({
    messages: [],
    streaming: false,
    error: null,
    send: (content: string) => {
      submitMessageMock({ content })
    },
    cancel: vi.fn(),
  }),
}))

vi.mock("@ant-design/x", () => ({
  Bubble: { List: () => <div data-testid="bubble-list" /> },
  Sender: () => <div data-testid="sender-input" />,
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
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
})

function openMoreMenu(): void {
  const trigger = container.querySelector('button[aria-label="更多选项"]') as HTMLButtonElement | null
  expect(trigger).not.toBeNull()
  act(() => {
    trigger!.click()
  })
}

function clickMenuItem(label: string): void {
  openMoreMenu()
  const items = Array.from(container.querySelectorAll("button"))
  const btn = items.find((b) => b.textContent?.includes(label)) as
    | HTMLButtonElement
    | undefined
  expect(btn).toBeDefined()
  act(() => {
    btn!.click()
  })
}

function hasChipByLabel(label: string): boolean {
  // SwarmChip / GoalComposerChip / GoalChip all use rounded-lg spans
  // containing their identifying text. A simple textContent scan is fine.
  return (container.textContent ?? "").includes(label)
}

describe("ChatDialog goal/swarm mutex", () => {
  it("activating swarm shows SwarmChip", () => {
    act(() => {
      root.render(<ChatDialog sessionId="s-1" />)
    })
    clickMenuItem("启动智能体蜂群")
    expect(hasChipByLabel("Agent Swarm")).toBe(true)
    expect(hasChipByLabel("目标模式")).toBe(false)
  })

  it("activating goal composer shows GoalComposerChip", () => {
    act(() => {
      root.render(<ChatDialog sessionId="s-1" />)
    })
    clickMenuItem("新建研究目标")
    expect(hasChipByLabel("目标模式")).toBe(true)
    expect(hasChipByLabel("Agent Swarm")).toBe(false)
  })

  it("activating goal composer clears any active swarm", () => {
    act(() => {
      root.render(<ChatDialog sessionId="s-1" />)
    })
    clickMenuItem("启动智能体蜂群")
    expect(hasChipByLabel("Agent Swarm")).toBe(true)
    clickMenuItem("新建研究目标")
    // Mutex: SwarmChip should be gone, GoalComposerChip should be present.
    expect(hasChipByLabel("目标模式")).toBe(true)
    expect(hasChipByLabel("Agent Swarm")).toBe(false)
  })

  it("activating swarm clears any active goal composer", () => {
    act(() => {
      root.render(<ChatDialog sessionId="s-1" />)
    })
    clickMenuItem("新建研究目标")
    expect(hasChipByLabel("目标模式")).toBe(true)
    clickMenuItem("启动智能体蜂群")
    expect(hasChipByLabel("Agent Swarm")).toBe(true)
    expect(hasChipByLabel("目标模式")).toBe(false)
  })
})