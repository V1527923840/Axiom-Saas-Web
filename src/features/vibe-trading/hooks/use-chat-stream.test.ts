// Tests for the pure toChatMessage helper in use-chat-stream.ts.
//
// Regression coverage for the bug where getMessages() returned a
// metadata.rag_context field but toChatMessage dropped it before messages
// landed in the Zustand store, so <RagContextPanel/> never rendered on
// reload / session switch.
//
// Style note: toChatMessage is a pure function, so we test it directly
// without React rendering — matching the project's lighter-weight pure-fn
// tests (see e.g. goal-chip.test.tsx for the React side).

import { describe, it, expect } from "vitest"
import type { AiMessage } from "../lib/vibe-types"
import { toChatMessage } from "./use-chat-stream"

describe("toChatMessage — ragContext propagation (regression: data-source panel missing on reload)", () => {
  it("propagates ragContext when present", () => {
    const m: Partial<AiMessage> = {
      id: "m-1",
      role: "assistant",
      content: "answer text",
      createdAt: "2026-08-13T00:00:00.000Z",
      ragContext: {
        markdown: "- **知识星球 · 摘要** (相似度 0.67)\n  _《T》_ (2026-08-13)\n  b",
        chunk_ids: [1, 2],
        entities_resolved: {},
        latency_ms: 42,
      },
    }
    const got = toChatMessage(m as AiMessage)
    expect(got.ragContext).toEqual(m.ragContext)
  })

  it("preserves null ragContext (server returned null after metadata.rag_context ?? null)", () => {
    const m: Partial<AiMessage> = {
      id: "m-2",
      role: "assistant",
      content: "no-rag",
      createdAt: "2026-08-13T00:00:00.000Z",
      ragContext: null,
    }
    const got = toChatMessage(m as AiMessage)
    expect(got.ragContext).toBeNull()
  })

  it("preserves undefined ragContext (legacy messages without metadata.rag_context)", () => {
    const m: Partial<AiMessage> = {
      id: "m-3",
      role: "assistant",
      content: "legacy",
      createdAt: "2026-08-13T00:00:00.000Z",
    }
    const got = toChatMessage(m as AiMessage)
    expect(got.ragContext).toBeUndefined()
  })

  it("preserves other fields (id, role, content, createdAt) untouched", () => {
    const m: Partial<AiMessage> = {
      id: "m-4",
      role: "user",
      content: "user prompt",
      createdAt: "2026-08-13T00:00:00.000Z",
    }
    const got = toChatMessage(m as AiMessage)
    expect(got.id).toBe("m-4")
    expect(got.role).toBe("user")
    expect(got.content).toBe("user prompt")
    expect(got.createdAt).toBe("2026-08-13T00:00:00.000Z")
  })
})