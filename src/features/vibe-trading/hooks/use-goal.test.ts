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
  // Default: hook auto-hydration effect calls getGoal. Default mock returns null
  // (= "no goal on server") so tests that don't care about hydration don't need
  // to set this up. Tests that exercise hydration override the mock.
  vi.mocked(vibeApi.getGoal).mockResolvedValue(null)
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

// 异步版本:把 render 直接放进 async act 回调里,这样 effect 触发的
// Promise 链 (e.g. useGoal 自动水合时的 getGoal) 会在 act 关闭前被 flush,
// 后续断言才能看到 store 的更新。同步版本 renderWithSession 嵌套在 async act
// 里并不会等内部 promise,因为内层 act 是同步的。
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
    // 同步 act 关闭后,React 还会 schedule 一帧把 effect 跑起来。需要给
    // effect Promise 链 (`getGoal` 的 then 回调) 一次 flush 微任务的窗口,
    // 否则 store mutation 发生在 act 之外,React 不会触发 re-render。
    await Promise.resolve()
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

  // ─── 目标快照自动水合 (auto-hydration) ──────────────────────────────────
  //
  // 为什么需要：切换 session 或刷新页面重新进入会话时,store 是空的或仅有
  // default slot,如果不主动拉一次 GET /goal,GoalChip 永远拿不到 snapshot。
  // 之前 useGoal 只读 store 不拉数据,导致"复用同一个 session 看不到 Goal card"。
  // 这里验证两个关键场景:
  //   1. 完全空 store (模拟刷新) → effect 触发 GET /goal
  //   2. sessionId 从 A 切换到 B → effect 触发 GET /goal 给 B
  // 以及一个反例:
  //   3. goalLoaded 已经 true 时 (例如 cancel 之后,或 A→B→A 来回切) 不重复拉
  // 多个 useGoal 实例同时挂载不会触发并发请求:effect 只在 goalLoaded=false 时跑。

  it("hydrates goalSnapshot from server on mount when the slot is empty", async () => {
    // 模拟刷新页面:store 完全空。
    useSessionStore.getState().reset()

    const fresh = makeSnapshot({
      goal: { ...makeSnapshot().goal, objective: "persisted goal" },
    })
    vi.mocked(vibeApi.getGoal).mockResolvedValueOnce(fresh)

    await renderWithSessionAsync(SID)

    // Effect 触发的 GET /goal 在 act 关闭后才 resolve,所以用 vi.waitFor 等
    // mock 上的 promise 链 settled,然后再读 store。
    await vi.waitFor(() =>
      expect(useSessionStore.getState().byId[SID]?.goalSnapshot).toEqual(fresh),
    )
    expect(useSessionStore.getState().byId[SID]?.goalLoaded).toBe(true)
    expect(vibeApi.getGoal).toHaveBeenCalledTimes(1)
    expect(vibeApi.getGoal).toHaveBeenCalledWith(SID)
  })

  it("does not refetch when the slot is already marked goalLoaded", async () => {
    // 模拟"从另一个会话切回来,且上一轮已经加载过":slot 里有 snapshot 且
    // goalLoaded=true,effect 应当跳过 fetch,避免无谓的 GET /goal。
    useSessionStore.getState().setGoalSnapshot(SID, makeSnapshot())

    await renderWithSessionAsync(SID)

    expect(latest!.snapshot).not.toBeNull()
    expect(vibeApi.getGoal).not.toHaveBeenCalled()
  })

  it("hydrates goalSnapshot when sessionId changes to a fresh session", async () => {
    // 第一次 mount 用 SID,effect 拉一次得到 null(默认 mock)。
    await renderWithSessionAsync(SID)
    // 等 null 路径 settle。
    await vi.waitFor(() =>
      expect(useSessionStore.getState().byId[SID]?.goalLoaded).toBe(true),
    )
    expect(useSessionStore.getState().byId[SID]?.goalSnapshot).toBeNull()
    expect(vibeApi.getGoal).toHaveBeenCalledTimes(1)
    expect(vibeApi.getGoal).toHaveBeenLastCalledWith(SID)

    // 切到 SID2:effect 应该为 SID2 再拉一次,而不是复用 SID 的结果。
    const SID2 = "sess-hook-2"
    const fresh2 = makeSnapshot({
      goal: { ...makeSnapshot().goal, session_id: SID2, objective: "B's goal" },
    })
    vi.mocked(vibeApi.getGoal).mockResolvedValueOnce(fresh2)

    await act(async () => {
      root.render(
        createElement(Probe, {
          sessionId: SID2,
          onReady: (p) => {
            latest = p
          },
        }),
      )
    })

    await vi.waitFor(() =>
      expect(useSessionStore.getState().byId[SID2]?.goalSnapshot).toEqual(fresh2),
    )
    expect(useSessionStore.getState().byId[SID2]?.goalLoaded).toBe(true)
    expect(vibeApi.getGoal).toHaveBeenCalledTimes(2)
    expect(vibeApi.getGoal).toHaveBeenLastCalledWith(SID2)
  })

  it("clears goalSnapshot when the server reports no goal", async () => {
    // 之前测试都不会传 sid 的 slot,默认 mock 就是 null。这里专门显式断言:
    // 如果服务返回没有 goal,store 里的 goalSnapshot 必须被清掉 (而不是保留旧值)。
    const stale = makeSnapshot({ goal: { ...makeSnapshot().goal, objective: "stale" } })
    useSessionStore.setState((s) => ({
      byId: {
        ...s.byId,
        [SID]: { ...s.byId[SID], goalSnapshot: stale, goalLoaded: false },
      },
    }))
    vi.mocked(vibeApi.getGoal).mockResolvedValueOnce(null)

    await renderWithSessionAsync(SID)

    await vi.waitFor(() =>
      expect(useSessionStore.getState().byId[SID]?.goalLoaded).toBe(true),
    )
    expect(useSessionStore.getState().byId[SID]?.goalSnapshot).toBeNull()
    expect(vibeApi.getGoal).toHaveBeenCalledWith(SID)
  })
})
