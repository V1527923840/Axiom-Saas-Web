import { describe, it, expect, beforeEach } from "vitest"
import { stampAttemptIdOnMessages, useSessionStore } from "./session-store"
import { TOOL_OPEN, TOOL_CLOSE } from "../lib/parse-message"

const SID = "sess-1"
const AID = "att-1"

beforeEach(() => {
  useSessionStore.getState().reset()
  useSessionStore.getState().ensure(SID)
})

describe("appendDelta — synthetic message fallback", () => {
  it("creates a synthetic assistant message when no match exists", () => {
    useSessionStore.getState().appendDelta(SID, AID, "hello ")
    const cur = useSessionStore.getState().byId[SID]
    const synth = cur.messages.find((m) => m.attemptId === AID)
    expect(synth).toBeDefined()
    expect(synth?.role).toBe("assistant")
    expect(synth?.content).toBe("hello ")
    expect(synth?.id).toBe(`stream-${AID}`)
  })

  it("appends subsequent deltas to the synthetic message", () => {
    useSessionStore.getState().appendDelta(SID, AID, "hello ")
    useSessionStore.getState().appendDelta(SID, AID, "world")
    const cur = useSessionStore.getState().byId[SID]
    const synth = cur.messages.find((m) => m.attemptId === AID)
    expect(synth?.content).toBe("hello world")
  })

  it("creates only one synthetic message across multiple deltas", () => {
    useSessionStore.getState().appendDelta(SID, AID, "a")
    useSessionStore.getState().appendDelta(SID, AID, "b")
    useSessionStore.getState().appendDelta(SID, AID, "c")
    const synths = useSessionStore
      .getState()
      .byId[SID].messages.filter((m) => m.attemptId === AID)
    expect(synths).toHaveLength(1)
  })
})

describe("setAttemptContent — synthetic message fallback", () => {
  it("creates a synthetic message with fullText when no match", () => {
    useSessionStore.getState().setAttemptContent(SID, AID, "full body")
    const cur = useSessionStore.getState().byId[SID]
    const synth = cur.messages.find((m) => m.attemptId === AID)
    expect(synth?.content).toBe("full body")
  })
})

describe("setHistoryLoaded — dedup by attemptId", () => {
  it("removes synthetic stream message when history has same attemptId", () => {
    // 1) 先有一个 synthetic 消息
    useSessionStore.getState().appendDelta(SID, AID, "streamed partial")
    // 2) history 加载,带了同 attemptId 的真实消息
    useSessionStore.getState().setHistoryLoaded(SID, [
      {
        id: "real-1",
        role: "assistant",
        content: "real final",
        attemptId: AID,
        createdAt: "2026-08-07T00:00:00.000Z",
      },
    ])
    const cur = useSessionStore.getState().byId[SID]
    expect(cur.messages).toHaveLength(1)
    expect(cur.messages[0].id).toBe("real-1")
    expect(cur.messages[0].content).toBe("real final")
    expect(cur.messages[0].attemptId).toBe(AID)
  })

  it("keeps synthetic messages that have no matching history entry", () => {
    useSessionStore.getState().appendDelta(SID, AID, "in flight")
    useSessionStore.getState().setHistoryLoaded(SID, [
      {
        id: "other-1",
        role: "user",
        content: "hi",
        createdAt: "2026-08-07T00:00:00.000Z",
      },
    ])
    const cur = useSessionStore.getState().byId[SID]
    expect(cur.messages).toHaveLength(2)
    const synth = cur.messages.find((m) => m.attemptId === AID)
    expect(synth?.content).toBe("in flight")
  })

  // I1: dedup by attemptId for non-stream- prefixed messages, AND by id collision.
  it("removes a non-synthetic pre-existing message when history brings the same attemptId", () => {
    // send() 路径:本地插入了 user + placeholder (optimistic, ids 是 u-/a- 前缀的临时 id)
    // 然后 setHistoryLoaded 来了 —— placeholder (如果已有 attemptId) 不应被复制。
    useSessionStore.setState((s) => {
      const c = s.byId[SID]
      return {
        byId: {
          ...s.byId,
          [SID]: {
            ...c,
            messages: [
              ...c.messages,
              {
                id: "optimistic-1",
                role: "user",
                content: "hi",
                createdAt: "2026-08-07T00:00:00.000Z",
              },
              {
                id: "optimistic-2",
                role: "assistant",
                content: "",
                attemptId: AID, // 已通过其他途径填上了 attemptId
                createdAt: "2026-08-07T00:00:00.000Z",
              },
            ],
          },
        },
      }
    })
    useSessionStore.getState().setHistoryLoaded(SID, [
      {
        id: "server-msg",
        role: "assistant",
        content: "real",
        attemptId: AID,
        createdAt: "2026-08-07T00:00:00.000Z",
      },
    ])
    const cur = useSessionStore.getState().byId[SID]
    // optimistic-2 (同 attemptId) 必须被去重,user 消息保留,server 消息加入
    const assistantMsgs = cur.messages.filter((m) => m.attemptId === AID)
    expect(assistantMsgs).toHaveLength(1)
    expect(assistantMsgs[0].id).toBe("server-msg")
  })

  it("removes a pre-existing message when incoming history has the same id", () => {
    // 防御:虽然 u-${ts}/a-${ts} 乐观 id 通常与服务端 id 不撞,但若撞了按 id 去重。
    useSessionStore.getState().appendDelta(SID, "att-x", "x")
    // 把 stream-att-x 重命名成与 incoming 同 id 来模拟撞 id 场景
    useSessionStore.setState((s) => {
      const c = s.byId[SID]
      return {
        byId: {
          ...s.byId,
          [SID]: {
            ...c,
            messages: c.messages.map((m) =>
              m.attemptId === "att-x" ? { ...m, id: "collide-id" } : m,
            ),
          },
        },
      }
    })
    useSessionStore.getState().setHistoryLoaded(SID, [
      {
        id: "collide-id",
        role: "user",
        content: "from server",
        createdAt: "2026-08-07T00:00:00.000Z",
      },
    ])
    const cur = useSessionStore.getState().byId[SID]
    expect(cur.messages.filter((m) => m.id === "collide-id")).toHaveLength(1)
    expect(cur.messages[0].content).toBe("from server")
  })
})

