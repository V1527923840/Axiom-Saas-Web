// Tests for the <GoalComposerChip> component.
//
// Strategy: render the component into a detached DOM container via
// react-dom/client, query via the DOM API directly (no @testing-library
// in this project). This chip mirrors the visual contract of <SwarmChip>:
// compact pill with icon + label + close button, displayed above the
// Sender when the user has activated 目标设定模式.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createRoot, type Root } from "react-dom/client"
import { act } from "react"
import { GoalComposerChip } from "./goal-composer-chip"

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

describe("GoalComposerChip", () => {
  it("renders a Target icon and the 目标模式 label", () => {
    act(() => {
      root.render(<GoalComposerChip onClear={vi.fn()} />)
    })
    const text = container.textContent ?? ""
    expect(text).toContain("目标模式")
    expect(container.querySelector("svg")).not.toBeNull()
  })

  it("exposes a remove button with accessible label", () => {
    act(() => {
      root.render(<GoalComposerChip onClear={vi.fn()} />)
    })
    expect(
      container.querySelector('button[aria-label="退出目标设定模式"]'),
    ).not.toBeNull()
  })

  it("invokes onClear when the close button is clicked", () => {
    const onClear = vi.fn()
    act(() => {
      root.render(<GoalComposerChip onClear={onClear} />)
    })
    const btn = container.querySelector(
      'button[aria-label="退出目标设定模式"]',
    ) as HTMLButtonElement
    act(() => {
      btn.click()
    })
    expect(onClear).toHaveBeenCalledTimes(1)
  })
})