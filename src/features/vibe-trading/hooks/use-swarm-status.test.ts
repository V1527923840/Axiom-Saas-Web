// Tests for the useSwarmStatus hook's hydration behavior.
//
// Context: SwarmStatusCard is rendered from synthetic messages with
// `type: "swarm_status"` in the per-session slot. These messages are
// populated by the SSE handler (swarm.started / swarm.event). On refresh or
// session switch, the in-memory store is wiped — the synthetic messages
// vanish, so the card disappears.
//
// The fix is hydration: on sessionId change, fetch listSwarmRuns, filter to
// running/pending runs, fetch detail for each, build a SwarmRunStatus, and
// upsertSwarmStatus. A `swarmLoaded` flag prevents refetching on every render.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, createElement, type ReactNode } from "react"
import { createRoot, type Root } from "react-dom/client"

vi.mock("../services/vibe-api", () => ({
  vibeApi: {
    listSwarmRuns: vi.fn(),
    getSwarmRun: vi.fn(),
    uploadFile: vi.fn(),
    createGoal: vi.fn(),
    getGoal: vi.fn(),
    updateGoal: vi.fn(),
    addGoalEvidence: vi.fn(),
    updateGoalStatus: vi.fn(),
    createSwarmRun: vi.fn(),
    cancelSwarmRun: vi.fn(),
    retrySwarmRun: vi.fn(),
    listSwarmPresets: vi.fn(),
  },
}))

import { vibeApi } from "../services/vibe-api"
import { useSessionStore } from "../stores/session-store"
import { useSwarmStatus } from "./use-swarm-status"
import type { SwarmRunStatus } from "../lib/vibe-types"

const SID = "sess-swarm"
const OTHER_SID = "sess-swarm-2"

function makeDetailResponse(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    run_id: "run-1",
    preset: "deep_research",
    status: "running",
    agents: [
      { id: "planner-alpha", role: "planner" },
      { id: "researcher-beta", role: "researcher" },
    ],
    tasks: [
      {
        id: "task-1",
        agent_id: "planner-alpha",
        status: "running",
        summary: "thinking about alpha",
        worker_iterations: 2,
      },
      {
        id: "task-2",
        agent_id: "researcher-beta",
        status: "pending",
        summary: "",
        worker_iterations: 0,
      },
    ],
    ...overrides,
  }
}

const DETAIL = makeDetailResponse()

interface Probe {
  statuses: SwarmRunStatus[]
}

function Probe({
  sessionId,
  onReady,
}: {
  sessionId: string | null
  onReady: (probe: Probe) => void
}): ReactNode {
  const probe = useSwarmStatus(sessionId)
  onReady(probe)
  return createElement("pre", { "data-testid": "probe" }, JSON.stringify(probe.statuses.map((s) => s.runId)))
}

let container: HTMLDivElement
let root: Root
let latest: Probe | null = null

async function renderWithSessionAsync(sessionId: string | null): Promise<void> {
  await act(async () => {
    root.render(
      createElement(Probe, {
        sessionId,
        onReady: (p) => {
          latest = p
        },
      }),
    )
    // 把 effect 触发的 microtask (Promise.then) flush 掉,否则 store mutation
    // 会发生在 act 之外,React 不会触发 re-render。
    await Promise.resolve()
  })
}

beforeEach(() => {
  container = document.createElement("div")
  document.body.appendChild(container)
  root = createRoot(container)
  latest = null
  useSessionStore.getState().reset()
  useSessionStore.getState().ensure(SID)
  vi.mocked(vibeApi.listSwarmRuns).mockReset()
  vi.mocked(vibeApi.getSwarmRun).mockReset()
  // Default: no runs.
  vi.mocked(vibeApi.listSwarmRuns).mockResolvedValue([])
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
})

