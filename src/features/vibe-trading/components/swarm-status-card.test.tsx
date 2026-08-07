// Tests for the <SwarmStatusCard> component.
//
// Strategy: render the component into a detached DOM container via react-dom/client,
// query via the DOM API directly (no @testing-library in this project).

import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { createRoot, type Root } from "react-dom/client"
import { act } from "react"
import { SwarmStatusCard } from "./swarm-status-card"
import type { SwarmAgentStatus, SwarmRunStatus } from "../lib/vibe-types"

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement("div")
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
})

function makeAgent(overrides: Partial<SwarmAgentStatus> = {}): SwarmAgentStatus {
  return {
    agentId: "agent-a",
    status: "waiting",
    ...overrides,
  }
}

function makeStatus(overrides: Partial<SwarmRunStatus> = {}): SwarmRunStatus {
  return {
    runId: "run-1",
    preset: "deep_research",
    status: "pending",
    currentLayer: 0,
    totalLayers: 0,
    startedAt: 0,
    agents: [],
    ...overrides,
  }
}

describe("SwarmStatusCard", () => {
  it("renders the agentId when a single agent is in done status", () => {
    const status = makeStatus({
      agents: [makeAgent({ agentId: "agent-a", status: "done" })],
    })
    act(() => {
      root.render(<SwarmStatusCard status={status} />)
    })
    expect(container.textContent).toContain("agent-a")
  })

  it("counts done agents using the total field (not status.agents.length)", () => {
    const status = makeStatus({
      // 3 done agents, but `total` would be 6 — header should read "3/6 agents"
      // (i.e. counts come from total field rather than the rendered list)
      totalLayers: 6,
      currentLayer: 0,
      agents: [
        makeAgent({ agentId: "a1", status: "done" }),
        makeAgent({ agentId: "a2", status: "done" }),
        makeAgent({ agentId: "a3", status: "done" }),
      ],
    })
    act(() => {
      root.render(<SwarmStatusCard status={status} />)
    })
    expect(container.textContent).toContain("3/6")
    // Header count label is Chinese per swarm agent.png reference.
    expect(container.textContent).toContain("智能体")
  })

  it("renders Chinese column headers (智能体 | 状态 | 工具 | 耗时 | 迭代 | 输出)", () => {
    const status = makeStatus({
      agents: [makeAgent({ agentId: "a1", status: "running" })],
    })
    act(() => {
      root.render(<SwarmStatusCard status={status} />)
    })
    const text = container.textContent ?? ""
    // The reference image labels the first column 智能体; current rendered
    // output should match.
    expect(text).toContain("智能体")
    expect(text).toContain("状态")
    expect(text).toContain("工具")
    expect(text).toContain("耗时")
    expect(text).toContain("迭代")
    expect(text).toContain("输出")
  })

  it("shows the running label when status is running", () => {
    const status = makeStatus({
      status: "running",
      agents: [makeAgent({ agentId: "agent-a", status: "running" })],
    })
    act(() => {
      root.render(<SwarmStatusCard status={status} />)
    })
    expect(container.textContent).toContain("running")
  })

  it("shows the 'waiting for events' placeholder when there are no agents", () => {
    const status = makeStatus({ agents: [] })
    act(() => {
      root.render(<SwarmStatusCard status={status} />)
    })
    expect(container.textContent).toContain("等待事件")
  })
})