// C1: race between appendDelta(unknown aid) (creates synthetic) and send() stamping placeholder
// with the same attemptId — must end up with ONE assistant message, not two.
describe("stampAttemptIdOnMessages — race dedupe (C1)", () => {
  it("drops placeholder and keeps synthetic when both have the same attemptId", () => {
    // 模拟 race:appendDelta 先创建了 stream-att-1 synthetic (含 "hello")。
    // 然后 send() 拿到 attemptId,准备把 placeholder.attemptId 写回。
    const messages = [
      { id: "u-1", role: "user" as const, content: "hi", createdAt: "2026-08-07T00:00:00.000Z" },
      { id: "a-1", role: "assistant" as const, content: "", createdAt: "2026-08-07T00:00:00.000Z" },
      { id: "stream-att-1", role: "assistant" as const, content: "hello", attemptId: "att-1", createdAt: "2026-08-07T00:00:00.000Z" },
    ]
    const out = stampAttemptIdOnMessages(messages, "a-1", "att-1", undefined, "hello")
    // placeholder 被丢弃
    expect(out.find((m) => m.id === "a-1")).toBeUndefined()
    // synthetic 仍然存在,attemptId 保留
    const synth = out.find((m) => m.attemptId === "att-1")
    expect(synth).toBeDefined()
    expect(synth?.id).toBe("stream-att-1")
    expect(synth?.content).toBe("hello") // 不被 buffered 覆盖
    // assistant 消息只剩一条 (只有 synthetic)
    const assistants = out.filter((m) => m.role === "assistant")
    expect(assistants).toHaveLength(1)
    // user 消息保留
    expect(out.find((m) => m.id === "u-1")).toBeDefined()
  })

  it("stamps attemptId onto placeholder when no synthetic exists", () => {
    // 正常路径:没 race,placeholder 直接被 stamp。
    const messages = [
      { id: "u-1", role: "user" as const, content: "hi", createdAt: "2026-08-07T00:00:00.000Z" },
      { id: "a-1", role: "assistant" as const, content: "", createdAt: "2026-08-07T00:00:00.000Z" },
    ]
    const out = stampAttemptIdOnMessages(messages, "a-1", "att-1", undefined, "")
    const a = out.find((m) => m.id === "a-1")
    expect(a?.attemptId).toBe("att-1")
  })

  it("prefers snapshot over buffered when stamping without synthetic", () => {
    const messages = [
      { id: "a-1", role: "assistant" as const, content: "", createdAt: "2026-08-07T00:00:00.000Z" },
    ]
    const out = stampAttemptIdOnMessages(messages, "a-1", "att-1", "snapshot-text", "buffered-text")
    expect(out[0].content).toBe("snapshot-text")
  })
})

