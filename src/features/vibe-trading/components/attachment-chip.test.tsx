// Tests for the <AttachmentChip> component.
//
// Strategy: render the component into a detached DOM container via react-dom/client,
// query via the DOM API directly (no @testing-library in this project).

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createRoot, type Root } from "react-dom/client"
import { act } from "react"
import { AttachmentChip } from "./attachment-chip"

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

describe("AttachmentChip", () => {
  it("renders the attachment filename", () => {
    act(() => {
      root.render(
        <AttachmentChip
          attachment={{ filename: "x.pdf", file_path: "/tmp/x.pdf" }}
          onClear={() => undefined}
        />,
      )
    })
    expect(container.textContent).toContain("x.pdf")
  })

  it("invokes onClear when the × button is clicked", () => {
    const onClear = vi.fn()
    act(() => {
      root.render(
        <AttachmentChip
          attachment={{ filename: "x.pdf", file_path: "/tmp/x.pdf" }}
          onClear={onClear}
        />,
      )
    })
    // The chip renders a button with aria-label="移除附件".
    const btn = container.querySelector('button[aria-label="移除附件"]') as HTMLButtonElement | null
    expect(btn).not.toBeNull()
    act(() => {
      btn!.click()
    })
    expect(onClear).toHaveBeenCalledTimes(1)
  })

  it("renders the Paperclip icon as an svg", () => {
    act(() => {
      root.render(
        <AttachmentChip
          attachment={{ filename: "x.pdf", file_path: "/tmp/x.pdf" }}
          onClear={() => undefined}
        />,
      )
    })
    // lucide-react renders <svg> elements — there should be at least one (the Paperclip).
    expect(container.querySelectorAll("svg").length).toBeGreaterThanOrEqual(1)
  })
})
