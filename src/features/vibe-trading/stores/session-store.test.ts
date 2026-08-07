import { describe, it, expect, beforeEach } from "vitest"
import { useSessionStore } from "./session-store"

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
})