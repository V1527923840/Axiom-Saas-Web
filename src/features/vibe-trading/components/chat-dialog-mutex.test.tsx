// Tests for the ChatDialog mode mutex: goal composer and swarm are
// mutually exclusive — activating one must clear the other.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createRoot, type Root } from "react-dom/client"
import { act } from "react"
import { useSessionStore } from "../stores/session-store"
import { routeEvent } from "../services/events-stream"

vi.mock("../services/vibe-api", () => ({
  vibeApi: {
    getGoal: vi.fn().mockResolvedValue(null),
    listSwarmRuns: vi.fn().mockResolvedValue([]),
    getSwarmRun: vi.fn(),
  },
}))

vi.stubGlobal("alert", vi.fn())

vi.mock("../hooks/use-chat-stream", () => ({
  useChatStream: () => ({
    messages: [],
    streaming: false,
    error: null,
    send: vi.fn(),
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
  // 清掉上一个测试可能留下的 swarm_status / goalSnapshot / softReset 残留
  // (单例 store 跨测试共享,否则后置测试会看到前置测试塞进去的 placeholder 或
  // 真实 run,导致 mock 状态错乱)。
  useSessionStore.getState().reset()
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
})

// MoreMenu is built on the Radix-based shadcn <DropdownMenu>: it opens on
// `pointerdown` (a plain `.click()` is ignored) and portals its items to
// `document.body`, so they are queried off `document` rather than `container`.
function openMoreMenu(): void {
  const trigger = container.querySelector('button[aria-label="更多选项"]') as HTMLButtonElement | null
  expect(trigger).not.toBeNull()
  act(() => {
    trigger!.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, button: 0 }))
  })
}

function clickMenuItem(label: string): void {
  openMoreMenu()
  const items = Array.from(document.querySelectorAll('[role="menuitem"]'))
  const item = items.find((b) => b.textContent?.includes(label)) as
    | HTMLElement
    | undefined
  expect(item).toBeDefined()
  act(() => {
    item!.click()
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

  // ─── 蜂群模式占位卡片 (placeholder on mode-select) ────────────────────────
  //
  // 用户体验:选中 "启动智能体蜂群" 后应该立刻能看到卡片 (placeholder + "pending"
  // 状态),而不是干等到后端 agent 识别 swarm 前缀后真实 run 出现。如果用户已经
  // 有一个真实的 running/pending run (e.g. 刷新页面后 hydration 灌进来的),
  // 就不要再叠一个 placeholder。

  it("activating swarm injects a pending placeholder SwarmStatusCard immediately", () => {
    act(() => {
      root.render(<ChatDialog sessionId="s-1" />)
    })
    clickMenuItem("启动智能体蜂群")
    const messages = useSessionStore.getState().byId["s-1"]?.messages ?? []
    const placeholder = messages
      .filter((m) => m.type === "swarm_status")
      .map((m) => m.swarmStatus)
      .find((s) => s && s.runId === "__pending_swarm__")
    expect(placeholder).toBeDefined()
    expect(placeholder?.status).toBe("pending")
    expect(placeholder?.agents).toEqual([])
  })

  it("does NOT inject placeholder when a real swarm_status message already exists", () => {
    // Seed an existing real run (simulates hydration on session mount).
    act(() => {
      root.render(<ChatDialog sessionId="s-1" />)
    })
    act(() => {
      useSessionStore.getState().upsertSwarmStatus("s-1", {
        runId: "run-real",
        preset: "deep_research",
        status: "running",
        currentLayer: 0,
        totalLayers: 3,
        startedAt: 0,
        agents: [],
      })
    })
    clickMenuItem("启动智能体蜂群")
    const messages = useSessionStore.getState().byId["s-1"]?.messages ?? []
    const placeholder = messages
      .filter((m) => m.type === "swarm_status")
      .map((m) => m.swarmStatus)
      .find((s) => s && s.runId === "__pending_swarm__")
    expect(placeholder).toBeUndefined()
    const real = messages
      .filter((m) => m.type === "swarm_status")
      .map((m) => m.swarmStatus)
      .find((s) => s && s.runId === "run-real")
    expect(real).toBeDefined()
  })

  it("removes the placeholder when the SSE swarm.started event arrives with a real runId", () => {
    act(() => {
      root.render(<ChatDialog sessionId="s-1" />)
    })
    clickMenuItem("启动智能体蜂群")
    // Placeholder is in the store.
    expect(
      (useSessionStore.getState().byId["s-1"]?.messages ?? [])
        .some((m) => m.type === "swarm_status" && m.swarmStatus?.runId === "__pending_swarm__"),
    ).toBe(true)

    // SSE delivers the real run.
    act(() => {
      routeEvent("s-1", {
        event: "swarm.started",
        data: {
          run_id: "run-real",
          preset: "deep_research",
          status: "running",
          agents: [{ id: "planner-alpha", role: "planner" }],
          tasks: [
            { id: "task-1", agent_id: "planner-alpha", status: "running", worker_iterations: 1 },
          ],
        },
      })
    })

    const messages = useSessionStore.getState().byId["s-1"]?.messages ?? []
    expect(
      messages.some((m) => m.type === "swarm_status" && m.swarmStatus?.runId === "__pending_swarm__"),
    ).toBe(false)
    const real = messages
      .filter((m) => m.type === "swarm_status")
      .map((m) => m.swarmStatus)
      .find((s) => s && s.runId === "run-real")
    expect(real).toBeDefined()
    expect(real?.agents.length).toBe(1)
  })
})