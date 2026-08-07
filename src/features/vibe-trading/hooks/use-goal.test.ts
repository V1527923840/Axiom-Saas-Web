// Tests for the useGoal hook.
//
// Strategy: render a tiny wrapper component that calls useGoal and writes the
// resulting `snapshot` (plus an "ok" data-attribute when present) into a
// <pre> inside a detached DOM container. This way we can observe state
// transitions from outside React without needing @testing-library/react —
// matching the project's existing test style (see goal-chip.test.tsx).
//
// vibeApi is fully mocked via vi.mock so we can assert against the args
// passed by each verb without hitting the network.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, createElement, type ReactNode } from "react"
import { createRoot, type Root } from "react-dom/client"

vi.mock("../services/vibe-api", () => ({
  vibeApi: {
    createGoal: vi.fn(),
    getGoal: vi.fn(),
    updateGoal: vi.fn(),
    updateGoalStatus: vi.fn(),
    uploadFile: vi.fn(),
    listSwarmPresets: vi.fn(),
    createSwarmRun: vi.fn(),
    listSwarmRuns: vi.fn(),
    getSwarmRun: vi.fn(),
    cancelSwarmRun: vi.fn(),
    retrySwarmRun: vi.fn(),
    addGoalEvidence: vi.fn(),
  },
}))

import { vibeApi } from "../services/vibe-api"
import { useSessionStore } from "../stores/session-store"
import { useGoal } from "./use-goal"
import type { GoalSnapshot } from "../lib/vibe-types"

const SID = "sess-hook"

function makeSnapshot(overrides: Partial<GoalSnapshot> = {}): GoalSnapshot {
  return {
    goal: {
      goal_id: "g-1",
      session_id: SID,
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
      ...(overrides.goal ?? {}),
    },
    claims: [],
    criteria: [],
    evidence: [],
    evidence_count: 0,
    ...overrides,
  }
}

interface Probe {
  snapshot: GoalSnapshot | null
  create: (objective: string) => Promise<GoalSnapshot>
  edit: (objective: string) => Promise<GoalSnapshot>
  cancel: () => Promise<void>
  refresh: () => Promise<GoalSnapshot | null>
}

function Probe({
  sessionId,
  onReady,
}: {
  sessionId: string | null
  onReady: (probe: Probe) => void
}): ReactNode {
  const probe = useGoal(sessionId)
  onReady(probe)
  return createElement(
    "pre",
    { "data-testid": "snapshot", "data-present": probe.snapshot ? "yes" : "no" },
    probe.snapshot ? JSON.stringify(probe.snapshot.goal.objective) : "null",
  )
}

let container: HTMLDivElement
let root: Root
let latest: Probe | null = null

beforeEach(() => {
  container = document.createElement("div")
  document.body.appendChild(container)
  root = createRoot(container)
  latest = null
  useSessionStore.getState().reset()
  useSessionStore.getState().ensure(SID)
  vi.mocked(vibeApi.createGoal).mockReset()
  vi.mocked(vibeApi.getGoal).mockReset()
  vi.mocked(vibeApi.updateGoal).mockReset()
  vi.mocked(vibeApi.updateGoalStatus).mockReset()
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
})

function renderWithSession(sessionId: string | null): void {
  act(() => {
    root.render(
      createElement(Probe, {
        sessionId,
        onReady: (p) => {
          latest = p
        },
      }),
    )
  })
}

describe("useGoal", () => {
  it("initial snapshot is null", () => {
    renderWithSession(SID)
    expect(latest).not.toBeNull()
    expect(latest!.snapshot).toBeNull()
    expect(container.querySelector("[data-present]")?.getAttribute("data-present")).toBe("no")
  })

  it("create() makes snapshot non-null (writes through the store)", async () => {
    const fresh = makeSnapshot({ goal: { ...makeSnapshot().goal, objective: "build a thing" } })
    vi.mocked(vibeApi.createGoal).mockResolvedValueOnce(fresh)

    renderWithSession(SID)
    expect(latest!.snapshot).toBeNull()

    await act(async () => {
      await latest!.create("build a thing")
    })

    expect(latest!.snapshot).toEqual(fresh)
    expect(container.querySelector("[data-present]")?.getAttribute("data-present")).toBe("yes")
    expect(container.textContent).toContain("build a thing")

    // Verify it actually hit the API with the right args.
    expect(vibeApi.createGoal).toHaveBeenCalledTimes(1)
    expect(vibeApi.createGoal).toHaveBeenCalledWith(SID, { objective: "build a thing" })
  })

  it("cancel() clears snapshot back to null", async () => {
    // Seed an active snapshot.
    useSessionStore.getState().setGoalSnapshot(SID, makeSnapshot())

    vi.mocked(vibeApi.updateGoalStatus).mockResolvedValueOnce({
      goal: makeSnapshot().goal,
      snapshot: makeSnapshot(),
    })

    renderWithSession(SID)
    expect(latest!.snapshot).not.toBeNull()

    await act(async () => {
      await latest!.cancel()
    })

    expect(latest!.snapshot).toBeNull()
    expect(container.querySelector("[data-present]")?.getAttribute("data-present")).toBe("no")

    // updateGoalStatus called with the right cancelled body
    expect(vibeApi.updateGoalStatus).toHaveBeenCalledTimes(1)
    const [calledSid, body] = vi.mocked(vibeApi.updateGoalStatus).mock.calls[0]
    expect(calledSid).toBe(SID)
    expect(body.goal_id).toBe("g-1")
    expect(body.status).toBe("cancelled")
  })

  it("edit() updates snapshot.objective (writes through the store)", async () => {
    // Seed an active snapshot.
    const original = makeSnapshot()
    useSessionStore.getState().setGoalSnapshot(SID, original)

    const edited = makeSnapshot({
      goal: { ...original.goal, objective: "find beta" },
    })
    vi.mocked(vibeApi.updateGoal).mockResolvedValueOnce({
      goal: edited.goal,
      snapshot: edited,
    })

    renderWithSession(SID)
    expect(latest!.snapshot?.goal.objective).toBe("find alpha")

    await act(async () => {
      await latest!.edit("find beta")
    })

    expect(latest!.snapshot?.goal.objective).toBe("find beta")
    expect(container.textContent).toContain("find beta")

    // updateGoal called with expected_goal_id matching the seeded goal_id
    expect(vibeApi.updateGoal).toHaveBeenCalledTimes(1)
    const [calledSid, body] = vi.mocked(vibeApi.updateGoal).mock.calls[0]
    expect(calledSid).toBe(SID)
    expect(body.goal_id).toBe("g-1")
    expect(body.expected_goal_id).toBe("g-1")
    expect(body.objective).toBe("find beta")
  })
})
