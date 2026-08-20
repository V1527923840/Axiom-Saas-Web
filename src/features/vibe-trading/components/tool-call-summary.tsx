import { ChevronDown, ChevronRight, Wrench } from "lucide-react"
import { useState } from "react"
import type { Segment } from "../lib/parse-message"
import { tryParseToolJson } from "../lib/parse-message"
import { ToolCallBlock } from "./tool-call-block"

/**
 * Aggregate closed tool_call segments into a compact summary chip when there
 * are too many to render as one row each. The goal is to stop a long run of
 * tool rows from pushing the assistant's actual markdown response below the
 * fold — see screenshot from 2026-08-20 where 30+ tool calls filled the
 * viewport and hid the answer.
 *
 * Behaviour:
 * - count <= MAX_INLINE_ROWS: render each segment as a plain <ToolCallBlock/>.
 *   No summarization (avoids hiding the only tool call in a single-call reply).
 * - count >  MAX_INLINE_ROWS: render a summary chip with a count breakdown by
 *   tool name, and a collapsed list of individual rows. Click the chip or
 *   the "show all" button to expand. Default: collapsed (the user's complaint
 *   is "content gets hidden" — defaulting to compact is the right default).
 * - any unclosed segment (still streaming): always render individually so the
 *   user sees live progress, no matter how many closed ones came before.
 *
 * ★ Streaming note: while tools are still in-flight, closed segments keep
 * arriving but unclosed ones stay visible inline. The summary updates on every
 * render; if the user is mid-expand when a new tool closes, we leave them
 * expanded (userInteractedRef pattern from ThinkingBlock not needed here
 * because the only "expanded" state is local UI).
 */

export const MAX_INLINE_TOOL_ROWS = 4

export function ToolCallSummary({ segments }: { segments: Segment[] }) {
  const toolSegments = segments.filter(
    (s): s is Extract<Segment, { type: "tool" }> => s.type === "tool",
  )
  if (toolSegments.length === 0) return null

  // Any unclosed segment is in-flight — render those inline for live feedback.
  const closed = toolSegments.filter((s) => s.closed)
  const open = toolSegments.filter((s) => !s.closed)

  // 1) All open (no closed yet) → just inline rows. The inline <ToolCallBlock>
  // handles the spinner state, no aggregation needed.
  if (closed.length === 0) {
    return (
      <>
        {toolSegments.map((seg) => (
          <ToolCallBlock
            key={`x-${seg.start}`}
            content={seg.content}
            closed={seg.closed}
          />
        ))}
      </>
    )
  }

  // 2) Few enough closed rows → inline each. Cheap, no aggregation cost.
  if (closed.length <= MAX_INLINE_TOOL_ROWS) {
    return (
      <>
        {open.map((seg) => (
          <ToolCallBlock
            key={`x-open-${seg.start}`}
            content={seg.content}
            closed={false}
          />
        ))}
        {closed.map((seg) => (
          <ToolCallBlock
            key={`x-${seg.start}`}
            content={seg.content}
            closed={true}
          />
        ))}
      </>
    )
  }

  // 3) Many closed rows → compact summary chip + expandable list.
  return <ToolCallGroupSummary closed={closed} open={open} />
}

function ToolCallGroupSummary({
  closed,
  open,
}: {
  closed: Extract<Segment, { type: "tool" }>[]
  open: Extract<Segment, { type: "tool" }>[]
}) {
  // Build "name × N" breakdown ordered by frequency desc (most-called first).
  const counts = new Map<string, number>()
  for (const seg of closed) {
    const parsed = tryParseToolJson(seg.content)
    const name =
      parsed.ok && parsed.data && typeof parsed.data === "object" && "name" in parsed.data
        ? String((parsed.data as Record<string, unknown>).name)
        : "工具"
    counts.set(name, (counts.get(name) ?? 0) + 1)
  }
  const breakdown = [...counts.entries()].sort((a, b) => b[1] - a[1])

  const [expanded, setExpanded] = useState(false)

  return (
    <div className="my-1 space-y-1">
      {open.map((seg) => (
        <ToolCallBlock
          key={`x-open-${seg.start}`}
          content={seg.content}
          closed={false}
        />
      ))}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="text-muted-foreground hover:text-foreground flex w-full items-center gap-1.5 rounded px-1 py-0.5 text-left text-xs transition-colors"
        aria-expanded={expanded}
      >
        {expanded ? (
          <ChevronDown className="h-3 w-3 shrink-0" aria-hidden />
        ) : (
          <ChevronRight className="h-3 w-3 shrink-0" aria-hidden />
        )}
        <Wrench className="h-3 w-3 shrink-0 opacity-60" aria-hidden />
        <span className="font-medium">调用 {closed.length} 个工具</span>
        <span className="opacity-70">
          · {breakdown.map(([n, c]) => `${n} × ${c}`).join("、")}
        </span>
      </button>
      {expanded && (
        <div className="ml-4 space-y-0.5 border-l pl-2">
          {closed.map((seg) => (
            <ToolCallBlock
              key={`x-${seg.start}`}
              content={seg.content}
              closed={true}
            />
          ))}
        </div>
      )}
    </div>
  )
}