// C2: setAttemptContent creates synthetic for unknown aid; later appendDelta must grow it
// (not be blocked by stale pendingSnapshot).
describe("setAttemptContent — no stale pendingSnapshot gate (C2)", () => {
  it("appended deltas after snapshot synthetic continue to grow the message", () => {
    // 1) snapshot 全量帧到达,no aid 匹配 → 创建 synthetic 持有 fullText
    useSessionStore.getState().setAttemptContent(SID, AID, "full text")
    const afterSnap = useSessionStore.getState().byId[SID].messages
    expect(afterSnap[0].content).toBe("full text")
    expect(afterSnap[0].attemptId).toBe(AID)
    // pendingSnapshot 不应再持有该 aid (否则会拦截后续 delta)
    const snap = useSessionStore.getState().byId[SID].pendingSnapshot
    expect(snap?.[AID]).toBeUndefined()

    // 2) 后续 delta 帧到达,必须继续追加,不能被 C2 bug 拦截
    useSessionStore.getState().appendDelta(SID, AID, " more")
    const afterDelta = useSessionStore.getState().byId[SID].messages
    expect(afterDelta).toHaveLength(1)
    expect(afterDelta[0].content).toBe("full text more")
  })

  it("clears pendingSnapshot[aid] when setAttemptContent matches an existing message", () => {
    // 模拟 refresh 后接续:slot 里 pendingSnapshot 还残留旧值,新到的 snapshot 命中消息
    useSessionStore.getState().appendDelta(SID, AID, "first")
    // 注入残留 pendingSnapshot (跨场景残留的边角 case)
    useSessionStore.setState((s) => {
      const c = s.byId[SID]
      return {
        byId: {
          ...s.byId,
          [SID]: {
            ...c,
            pendingSnapshot: { [AID]: "old" },
          },
        },
      }
    })
    // setAttemptContent 命中已有消息
    useSessionStore.getState().setAttemptContent(SID, AID, "full")
    // pendingSnapshot[aid] 必须被清掉,否则后续 delta 会被拦截
    const snap = useSessionStore.getState().byId[SID].pendingSnapshot
    expect(snap?.[AID]).toBeUndefined()
    // appendDelta 仍然能扩内容
    useSessionStore.getState().appendDelta(SID, AID, " more")
    expect(useSessionStore.getState().byId[SID].messages[0].content).toBe("full more")
  })
})

// I4: markAttemptError must surface errors that arrive for an aid present in messages,
// even when activeAttemptId is null (refresh scenario).
describe("markAttemptError — error surfaces even without activeAttemptId (I4)", () => {
  it("sets error when synthetic with aid exists in messages, activeAttemptId === null", () => {
    // refresh 后接续:slot.activeAttemptId 还没填,但 stream-<aid> synthetic 已存在
    useSessionStore.getState().appendDelta(SID, AID, "streamed partial")
    useSessionStore.setState((s) => {
      const c = s.byId[SID]
      return {
        byId: {
          ...s.byId,
          [SID]: { ...c, activeAttemptId: null, streaming: false },
        },
      }
    })
    useSessionStore.getState().markAttemptError(SID, AID, "upstream exploded")
    const cur = useSessionStore.getState().byId[SID]
    expect(cur.error).toBe("upstream exploded")
    expect(cur.streaming).toBe(false)
  })

  it("ignores errors for unknown aid when activeAttemptId is null too", () => {
    // aid 不在 messages 里 + activeAttemptId 是 null → 忽略 (防御性测试)。
    useSessionStore.getState().markAttemptError(SID, "stranger-a", "boom")
    const cur = useSessionStore.getState().byId[SID]
    expect(cur.error).toBeNull()
    expect(cur.streaming).toBe(false)
  })
})

