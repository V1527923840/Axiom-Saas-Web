// Tests for the <MoreMenu> component.
//
// Strategy: render via Testing Library and drive the menu with `userEvent`.
// MoreMenu is built on the Radix-based shadcn <DropdownMenu>, which opens on
// `pointerdown` (not `click`) and portals its content to `document.body` — so
// these tests query by ARIA role against the whole screen rather than poking at
// a specific container's DOM shape. The three menu items appear after the `+`
// trigger is activated; the menu closes itself when an item is picked.

import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MoreMenu } from "./more-menu"

function getTrigger(): HTMLButtonElement {
  return screen.getByRole("button", { name: "更多选项" })
}

describe("MoreMenu", () => {
  it("renders three menu items when open: 上传 PDF / 新建研究目标 / 启动智能体蜂群", async () => {
    const user = userEvent.setup()
    render(
      <MoreMenu
        onPickFile={vi.fn()}
        onCreateGoal={vi.fn()}
        onStartSwarm={vi.fn()}
      />,
    )
    await user.click(getTrigger())
    expect(
      screen.getByRole("menuitem", { name: /上传 PDF/ }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("menuitem", { name: /新建研究目标/ }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("menuitem", { name: /启动智能体蜂群/ }),
    ).toBeInTheDocument()
  })

  it("clicking 上传 PDF triggers onPickFile and closes the menu", async () => {
    const user = userEvent.setup()
    const onPickFile = vi.fn()
    render(
      <MoreMenu
        onPickFile={onPickFile}
        onCreateGoal={() => undefined}
        onStartSwarm={() => undefined}
      />,
    )
    await user.click(getTrigger())
    await user.click(screen.getByRole("menuitem", { name: /上传 PDF/ }))
    expect(onPickFile).toHaveBeenCalledTimes(1)
    // Menu should auto-close: the 上传 PDF item is no longer in the DOM.
    expect(
      screen.queryByRole("menuitem", { name: /上传 PDF/ }),
    ).not.toBeInTheDocument()
  })

  it("clicking 新建研究目标 triggers onCreateGoal", async () => {
    const user = userEvent.setup()
    const onCreateGoal = vi.fn()
    render(
      <MoreMenu
        onPickFile={() => undefined}
        onCreateGoal={onCreateGoal}
        onStartSwarm={() => undefined}
      />,
    )
    await user.click(getTrigger())
    await user.click(screen.getByRole("menuitem", { name: /新建研究目标/ }))
    expect(onCreateGoal).toHaveBeenCalledTimes(1)
  })

  it("clicking 启动智能体蜂群 triggers onStartSwarm", async () => {
    const user = userEvent.setup()
    const onStartSwarm = vi.fn()
    render(
      <MoreMenu
        onPickFile={() => undefined}
        onCreateGoal={() => undefined}
        onStartSwarm={onStartSwarm}
      />,
    )
    await user.click(getTrigger())
    await user.click(screen.getByRole("menuitem", { name: /启动智能体蜂群/ }))
    expect(onStartSwarm).toHaveBeenCalledTimes(1)
  })

  it("does not open when disabled", async () => {
    const user = userEvent.setup()
    render(
      <MoreMenu
        disabled
        onPickFile={vi.fn()}
        onCreateGoal={vi.fn()}
        onStartSwarm={vi.fn()}
      />,
    )
    expect(getTrigger()).toBeDisabled()
    await user.click(getTrigger())
    expect(screen.queryByRole("menuitem")).not.toBeInTheDocument()
  })
})
