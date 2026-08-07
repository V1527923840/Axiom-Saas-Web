// Tests for the <GoalPanel> component.
//
// Strategy: render the component into a detached DOM container via
// react-dom/client, query via the DOM API directly (no @testing-library
// in this project). These tests cover the visual contract documented in
// the reference image (workspace/goal.png): the section headers must be
// Chinese ("达成标准" / "证据"), and the bottom action row must expose
// 继续 / 编辑 / 取消目标 buttons.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createRoot, type Root } from "react-dom/client"
import { act } from "react"
import { GoalPanel } from "./goal-panel"
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

function makeSnapshot(): GoalSnapshot {
  return {
    goal: {
      goal_id: "g1",
      session_id: "s1",
      status: "active",
      objective: "看看美国欧债的近2年的数据",
      ui_summary: "美国欧债近2年",
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
        text: "Define the research-only thesis and symbol universe",
        required: true,
        status: "pending",
        created_at: "2026-08-07T00:00:00Z",
        updated_at: "2026-08-07T00:00:00Z",
      },
      {
        criterion_id: "c2",
        goal_id: "g1",
        text: "Collect fresh market or benchmark evidence",
        required: true,
        status: "pending",
        created_at: "2026-08-07T00:00:00Z",
        updated_at: "2026-08-07T00:00:00Z",
      },
    ],
    evidence: [],
    evidence_count: 0,
  }
}

