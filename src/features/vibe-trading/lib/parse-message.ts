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
 *
 * Exported so the session store's appendToolCall can match a trailing
 * unclosed <tool_call> block by name when closing it in place on the
 * upstream "done" event.
 */
export function extractToolNameFromPartialJson(raw: string): string | undefined {
  const nameMatch = raw.match(/"name"\s*:\s*"([^"]*)"/)
  if (nameMatch) return nameMatch[1]
  const toolMatch = raw.match(/"tool"\s*:\s*"([^"]*)"/)
  if (toolMatch) return toolMatch[1]
  return undefined
}

/**
 * Find the most recent unclosed <tool_call> block in `content` whose partial
 * JSON names match `toolName`.
 *
 * "Unclosed" = the OPEN tag has no matching `</tool_call>` to its right
 * inside `content`. Walks backward from the end of content, scanning past
 * both closed and unclosed OPEN tags, returning the first unclosed OPEN
 * whose name matches. Returns null when no unclosed OPEN with that name exists —
 * caller falls back to appending a fresh CLOSED block.
 *
 * Used by the session store to close-in-place when an upstream tool "done"
 * event arrives. Walking backward (rather than matching only the very last
 * OPEN) means parallel tool calls work correctly: when 3 tools are in-flight
 * and "alpha" finishes first, this finds the OPEN that belongs to "alpha"
 * (which may not be the last OPEN — "beta" and "gamma" come after).
 *
 * The returned `name` is best-effort; undefined if the JSON hasn't streamed
 * in enough yet. Caller compares it to the upstream toolName to decide.
 *
 * ★ Boundary: searches only forward within each OPEN tag (TOOL_OPEN at
 * openStart → next TOOL_OPEN or end of content). Does not consider content
 * past a hypothetical unclosed CLOSE — there shouldn't be one.
 */
export function findTrailingOpenToolCall(
  content: string,
  toolName: string,
): { startIdx: number; name: string | undefined } | null {
  let cursor = content.length
  while (cursor > 0) {
    const openStart = content.lastIndexOf(TOOL_OPEN, cursor - 1)
    if (openStart === -1) return null
    const closeAfterOpen = content.indexOf(TOOL_CLOSE, openStart + TOOL_OPEN.length)
    if (closeAfterOpen !== -1 && closeAfterOpen < cursor) {
      // This OPEN is closed (the matching CLOSE is between it and cursor).
      // Walk past it and keep searching.
      cursor = openStart
      continue
    }
    // Unclosed (no CLOSE between openStart and cursor). Extract name.
    const afterOpen = openStart + TOOL_OPEN.length
    const nextOpen = content.indexOf(TOOL_OPEN, afterOpen)
    const blockEnd = nextOpen === -1 ? content.length : nextOpen
    const raw = content.slice(afterOpen, blockEnd)
    const name = extractToolNameFromPartialJson(raw)
    if (name === toolName) {
      return { startIdx: openStart, name }
    }
    // Wrong name — keep walking backward.
    cursor = openStart
  }
  return null
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

/**
 * 把 user message content 开头的 `[Uploaded file: <name>, path: <path>]\n\n` 前缀
 * 解析成结构化 attachment,返回剩余的用户正文。
 *
 * 背景:use-chat-stream.send 在 user 消息 send 时会把 prefix 拼进 finalContent
 * 发给后端。后端把 content 原样存进 DB。重新进入会话时,getMessages 返回的
 * content 已经包含 prefix —— 此时 ChatMessage.attachment 字段是 undefined
 * (新消息才有),气泡渲染 fallback 到纯文本,把 `[Uploaded file: ...]\n\n`
 * 直接当字符串显示。
 *
 * 本函数让渲染层在 attachment 字段缺失时,仍能从 content 字符串里把 prefix
 * 抠出来当 FileCard 渲染,消除重新进入会话后的"前缀乱码"显示。
 *
 * 返回 null 表示没有匹配到前缀 —— 调用方应当把 content 当普通文本渲染。
 *
 * 匹配规则:
 * - 必须以 `[Uploaded file: ` 起头,以 `]\n\n` 结尾(2 个换行)
 * - filename 走非贪婪匹配,在第一个 `, path: ` 处停下
 * - path 走非贪婪匹配,在第一个 `]\n\n` 处停下 —— 假设文件名/路径里不会
 *   出现字面 `]` 或 `path: ` 子串(对齐 vibe 上游 Agent.tsx:895 的产出格式)
 */
export function parseAttachmentPrefix(
  content: string,
): { attachment: { filename: string; file_path: string }; remaining: string } | null {
  // 注意用 [\s\S]*? 而不是 .+? —— 多行 content 时 . 默认不匹配换行,
  // 但 path 段理论上不应包含换行,保持非贪婪限定最小匹配即可。
  const match = content.match(/^\[Uploaded file: ([\s\S]+?), path: ([\s\S]+?)\]\n\n/)
  if (!match) return null
  return {
    attachment: { filename: match[1], file_path: match[2] },
    remaining: content.slice(match[0].length),
  }
}