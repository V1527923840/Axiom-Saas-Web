import { describe, expect, it, vi, beforeEach } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { SourcesTab } from "./sources-tab"
import type { SourcesResponse } from "@/services/daily-summary"

// Stub the two store hooks the dialogs rely on so SourcesTab can drive
// them without going through the real list-pagination flow.
const intelligenceStoreMock = {
  selectedItem: null,
  detailDialogOpen: false,
  fetchDetail: vi.fn().mockResolvedValue(null),
  closeDetail: vi.fn(),
}
const researchStoreMock = {
  selectedItem: null,
  detailDialogOpen: false,
  fetchDetail: vi.fn().mockResolvedValue(null),
  closeDetail: vi.fn(),
}

vi.mock("@/features/content/intelligence/hooks/use-intelligence-posts", () => ({
  useIntelligencePostsStore: () => intelligenceStoreMock,
}))
vi.mock("@/features/content/research-analysis/hooks/use-research-analysis", () => ({
  useResearchAnalysisStore: () => researchStoreMock,
}))

const sources: SourcesResponse = {
  posts: [
    { id: "p1", title: "帖子一", categoryCode: "MACRO", publishDate: "2026-08-09T08:00:00.000Z" },
    { id: "p2", title: "帖子二", categoryCode: "STOCK", publishDate: "2026-08-10T08:00:00.000Z" },
  ],
  research: [
    { id: "42", title: "研报一", categoryCode: "RESEARCH", publishDate: "2026-08-08T08:00:00.000Z" },
  ],
  postsTotal: 2,
  researchTotal: 1,
  missingIds: [],
}

// Radix TabsTrigger selects on `mousedown`, not `click`, so fireEvent.click
// alone leaves the tab unchanged.
function clickTab(name: RegExp) {
  const tab = screen.getByRole("tab", { name })
  fireEvent.mouseDown(tab)
  fireEvent.click(tab)
}

beforeEach(() => {
  intelligenceStoreMock.fetchDetail.mockClear()
  researchStoreMock.fetchDetail.mockClear()
})

describe("SourcesTab", () => {
  it("shows the posts tab by default with counts and column headers", () => {
    render(<SourcesTab sources={sources} loading={false} error={null} />)
    expect(screen.getByRole("tab", { name: /帖文 \(2\)/ })).toHaveAttribute(
      "aria-selected",
      "true",
    )
    expect(screen.getByRole("tab", { name: /研报 \(1\)/ })).toBeInTheDocument()
    // The 发布日期 column was removed — verify the column header is
    // absent and the raw publish-date string isn't rendered as a cell.
    expect(screen.queryByText("发布时间")).not.toBeInTheDocument()
    expect(screen.queryByText("2026-08-09")).not.toBeInTheDocument()
  })

  it("switches to the research tab on click", () => {
    render(<SourcesTab sources={sources} loading={false} error={null} />)
    clickTab(/研报/)
    expect(screen.getByText("研报一")).toBeInTheDocument()
  })

  it("renders a 查看 button per visible row, no Copy ID column", () => {
    render(<SourcesTab sources={sources} loading={false} error={null} />)
    // posts tab is the default panel — 2 rows, 2 查看 buttons.
    const buttons = screen.getAllByRole("button", { name: "查看" })
    expect(buttons).toHaveLength(2)
    // The old Copy ID column must be gone.
    expect(screen.queryByRole("button", { name: "Copy ID" })).not.toBeInTheDocument()
  })

  it("calls fetchDetail with the post id when 查看 is clicked on the posts tab", () => {
    render(<SourcesTab sources={sources} loading={false} error={null} />)
    fireEvent.click(screen.getAllByRole("button", { name: "查看" })[0])
    expect(intelligenceStoreMock.fetchDetail).toHaveBeenCalledWith("p1")
    expect(researchStoreMock.fetchDetail).not.toHaveBeenCalled()
  })

  it("calls fetchDetail with a numeric id when 查看 is clicked on the research tab", () => {
    render(<SourcesTab sources={sources} loading={false} error={null} />)
    clickTab(/研报/)
    fireEvent.click(screen.getByRole("button", { name: "查看" }))
    // "42" → 42 — ContentItemMeta.id is a string but
    // ResearchAnalysisDetail expects a number.
    expect(researchStoreMock.fetchDetail).toHaveBeenCalledWith(42)
    expect(intelligenceStoreMock.fetchDetail).not.toHaveBeenCalled()
  })

  it("skips the research fetch when the id is not numeric", () => {
    render(
      <SourcesTab
        sources={{
          posts: [],
          research: [{ id: "not-a-number", title: "x", categoryCode: "R", publishDate: "" }],
          postsTotal: 0,
          researchTotal: 1,
          missingIds: [],
        }}
        loading={false}
        error={null}
      />,
    )
    clickTab(/研报/)
    fireEvent.click(screen.getByRole("button", { name: "查看" }))
    expect(researchStoreMock.fetchDetail).not.toHaveBeenCalled()
  })

  it("shows an aggregate empty state when both groups are empty", () => {
    render(
      <SourcesTab
        sources={{
          posts: [],
          research: [],
          postsTotal: 0,
          researchTotal: 0,
          missingIds: [],
        }}
        loading={false}
        error={null}
      />,
    )
    // Tabs are gone in the aggregate-empty path — only the message
    // remains. The '0' badge wouldn't be visible to a user here.
    expect(screen.getByText("该报告没有关联的来源数据")).toBeInTheDocument()
    expect(screen.queryByRole("tab", { name: /帖文/ })).not.toBeInTheDocument()
  })

  it("renders Tabs with per-side 无 when only one group is empty", () => {
    render(
      <SourcesTab
        sources={{
          posts: [{ id: "p1", title: "a", categoryCode: "X", publishDate: "" }],
          research: [],
          postsTotal: 1,
          researchTotal: 0,
          missingIds: [],
        }}
        loading={false}
        error={null}
      />,
    )
    // Tabs render because at least one side has rows.
    expect(screen.getByRole("tab", { name: /帖文 \(1\)/ })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: /研报 \(0\)/ })).toBeInTheDocument()
    // Default panel (posts) has the real row.
    expect(screen.getByText("a")).toBeInTheDocument()
    // Switch to research: per-side 无.
    clickTab(/研报/)
    expect(screen.getByText("无")).toBeInTheDocument()
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
