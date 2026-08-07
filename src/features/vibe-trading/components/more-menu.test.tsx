// Tests for the <MoreMenu> component.
//
// Strategy: render the component into a detached DOM container via react-dom/client,
// then trigger DOM events directly. The MoreMenu's three menu items open after the
// `+` trigger is clicked; the menu closes itself when an item is picked.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createRoot, type Root } from "react-dom/client"
import { act } from "react"
import { MoreMenu } from "./more-menu"

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

function openMenu(): void {
  const trigger = container.querySelector(
    'button[aria-label="更多选项"]',
  ) as HTMLButtonElement | null
  expect(trigger).not.toBeNull()
  act(() => {
    trigger!.click()
  })
}

describe("MoreMenu", () => {
  it("renders three menu items when open: 上传 PDF / 新建研究目标 / 启动智能体蜂群", () => {
    const onPickFile = vi.fn()
    const onCreateGoal = vi.fn()
    const onStartSwarm = vi.fn()
    act(() => {
      root.render(
        <MoreMenu
          onPickFile={onPickFile}
          onCreateGoal={onCreateGoal}
          onStartSwarm={onStartSwarm}
        />,
      )
    })
    openMenu()
    // After opening, all three item labels should be in the DOM.
    expect(container.textContent).toContain("上传 PDF")
    expect(container.textContent).toContain("新建研究目标")
    expect(container.textContent).toContain("启动智能体蜂群")
  })

  it("clicking 上传 PDF triggers onPickFile and closes the menu", () => {
    const onPickFile = vi.fn()
    act(() => {
      root.render(
        <MoreMenu
          onPickFile={onPickFile}
          onCreateGoal={() => undefined}
          onStartSwarm={() => undefined}
        />,
      )
    })
    openMenu()
    // Find the menu item by its visible text.
    const items = Array.from(container.querySelectorAll("button"))
    const uploadBtn = items.find((b) => b.textContent?.includes("上传 PDF")) as
      | HTMLButtonElement
      | undefined
    expect(uploadBtn).toBeDefined()
    act(() => {
      uploadBtn!.click()
    })
    expect(onPickFile).toHaveBeenCalledTimes(1)
    // Menu should auto-close: the 上传 PDF button is no longer in the DOM.
    const stillThere = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("上传 PDF"),
    )
    expect(stillThere).toBeUndefined()
  })

  it("clicking 新建研究目标 triggers onCreateGoal", () => {
    const onCreateGoal = vi.fn()
    act(() => {
      root.render(
        <MoreMenu
          onPickFile={() => undefined}
          onCreateGoal={onCreateGoal}
          onStartSwarm={() => undefined}
        />,
      )
    })
    openMenu()
    const items = Array.from(container.querySelectorAll("button"))
    const goalBtn = items.find((b) => b.textContent?.includes("新建研究目标")) as
      | HTMLButtonElement
      | undefined
    expect(goalBtn).toBeDefined()
    act(() => {
      goalBtn!.click()
    })
    expect(onCreateGoal).toHaveBeenCalledTimes(1)
  })

  it("clicking 启动智能体蜂群 triggers onStartSwarm", () => {
    const onStartSwarm = vi.fn()
    act(() => {
      root.render(
        <MoreMenu
          onPickFile={() => undefined}
          onCreateGoal={() => undefined}
          onStartSwarm={onStartSwarm}
        />,
      )
    })
    openMenu()
    const items = Array.from(container.querySelectorAll("button"))
    const swarmBtn = items.find((b) => b.textContent?.includes("启动智能体蜂群")) as
      | HTMLButtonElement
      | undefined
    expect(swarmBtn).toBeDefined()
    act(() => {
      swarmBtn!.click()
    })
    expect(onStartSwarm).toHaveBeenCalledTimes(1)
  })
})