describe("useSwarmStatus hydration", () => {
  it("calls listSwarmRuns on mount and upserts running runs as swarm_status messages", async () => {
    vi.mocked(vibeApi.listSwarmRuns).mockResolvedValueOnce([
      { id: "run-1", status: "running" },
    ])
    vi.mocked(vibeApi.getSwarmRun).mockResolvedValueOnce(DETAIL)

    await renderWithSessionAsync(SID)

    expect(vi.mocked(vibeApi.listSwarmRuns)).toHaveBeenCalledTimes(1)
    expect(vi.mocked(vibeApi.getSwarmRun)).toHaveBeenCalledWith("run-1")

    // Wait for the detail fetch + upsert to settle.
    await act(async () => {
      await vi.waitFor(() =>
        expect(useSessionStore.getState().byId[SID]?.swarmLoaded).toBe(true),
      )
    })

    const slot = useSessionStore.getState().byId[SID]
    expect(slot?.swarmLoaded).toBe(true)
    const statuses = slot?.messages
      .filter((m) => m.type === "swarm_status")
      .map((m) => m.swarmStatus) as SwarmRunStatus[]
    expect(statuses).toHaveLength(1)
    expect(statuses[0].runId).toBe("run-1")
    expect(statuses[0].preset).toBe("deep_research")
    expect(statuses[0].status).toBe("running")
    expect(statuses[0].agents).toHaveLength(2)
  })

  it("does not fetch when the slot is already marked swarmLoaded", async () => {
    // 模拟之前会话已经加载过:slot 里 swarmLoaded=true,effect 应当跳过 fetch。
    useSessionStore.setState((s) => ({
      byId: {
        ...s.byId,
        [SID]: { ...s.byId[SID], swarmLoaded: true },
      },
    }))

    await renderWithSessionAsync(SID)

    expect(vi.mocked(vibeApi.listSwarmRuns)).not.toHaveBeenCalled()
  })

  it("skips runs that are already in terminal states (completed/failed/cancelled)", async () => {
    vi.mocked(vibeApi.listSwarmRuns).mockResolvedValueOnce([
      { id: "run-done", status: "completed" },
      { id: "run-fail", status: "failed" },
      { id: "run-cancel", status: "cancelled" },
    ])
    // 即使 getSwarmRun 被调用,也不应该 upsert 终止态的 run
    vi.mocked(vibeApi.getSwarmRun).mockResolvedValue(DETAIL)

    await renderWithSessionAsync(SID)

    await act(async () => {
      await vi.waitFor(() =>
        expect(useSessionStore.getState().byId[SID]?.swarmLoaded).toBe(true),
      )
    })

    // getSwarmRun 不应该被调用 —— 终止态的 run 在 list 阶段就被过滤了
    expect(vi.mocked(vibeApi.getSwarmRun)).not.toHaveBeenCalled()
    const slot = useSessionStore.getState().byId[SID]
    const statuses = slot?.messages
      .filter((m) => m.type === "swarm_status")
      .map((m) => m.swarmStatus) as SwarmRunStatus[]
    expect(statuses).toHaveLength(0)
  })

  it("hydrates when sessionId changes to a new session", async () => {
    // 第一次 mount 用 SID,listSwarmRuns 返空,标记 swarmLoaded。
    await renderWithSessionAsync(SID)
    await act(async () => {
      await vi.waitFor(() =>
        expect(useSessionStore.getState().byId[SID]?.swarmLoaded).toBe(true),
      )
    })
    expect(vi.mocked(vibeApi.listSwarmRuns)).toHaveBeenCalledTimes(1)

    // 切到新会话:effect 应当独立地为新 session 再跑一次。
    vi.mocked(vibeApi.listSwarmRuns).mockResolvedValueOnce([
      { id: "run-2", status: "running" },
    ])
    vi.mocked(vibeApi.getSwarmRun).mockResolvedValueOnce(
      makeDetailResponse({ run_id: "run-2", preset: "market_scan" }),
    )

    await act(async () => {
      root.render(
        createElement(Probe, {
          sessionId: OTHER_SID,
          onReady: (p) => {
            latest = p
          },
        }),
      )
      await Promise.resolve()
    })

    await act(async () => {
      await vi.waitFor(() =>
        expect(useSessionStore.getState().byId[OTHER_SID]?.swarmLoaded).toBe(true),
      )
    })

    expect(vi.mocked(vibeApi.listSwarmRuns)).toHaveBeenCalledTimes(2)
    expect(vi.mocked(vibeApi.getSwarmRun)).toHaveBeenCalledWith("run-2")
    const slot = useSessionStore.getState().byId[OTHER_SID]
    const statuses = slot?.messages
      .filter((m) => m.type === "swarm_status")
      .map((m) => m.swarmStatus) as SwarmRunStatus[]
    expect(statuses).toHaveLength(1)
    expect(statuses[0].runId).toBe("run-2")
    expect(statuses[0].preset).toBe("market_scan")
  })

  it("still marks swarmLoaded=true when listSwarmRuns fails (no infinite retry)", async () => {
    vi.mocked(vibeApi.listSwarmRuns).mockRejectedValueOnce(new Error("network"))

    await renderWithSessionAsync(SID)

    await act(async () => {
      await vi.waitFor(() =>
        expect(useSessionStore.getState().byId[SID]?.swarmLoaded).toBe(true),
      )
    })

    expect(useSessionStore.getState().byId[SID]?.swarmLoaded).toBe(true)
  })
})