// upstream vibe service emits tool calls as separate events, not inline <tool_call> tags.
// The frontend synthesizes a closed <tool_call> block into the assistant message content so
// ToolCallBlock renders. See events-stream.ts routeEvent "tool_event" case.
describe("appendToolCall — synthesize closed <tool_call> block from upstream tool event", () => {
  it("appends a <tool_call> block to an existing assistant message matching attemptId", () => {
    // 1) ensure a session + assistant message with matching attemptId
    useSessionStore.getState().appendDelta(SID, AID, "thinking out loud ")
    const before = useSessionStore.getState().byId[SID].messages[0].content
    expect(before).toBe("thinking out loud ")

    // 2) call appendToolCall (in-progress: only tool name + elapsed_s)
    useSessionStore.getState().appendToolCall(SID, AID, "get_market_data", 12)

    // 3) the message content now has a closed <tool_call> block appended
    const cur = useSessionStore.getState().byId[SID]
    expect(cur.messages).toHaveLength(1)
    const appended = cur.messages[0].content
    expect(appended.startsWith("thinking out loud ")).toBe(true)
    expect(appended).toContain(TOOL_OPEN)
    expect(appended).toContain(TOOL_CLOSE)
    // closed block: TOOL_CLOSE comes after TOOL_OPEN
    expect(appended.indexOf(TOOL_CLOSE)).toBeGreaterThan(appended.indexOf(TOOL_OPEN))
    // block content is valid JSON with name + elapsed_s
    const blockJson = appended.slice(
      appended.indexOf(TOOL_OPEN) + TOOL_OPEN.length,
      appended.indexOf(TOOL_CLOSE),
    )
    const parsed = JSON.parse(blockJson)
    expect(parsed.name).toBe("get_market_data")
    expect(parsed.elapsed_s).toBe(12)
  })

  it("creates a synthetic stream-<aid> message when no match exists", () => {
    // 1) session exists but no messages yet
    expect(useSessionStore.getState().byId[SID].messages).toHaveLength(0)

    // 2) call appendToolCall — should synthesize stream-<aid>
    useSessionStore.getState().appendToolCall(SID, AID, "web_search")

    // 3) a new assistant message with id="stream-<aid>" exists and contains the closed block
    const cur = useSessionStore.getState().byId[SID]
    expect(cur.messages).toHaveLength(1)
    const synth = cur.messages[0]
    expect(synth.id).toBe(`stream-${AID}`)
    expect(synth.role).toBe("assistant")
    expect(synth.attemptId).toBe(AID)
    expect(synth.content).toContain(TOOL_OPEN)
    expect(synth.content).toContain(TOOL_CLOSE)
    const blockJson = synth.content.slice(
      synth.content.indexOf(TOOL_OPEN) + TOOL_OPEN.length,
      synth.content.indexOf(TOOL_CLOSE),
    )
    expect(JSON.parse(blockJson)).toEqual({ name: "web_search" })
  })

  it("includes status, elapsed_ms, and preview fields when provided (done event)", () => {
    useSessionStore.getState().appendToolCall(
      SID,
      AID,
      "get_market_data",
      undefined, // no elapsed_s — tool may complete without an in-progress frame
      9828, // elapsed_ms
      '{"ticker":"AAPL","price":187.42}', // preview
      "ok",
    )
    const cur = useSessionStore.getState().byId[SID]
    const blockJson = cur.messages[0].content.slice(
      cur.messages[0].content.indexOf(TOOL_OPEN) + TOOL_OPEN.length,
      cur.messages[0].content.indexOf(TOOL_CLOSE),
    )
    const parsed = JSON.parse(blockJson)
    expect(parsed).toEqual({
      name: "get_market_data",
      status: "ok",
      elapsed_ms: 9828,
      preview: '{"ticker":"AAPL","price":187.42}',
    })
  })

  it("is a no-op when the session does not exist", () => {
    // session not ensured — store should silently ignore
    useSessionStore.getState().reset()
    expect(() =>
      useSessionStore.getState().appendToolCall("missing-sess", AID, "any_tool"),
    ).not.toThrow()
    expect(useSessionStore.getState().byId["missing-sess"]).toBeUndefined()
  })
})