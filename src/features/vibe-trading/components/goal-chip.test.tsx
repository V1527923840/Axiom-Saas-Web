// Tests for the <GoalChip> component.
//
// Strategy: render the component into a detached DOM container via react-dom/client,
// query via the DOM API directly (no @testing-library in this project).

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createRoot, type Root } from "react-dom/client"
import { act } from "react"
import { GoalChip } from "./goal-chip"
import type { GoalSnapshot } from "../lib/vibe-types"

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

function makeSnapshot(overrides: Partial<GoalSnapshot> = {}): GoalSnapshot {
  return {
    goal: {
      goal_id: "g1",
      session_id: "s1",
      status: "active",
      objective: "调研 A 股新能源板块",
      ui_summary: "新能源板块",
      source: "user",
      protocol: "swarm",
      risk_tier: "research_general",
      tokens_used: 0,
      turns_used: 0,
      time_used_seconds: 0,
      budget_wrapup_sent: false,
      created_at: "2026-08-07T00:00:00Z",
      updated_at: "2026-08-07T00:00:00Z",
    },
    claims: [],
    criteria: [
      {
        criterion_id: "c1",
        goal_id: "g1",
        text: "前 5 大公司估值",
        required: true,
        status: "satisfied",
        created_at: "2026-08-07T00:00:00Z",
        updated_at: "2026-08-07T00:00:00Z",
      },
      {
        criterion_id: "c2",
        goal_id: "g1",
        text: "近 30 日涨跌幅",
        required: true,
        status: "pending",
        created_at: "2026-08-07T00:00:00Z",
        updated_at: "2026-08-07T00:00:00Z",
      },
    ],
    evidence: [],
    evidence_count: 0,
    ...overrides,
  }
}

describe("GoalChip", () => {
  it("renders the objective and the met/total progress", () => {
    act(() => {
      root.render(
        <GoalChip snapshot={makeSnapshot()} open={false} onClick={() => undefined} />,
      )
    })
    // The chip should show the ui_summary (or objective) text.
    expect(container.textContent).toContain("新能源板块")
    // 1 of 2 criteria are satisfied — progress string should be present.
    expect(container.textContent).toContain("1/2 met")
  })

  it("does not show 'X/Y met' when there are no criteria", () => {
    const empty = makeSnapshot({ criteria: [], evidence: [], evidence_count: 0 })
    act(() => {
      root.render(<GoalChip snapshot={empty} open={false} onClick={() => undefined} />)
    })
    // The objective is still shown, but the met label should be absent.
    expect(container.textContent).toContain("新能源板块")
    expect(container.textContent).not.toContain("met")
  })

  it("invokes onClick when the chip button is clicked", () => {
    const onClick = vi.fn()
    act(() => {
      root.render(
        <GoalChip snapshot={makeSnapshot()} open={false} onClick={onClick} />,
      )
    })
    const button = container.querySelector("button") as HTMLButtonElement | null
    expect(button).not.toBeNull()
    act(() => {
      button!.click()
    })
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})