describe("GoalPanel", () => {
  it("renders Chinese section headers 达成标准 / 证据 per goal.png reference", () => {
    act(() => {
      root.render(
        <GoalPanel
          snapshot={makeSnapshot()}
          onContinue={vi.fn()}
          onSaveEdit={vi.fn()}
          onCancel={vi.fn()}
        />,
      )
    })
    const text = container.textContent ?? ""
    expect(text).toContain("达成标准")
    expect(text).toContain("证据")
  })

  it("renders 继续 / 编辑 / 取消目标 action buttons", () => {
    const onContinue = vi.fn()
    const onSaveEdit = vi.fn()
    const onCancel = vi.fn()
    act(() => {
      root.render(
        <GoalPanel
          snapshot={makeSnapshot()}
          onContinue={onContinue}
          onSaveEdit={onSaveEdit}
          onCancel={onCancel}
        />,
      )
    })
    const buttons = Array.from(container.querySelectorAll("button"))
    const labels = buttons.map((b) => (b.textContent ?? "").trim())
    expect(labels.some((l) => l.includes("继续"))).toBe(true)
    expect(labels.some((l) => l.includes("编辑"))).toBe(true)
    expect(labels.some((l) => l.includes("取消目标"))).toBe(true)
  })

  it("shows the goal objective in the header strip", () => {
    act(() => {
      root.render(
        <GoalPanel
          snapshot={makeSnapshot()}
          onContinue={vi.fn()}
          onSaveEdit={vi.fn()}
          onCancel={vi.fn()}
        />,
      )
    })
    expect(container.textContent).toContain("看看美国欧债的近2年的数据")
  })

  it("shows criteria count as 0/2 in the 达成标准 tile", () => {
    act(() => {
      root.render(
        <GoalPanel
          snapshot={makeSnapshot()}
          onContinue={vi.fn()}
          onSaveEdit={vi.fn()}
          onCancel={vi.fn()}
        />,
      )
    })
    expect(container.textContent).toContain("0/2")
  })

  it("clicking 取消目标 invokes onCancel", () => {
    const onCancel = vi.fn().mockResolvedValue(undefined)
    act(() => {
      root.render(
        <GoalPanel
          snapshot={makeSnapshot()}
          onContinue={vi.fn()}
          onSaveEdit={vi.fn()}
          onCancel={onCancel}
        />,
      )
    })
    const btn = Array.from(container.querySelectorAll("button")).find((b) =>
      (b.textContent ?? "").includes("取消目标"),
    ) as HTMLButtonElement | undefined
    expect(btn).toBeDefined()
    act(() => {
      btn!.click()
    })
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  // ─── 任务运行中的 UI 状态 (running state) ──────────────────────────────────
  //
  // 当 goal 触发的研究任务正在跑 (streaming=true) 时,GoalPanel 应当展示:
  //   - "运行中" 状态徽章 (带 spinner),让用户一眼看到有任务正在执行
  //   - "取消任务" 按钮 → 调 onCancelTask,只取消当前进行中的 attempt,
  //     而不是彻底取消 goal (那是 "取消目标" 的语义)
  //   - "继续" 按钮在这个状态下要么不存在,要么 disabled —— 任务正在跑时
  //     不应该再叠一个新的 attempt
  // 没传 running/没用这个特性时,继续走原有 继续 / 编辑 / 取消目标 路径。

  it("renders the idle action row (继续 / 编辑 / 取消目标) when not running", () => {
    act(() => {
      root.render(
        <GoalPanel
          snapshot={makeSnapshot()}
          onContinue={vi.fn()}
          onSaveEdit={vi.fn()}
          onCancel={vi.fn()}
          onCancelTask={vi.fn()}
        />,
      )
    })
    const labels = Array.from(container.querySelectorAll("button"))
      .map((b) => (b.textContent ?? "").trim())
    expect(labels.some((l) => l.includes("继续"))).toBe(true)
    expect(labels.some((l) => l.includes("编辑"))).toBe(true)
    expect(labels.some((l) => l.includes("取消目标"))).toBe(true)
    // 没传 running 时,运行中徽章和取消任务按钮都不该出现
    expect(container.textContent).not.toContain("运行中")
    expect(labels.some((l) => l.includes("取消任务"))).toBe(false)
  })

  it("replaces 继续 with 运行中 badge + 取消任务 button when running", () => {
    act(() => {
      root.render(
        <GoalPanel
          snapshot={makeSnapshot()}
          onContinue={vi.fn()}
          onSaveEdit={vi.fn()}
          onCancel={vi.fn()}
          onCancelTask={vi.fn()}
          running
        />,
      )
    })
    const labels = Array.from(container.querySelectorAll("button"))
      .map((b) => (b.textContent ?? "").trim())
    // 运行中徽章 + 取消任务 替代 继续
    expect(container.textContent).toContain("运行中")
    expect(labels.some((l) => l.includes("取消任务"))).toBe(true)
    expect(labels.some((l) => l.includes("继续"))).toBe(false)
    // 编辑和取消目标在 running 状态下保持可见
    expect(labels.some((l) => l.includes("编辑"))).toBe(true)
    expect(labels.some((l) => l.includes("取消目标"))).toBe(true)
  })

  it("clicking 取消任务 invokes onCancelTask (not onCancel)", () => {
    const onCancel = vi.fn()
    const onCancelTask = vi.fn()
    act(() => {
      root.render(
        <GoalPanel
          snapshot={makeSnapshot()}
          onContinue={vi.fn()}
          onSaveEdit={vi.fn()}
          onCancel={onCancel}
          onCancelTask={onCancelTask}
          running
        />,
      )
    })
    const btn = Array.from(container.querySelectorAll("button")).find((b) =>
      (b.textContent ?? "").includes("取消任务"),
    ) as HTMLButtonElement | undefined
    expect(btn).toBeDefined()
    act(() => {
      btn!.click()
    })
    expect(onCancelTask).toHaveBeenCalledTimes(1)
    expect(onCancel).not.toHaveBeenCalled()
  })

  it("disables 继续 when continueDisabled is true (任务进行中不能再点继续)", () => {
    act(() => {
      root.render(
        <GoalPanel
          snapshot={makeSnapshot()}
          onContinue={vi.fn()}
          onSaveEdit={vi.fn()}
          onCancel={vi.fn()}
          continueDisabled
        />,
      )
    })
    const btn = Array.from(container.querySelectorAll("button")).find((b) =>
      (b.textContent ?? "").includes("继续"),
    ) as HTMLButtonElement | undefined
    expect(btn).toBeDefined()
    expect(btn!.disabled).toBe(true)
  })
})