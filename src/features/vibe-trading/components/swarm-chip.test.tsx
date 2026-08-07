// Tests for the <SwarmChip> component.
//
// Strategy: render the component into a detached DOM container via react-dom/client,
// query via the DOM API directly (no @testing-library in this project). Mirrors
// the AttachmentChip test pattern.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createRoot, type Root } from "react-dom/client"
import { act } from "react"
import { SwarmChip } from "./swarm-chip"

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

describe("SwarmChip", () => {
  it("renders the swarm preset title", () => {
    act(() => {
      root.render(<SwarmChip title="Agent Swarm" onClear={() => undefined} />)
    })
    expect(container.textContent).toContain("Agent Swarm")
  })

  it("invokes onClear when the × button is clicked", () => {
    const onClear = vi.fn()
    act(() => {
      root.render(<SwarmChip title="Agent Swarm" onClear={onClear} />)
    })
    const btn = container.querySelector(
      'button[aria-label="移除蜂群模式"]',
    ) as HTMLButtonElement | null
    expect(btn).not.toBeNull()
    act(() => {
      btn!.click()
    })
    expect(onClear).toHaveBeenCalledTimes(1)
  })

  it("renders the Users icon as an svg", () => {
    act(() => {
      root.render(<SwarmChip title="Agent Swarm" onClear={() => undefined} />)
    })
    expect(container.querySelectorAll("svg").length).toBeGreaterThanOrEqual(1)
  })
})
