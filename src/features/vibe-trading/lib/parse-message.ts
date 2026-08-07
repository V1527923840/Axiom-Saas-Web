/**
 * 将 AI 输出的原始 content 解析为分段序列。
 *
 * 上游 vibe SSE 流会把 <think>...</think> (思考过程) 和 <tool_call>...</tool_call> (工具调用)
 * 直接拼在 delta 里,跟正文混在一起。本模块在渲染时把它们切出来,各走各的组件。
 *
 * 设计要点:
 * - 流式友好:遇到未闭合的 <think>/<tool_call> 时,把后续剩余内容视作对应类型的开块内容,
 *   避免流到一半的标签被当成正文显示成 `<thin...`。
 * - 顺序保留:main / thinking / tool 三种类型按出现先后产出,不丢任何字符。
 * - 解析是纯函数,每次渲染都跑,不需要缓存 (React 已经按 content 缓存了 Bubble 树)。
 */
export type Segment =
  | { type: "thinking"; content: string; closed: boolean; start: number }
  | { type: "tool"; content: string; closed: boolean; start: number }
  | { type: "main"; content: string; start: number }

const THINK_OPEN = "<think>"
const THINK_CLOSE = "</think>"
export const TOOL_OPEN = "<tool_call>"
export const TOOL_CLOSE = "</tool_call>"

export function parseMessageSegments(content: string): Segment[] {
  const segments: Segment[] = []
  let i = 0
  let mainBuf = ""
  let mainStart = 0

  const flushMain = () => {
    if (mainBuf.length > 0) {
      segments.push({ type: "main", content: mainBuf, start: mainStart })
      mainBuf = ""
    }
  }

  while (i < content.length) {
    // 注意:用 startsWith 而不是正则,流式场景下 "<thin" 这种半截标签走 main 分支,
    // 后续 delta 拼上 "k>" 才会重新进入 thinking 分支 —— 代价是中间一帧短暂误显。
    // 实测 delta 是按字符级推进的,中间一帧 50ms 内就过,人眼不可见。
    if (content.startsWith(THINK_OPEN, i)) {
      flushMain()
      const start = i
      const closeIdx = content.indexOf(THINK_CLOSE, i + THINK_OPEN.length)
      if (closeIdx === -1) {
        // 未闭合 —— 剩余整段当作思考块,等下一帧补全
        segments.push({ type: "thinking", content: content.slice(i + THINK_OPEN.length), closed: false, start })
        i = content.length
      } else {
        segments.push({ type: "thinking", content: content.slice(i + THINK_OPEN.length, closeIdx), closed: true, start })
        i = closeIdx + THINK_CLOSE.length
      }
      continue
    }
    if (content.startsWith(TOOL_OPEN, i)) {
      flushMain()
      const start = i
      const closeIdx = content.indexOf(TOOL_CLOSE, i + TOOL_OPEN.length)
      if (closeIdx === -1) {
        segments.push({ type: "tool", content: content.slice(i + TOOL_OPEN.length), closed: false, start })
        i = content.length
      } else {
        segments.push({ type: "tool", content: content.slice(i + TOOL_OPEN.length, closeIdx), closed: true, start })
        i = closeIdx + TOOL_CLOSE.length
      }
      continue
    }
    if (mainBuf.length === 0) {
      mainStart = i
    }
    mainBuf += content[i]
    i++
  }
  flushMain()
  return segments
}

/**
 * 判断 tool 块的内容是否可解析为 JSON (用于决定 ToolCallBlock 的展开态显示)。
 */
export function tryParseToolJson(raw: string): { ok: true; data: unknown } | { ok: false } {
  const trimmed = raw.trim()
  if (!trimmed) return { ok: false }
  try {
    return { ok: true, data: JSON.parse(trimmed) }
  } catch {
    return { ok: false }
  }
}

export type OpenToolCall = {
  index: number
  raw: string
  parsed?: unknown
  toolName?: string
}

/**
 * Scan AI message content for any unclosed <tool_call>… segments.
 * Returns them in the order they appear. Closed calls are skipped.
 *
 * "open" means we saw `<tool_call>` but no matching `</tool_call>` yet
 * (still streaming in). Reuses the same constant tags as parseMessageSegments
 * to stay in lock-step.
 */
/**
 * Extract toolName from a partial JSON object string (stream-friendly).
 * Looks for the first "name" or "tool" key whose value is a quoted string.
 * Returns undefined if neither is found.
 */
function extractToolNameFromPartialJson(raw: string): string | undefined {
  const nameMatch = raw.match(/"name"\s*:\s*"([^"]*)"/)
  if (nameMatch) return nameMatch[1]
  const toolMatch = raw.match(/"tool"\s*:\s*"([^"]*)"/)
  if (toolMatch) return toolMatch[1]
  return undefined
}

export function findOpenToolCalls(content: string): OpenToolCall[] {
  const out: OpenToolCall[] = []
  let i = 0
  let segIdx = 0
  while (i < content.length) {
    if (!content.startsWith(TOOL_OPEN, i)) {
      i++
      continue
    }
    const closeIdx = content.indexOf(TOOL_CLOSE, i + TOOL_OPEN.length)
    if (closeIdx === -1) {
      // 开块:内容延伸到下一个 <​tool_call> (含) 或字符串末尾
      const nextOpenIdx = content.indexOf(TOOL_OPEN, i + TOOL_OPEN.length)
      const endIdx = nextOpenIdx === -1 ? content.length : nextOpenIdx
      const raw = content.slice(i + TOOL_OPEN.length, endIdx)
      let parsed: unknown
      let toolName: string | undefined
      try {
        parsed = JSON.parse(raw)
        if (parsed && typeof parsed === "object") {
          const obj = parsed as Record<string, unknown>
          if (typeof obj.name === "string") toolName = obj.name
          else if (typeof obj.tool === "string") toolName = obj.tool
        }
      } catch {
        // 流式场景下 JSON 还没写完,用正则从片段里抠 name/tool
        toolName = extractToolNameFromPartialJson(raw)
      }
      out.push({ index: segIdx, raw, parsed, toolName })
      segIdx++
      i = endIdx
    } else {
      // 已闭合,不计入
      i = closeIdx + TOOL_CLOSE.length
      segIdx++
    }
  }
  return out
}