import { describe, it, expect } from "vitest"
import {
  buildSwarmStatusFromStarted,
  applySwarmEvent,
  buildSwarmStatusFromToolResultPreview,
} from "./swarm-status"

const STARTED_DATA = {
  run_id: "run-1",
  preset: "deep_research",
  status: "pending",
  agents: [
    { id: "agent-a", role: "researcher" },
    { id: "agent-b", role: "analyst" },
  ],
  tasks: [
    { id: "task-1", agent_id: "agent-a", status: "in_progress", worker_iterations: 2, summary: "reading sources" },
    { id: "task-2", agent_id: "agent-b", status: "pending", worker_iterations: 0 },
  ],
}

const baseNow = 1_700_000_000_000

describe("buildSwarmStatusFromStarted", () => {
  it("returns null when run_id is missing", () => {
    expect(buildSwarmStatusFromStarted({}, baseNow)).toBeNull()
  })

  it("builds SwarmRunStatus from run/agents/tasks payload", () => {
    const status = buildSwarmStatusFromStarted(STARTED_DATA, baseNow)
    expect(status).not.toBeNull()
    expect(status?.runId).toBe("run-1")
    expect(status?.preset).toBe("deep_research")
    expect(status?.status).toBe("pending")
    expect(status?.startedAt).toBe(baseNow)
    expect(status?.agents).toHaveLength(2)
    const agentA = status?.agents.find((a) => a.agentId === "agent-a")
    expect(agentA).toMatchObject({
      agentId: "agent-a",
      taskId: "task-1",
      role: "researcher",
      status: "running",
      iterations: 2,
      lastText: "reading sources",
    })
  })
})

describe("applySwarmEvent — layer + run lifecycle", () => {
  it("updates currentLayer/totalLayers on layer_started", () => {
    const initial = buildSwarmStatusFromStarted(STARTED_DATA, baseNow)!
    const next = applySwarmEvent(
      initial,
      { type: "layer_started", data: { layer: 2 } },
      baseNow + 100,
    )
    expect(next.currentLayer).toBe(2)
    expect(next.totalLayers).toBe(3)
    expect(next.status).toBe("running")
  })

  it("marks status=completed and completedAt on run_completed", () => {
    const initial = buildSwarmStatusFromStarted(STARTED_DATA, baseNow)!
    const next = applySwarmEvent(
      initial,
      { type: "run_completed", data: { status: "completed" }, timestamp: new Date(baseNow + 5000).toISOString() },
      baseNow + 5000,
    )
    expect(next.status).toBe("completed")
    expect(next.completedAt).toBe(baseNow + 5000)
  })
})

describe("applySwarmEvent — agent status transitions", () => {
  it("marks agent as done on task_completed", () => {
    const initial = buildSwarmStatusFromStarted(STARTED_DATA, baseNow)!
    const next = applySwarmEvent(
      initial,
      {
        type: "task_completed",
        agent_id: "agent-a",
        task_id: "task-1",
        data: { summary: "done writing" },
        timestamp: new Date(baseNow + 1000).toISOString(),
      },
      baseNow + 1000,
    )
    const agentA = next.agents.find((a) => a.agentId === "agent-a")
    expect(agentA?.status).toBe("done")
    expect(agentA?.lastText).toBe("done writing")
  })

  it("marks agent as failed on task_failed", () => {
    const initial = buildSwarmStatusFromStarted(STARTED_DATA, baseNow)!
    const next = applySwarmEvent(
      initial,
      {
        type: "task_failed",
        agent_id: "agent-b",
        task_id: "task-2",
        data: { error: "timeout" },
        timestamp: new Date(baseNow + 1000).toISOString(),
      },
      baseNow + 1000,
    )
    const agentB = next.agents.find((a) => a.agentId === "agent-b")
    expect(agentB?.status).toBe("failed")
    expect(agentB?.error).toBe("timeout")
  })

  it("updates multiple agents in parallel", () => {
    const initial = buildSwarmStatusFromStarted(STARTED_DATA, baseNow)!
    const afterA = applySwarmEvent(
      initial,
      { type: "task_completed", agent_id: "agent-a", task_id: "task-1", data: { summary: "a done" }, timestamp: new Date(baseNow + 100).toISOString() },
      baseNow + 100,
    )
    const afterB = applySwarmEvent(
      afterA,
      { type: "task_failed", agent_id: "agent-b", task_id: "task-2", data: { error: "boom" }, timestamp: new Date(baseNow + 200).toISOString() },
      baseNow + 200,
    )
    const agentA = afterB.agents.find((a) => a.agentId === "agent-a")
    const agentB = afterB.agents.find((a) => a.agentId === "agent-b")
    expect(agentA?.status).toBe("done")
    expect(agentB?.status).toBe("failed")
  })
})

describe("applySwarmEvent — resilience", () => {
  it("ignores unknown event types without breaking state", () => {
    const initial = buildSwarmStatusFromStarted(STARTED_DATA, baseNow)!
    const next = applySwarmEvent(
      initial,
      { type: "some_future_event", data: { foo: "bar" } },
      baseNow + 50,
    )
    expect(next).toEqual(initial)
  })
})

describe("buildSwarmStatusFromToolResultPreview", () => {
  it("returns null when preview lacks run_id and preset", () => {
    expect(buildSwarmStatusFromToolResultPreview('{"foo":1}', baseNow)).toBeNull()
  })

  it("parses run_id/preset/status from a JSON preview", () => {
    const preview = JSON.stringify({ run_id: "run-7", preset: "deep_research", status: "running" })
    const status = buildSwarmStatusFromToolResultPreview(preview, baseNow)
    expect(status).toMatchObject({
      runId: "run-7",
      preset: "deep_research",
      status: "running",
      currentLayer: 0,
      totalLayers: 0,
      agents: [],
    })
    expect(status?.startedAt).toBe(baseNow)
  })
})