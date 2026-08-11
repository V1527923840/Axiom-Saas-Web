import { describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { SourcesTab } from "./sources-tab"
import type { SourcesResponse } from "@/services/daily-summary"

const sources: SourcesResponse = {
  posts: [
    { id: "p1", title: "帖子一", categoryCode: "MACRO", publishDate: "2026-08-09T08:00:00.000Z" },
    { id: "p2", title: "帖子二", categoryCode: "STOCK", publishDate: "2026-08-10T08:00:00.000Z" },
  ],
  research: [
    { id: "r1", title: "研报一", categoryCode: "RESEARCH", publishDate: "2026-08-08T08:00:00.000Z" },
  ],
}

describe("SourcesTab", () => {
  it("renders both groups with counts and truncated publish dates", () => {
    render(<SourcesTab sources={sources} loading={false} error={null} />)
    expect(screen.getByText("Posts (2)")).toBeInTheDocument()
    expect(screen.getByText("Research (1)")).toBeInTheDocument()
    expect(screen.getByText("2026-08-09")).toBeInTheDocument()
    expect(screen.getByText("研报一")).toBeInTheDocument()
  })

  it("renders a Copy ID button per row that writes the id to the clipboard", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } })

    render(<SourcesTab sources={sources} loading={false} error={null} />)
    const buttons = screen.getAllByRole("button", { name: "Copy ID" })
    expect(buttons).toHaveLength(3)

    fireEvent.click(buttons[0])
    expect(writeText).toHaveBeenCalledWith("p1")
    await waitFor(() => expect(screen.getByText("已复制")).toBeInTheDocument())

    vi.unstubAllGlobals()
  })

  it("shows 无 for an empty group", () => {
    render(
      <SourcesTab sources={{ posts: [], research: [] }} loading={false} error={null} />,
    )
    expect(screen.getByText("Posts (0)")).toBeInTheDocument()
    expect(screen.getAllByText("无")).toHaveLength(2)
  })

  it("renders an error alert", () => {
    render(<SourcesTab sources={null} loading={false} error={new Error("网络挂了")} />)
    expect(screen.getByText("加载来源失败")).toBeInTheDocument()
    expect(screen.getByText("网络挂了")).toBeInTheDocument()
  })

  it("renders 无数据 when sources is null and not loading", () => {
    render(<SourcesTab sources={null} loading={false} error={null} />)
    expect(screen.getByText("无数据")).toBeInTheDocument()
  })
})
