// Tests for ChatDialog's "Sender stays in cancel-mode while a goal is active".
//
// Context: a single goal-attempt can be composed of multiple sub-attempts
// (think → tool → respond). Between sub-attempts the upstream sends
// `attempt.completed` for the previous attempt, which flips store.streaming
// back to false. From the user's perspective the AI is still "running" the
// goal, but the chat-level streaming flag is false.
//
// The Sender's `loading` prop drives whether @ant-design/x shows the red
// square (cancel) or the up arrow (send). Wiring it to `streaming` alone
// makes the cancel button flicker between sub-attempts. The user wants the
// cancel button to stay visible any time the goal is still active, so the
// user can abort at any time during the goal's lifecycle.
//
// We capture the `loading` prop by mounting a probe that renders Sender
// directly and observes the loading prop the parent passed to it.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createRoot, type Root } from "react-dom/client"
import { act } from "react"

const streamingRef: { current: boolean } = { current: false }
const goalSnapshotRef: { current: import("../lib/vibe-types").GoalSnapshot | null } = {
  current: null,
}

vi.mock("../hooks/use-chat-stream", () => ({
  useChatStream: () => ({
    messages: [],
    streaming: streamingRef.current,
    error: null,
    send: vi.fn(),
    cancel: vi.fn(),
  }),
}))

vi.mock("../hooks/use-goal", () => ({
  useGoal: () => ({
    snapshot: goalSnapshotRef.current,
    create: vi.fn(),
    edit: vi.fn(),
    cancel: vi.fn(),
  }),
}))

vi.mock("../services/vibe-api", () => ({
  vibeApi: {
    getGoal: vi.fn().mockResolvedValue(null),
    listSwarmRuns: vi.fn().mockResolvedValue([]),
    getSwarmRun: vi.fn(),
  },
}))

const senderPropsRef: { current: { loading?: boolean } | null } = { current: null }

vi.mock("@ant-design/x", () => ({
  Bubble: { List: () => <div data-testid="bubble-list" /> },
  Sender: (props: { loading?: boolean }) => {
    senderPropsRef.current = { loading: props.loading }
    return <div data-testid="sender" />
  },
  Welcome: () => <div data-testid="welcome" />,
  Prompts: () => <div data-testid="prompts" />,
}))

const { ChatDialog } = await import("./chat-dialog")

let container: HTMLDivElement
let root: Root

function makeActiveGoalSnapshot(): import("../lib/vibe-types").GoalSnapshot {
  return {
    goal: {
      goal_id: "g-1",
      session_id: "s-1",
      status: "active",
      objective: "find alpha",
      ui_summary: "alpha",
      source: "user",
      protocol: "default",
      risk_tier: "research_general",
      tokens_used: 0,
      turns_used: 0,
      time_used_seconds: 0,
      budget_wrapup_sent: false,
      created_at: "2026-08-07T00:00:00Z",
      updated_at: "2026-08-07T00:00:00Z",
    },
    claims: [],
    criteria: [],
    evidence: [],
    evidence_count: 0,
  }
}

beforeEach(() => {
  container = document.createElement("div")
  document.body.appendChild(container)
  root = createRoot(container)
  senderPropsRef.current = null
  streamingRef.current = false
  goalSnapshotRef.current = null
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
})

describe("ChatDialog Sender loading state", () => {
  it("loading=false when neither streaming nor goal is active", () => {
    streamingRef.current = false
    goalSnapshotRef.current = null
    act(() => {
      root.render(<ChatDialog sessionId="s-1" />)
    })
    expect(senderPropsRef.current?.loading).toBe(false)
  })

  it("loading=true when streaming is true (current chat-level signal)", () => {
    streamingRef.current = true
    goalSnapshotRef.current = null
    act(() => {
      root.render(<ChatDialog sessionId="s-1" />)
    })
    expect(senderPropsRef.current?.loading).toBe(true)
  })

  it("loading=true when goal is active even if streaming is false", () => {
    // The bug: sub-attempt gap. streaming just flipped to false because the
    // previous attempt.completed arrived, but the goal is still active and the
    // AI is still working. The user expects the cancel button to stay.
    streamingRef.current = false
    goalSnapshotRef.current = makeActiveGoalSnapshot()
    act(() => {
      root.render(<ChatDialog sessionId="s-1" />)
    })
    expect(senderPropsRef.current?.loading).toBe(true)
  })

  it("loading=false when goal status is non-active (e.g. cancelled) and streaming is false", () => {
    streamingRef.current = false
    const cancelled = makeActiveGoalSnapshot()
    cancelled.goal.status = "cancelled"
    goalSnapshotRef.current = cancelled
    act(() => {
      root.render(<ChatDialog sessionId="s-1" />)
    })
    expect(senderPropsRef.current?.loading).toBe(false)
  })
})
