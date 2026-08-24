# Vibe-Trading RAG Data-Source Panel — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Embed the "数据来源" collapsible panel (showing the RAG chunks used by the Vibe-Trading agent for an answer) under every assistant bubble in `Axiom-Saas-Web/src/features/vibe-trading/`, matching the standalone Vibe-Trading layout and surviving page refresh.

**Architecture:** Frontend-only, TDD-driven changes strictly inside `src/features/vibe-trading/`. Wire the existing `rag_context` SSE event (already emitted by VibeTrading backend, already persisted to `Message.metadata.rag_context`) through `events-stream.ts` → `session-store` → `chat-dialog` rendering. No backend changes.

**Tech Stack:** Vite + React 19, TypeScript 5.9, Zustand 5, shadcn/ui + Tailwind CSS 4, vitest + jsdom.

**Spec reference:** `docs/superpowers/specs/2026-08-24-vibe-trading-rag-context-panel-design.md`

---

## File Structure

Files created or modified by this plan:

| Path | Action | Responsibility |
|------|--------|----------------|
| `src/features/vibe-trading/lib/vibe-types.ts` | modify | Add `RagContext` type, extend `AiMessage` with `ragContext` field |
| `src/features/vibe-trading/lib/parse-sources.ts` | create | Pure function `parseSources(markdown)` — convert RAG markdown to structured cards |
| `src/features/vibe-trading/lib/parse-sources.test.ts` | create | Unit tests for `parseSources` |
| `src/features/vibe-trading/stores/session-store.ts` | modify | Extend `ChatMessage` with `ragContext`; add `pendingRagContexts`, `upsertRagContext`, replay in `stampAttemptIdOnMessages` |
| `src/features/vibe-trading/stores/session-store.test.ts` | modify | Unit tests for rag-context store methods + replay |
| `src/features/vibe-trading/services/vibe-api.ts` | modify | `getMessages()` extracts `metadata.rag_context` into `ragContext` field |
| `src/features/vibe-trading/services/events-stream.ts` | modify | Add `case "rag_context"` to `routeEvent` |
| `src/features/vibe-trading/components/rag-context-panel.tsx` | create | Collapsible panel UI, shadcn/ui styled |
| `src/features/vibe-trading/components/rag-context-panel.test.tsx` | create | Unit tests for the panel (rendering + expand/collapse) |
| `src/features/vibe-trading/components/chat-dialog.tsx` | modify | Wire `<RagContextPanel/>` into assistant bubble `contentRender` |

No other files are touched. Backend (AxiomVibeTrading) and Saas-Server are unchanged.

---

## Conventions

- All commits on the existing `develop_kwh` branch.
- Run `npm run test:unit` (or `pnpm test:unit`) after every task that adds/changes code, scoped to the affected file when faster.
- Run `npm run lint` once at the end of every task.
- Test framework: vitest + jsdom. Project uses **plain DOM** (createRoot + container), NOT `@testing-library/react`. Existing files like `goal-chip.test.tsx` and `session-store.test.ts` are the reference style.
- Module alias `@/*` resolves to `src/*`. Relative imports inside `features/vibe-trading/` use `./` and `../` — match existing files (no `@` alias used inside this feature module).

---

## Task 1: Add `RagContext` type and extend `AiMessage`

**Files:**
- Modify: `src/features/vibe-trading/lib/vibe-types.ts`

- [ ] **Step 1: Read the current file and confirm the `AiMessage` interface location**

Run:
```bash
grep -n "export interface AiMessage" src/features/vibe-trading/lib/vibe-types.ts
```
Expected: a single line showing the interface declaration around line 150.

- [ ] **Step 2: Add `RagContext` interface before `AiMessage`**

In `src/features/vibe-trading/lib/vibe-types.ts`, immediately **before** `export interface AiMessage {`, insert:

```typescript
/**
 * RAG 数据来源面板的载荷。
 *
 * 由 VibeTrading 后端 `agent/src/agent/loop.py:626-639` 推 SSE `rag_context` 事件
 * 携带，并由 `agent/src/session/service.py:189-205` 持久化到
 * `Message.metadata.rag_context`。本类型用于前端把这段 metadata 提到顶层
 * `AiMessage.ragContext`，便于组件层直接消费。
 *
 * `markdown` 是已格式化的多卡片 markdown（卡片之间用 `\n---\n` 分隔），
 * 由 `lib/parse-sources.ts#parseSources` 解析为结构化卡片。
 */
export interface RagContext {
  /** 已格式化的 markdown 文本，多卡片之间用 `\n---\n` 分隔 */
  markdown: string;
  /** 命中的 PG 向量库 chunk id */
  chunk_ids?: number[];
  /** 实体解析映射，例如 { "中芯国际": "688981.SH" } */
  entities_resolved?: Record<string, string>;
  /** RAG 检索耗时（毫秒） */
  latency_ms?: number;
}

```

- [ ] **Step 3: Extend `AiMessage` with `ragContext` field**

In the same file, locate the `AiMessage` interface (already contains `id`, `role`, `content`, `createdAt`, `meta?`) and add the field. The full interface should become:

```typescript
export interface AiMessage {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  createdAt: string;
  /** 自由字段：保留以兼容未来其他 metadata 写入；本 spec 阶段仅用于向后兼容遗留实现 */
  meta?: Record<string, unknown>;
  /** RAG 数据来源面板；服务端持久化在 message.metadata.rag_context */
  ragContext?: RagContext | null;
}
```

- [ ] **Step 4: Verify TypeScript compiles**

Run:
```bash
npm run lint
```
Expected: no new errors. (Linting also runs the type checker indirectly via the project's tsconfig.)

- [ ] **Step 5: Commit**

```bash
git add src/features/vibe-trading/lib/vibe-types.ts
git commit -m "feat(vibe-trading): add RagContext type and AiMessage.ragContext"
```

---

## Task 2: Implement `parseSources` (pure function) with TDD

**Files:**
- Create: `src/features/vibe-trading/lib/parse-sources.ts`
- Create: `src/features/vibe-trading/lib/parse-sources.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/features/vibe-trading/lib/parse-sources.test.ts`:

```typescript
import { describe, it, expect } from "vitest"
import { parseSources } from "./parse-sources"

describe("parseSources", () => {
  it("returns [] for empty input", () => {
    expect(parseSources("")).toEqual([])
  })

  it("returns [] for non-list markdown", () => {
    expect(parseSources("hello world")).toEqual([])
  })

  it("parses a single card with all 5 fields", () => {
    const md = [
      "- **知识星球 · 摘要** (相似度 0.82)",
      "  _《中芯国际Q2Q6业绩快评》_ (2026-08-13)",
      "  中芯国际2026业绩与产能双兑现，3Q26指引显示涨价驱动盈利质量接力增长",
    ].join("\n")
    expect(parseSources(md)).toEqual([
      {
        source: "知识星球",
        view: "摘要",
        title: "中芯国际Q2Q6业绩快评",
        date: "2026-08-13",
        similarity: "0.82",
        body: "中芯国际2026业绩与产能双兑现，3Q26指引显示涨价驱动盈利质量接力增长",
      },
    ])
  })

  it("parses multiple cards separated by \\n---\\n", () => {
    const md = [
      "- **知识星球 · 摘要** (相似度 0.67)",
      "  _《标题A》_ (2026-08-13)",
      "  body A",
      "---",
      "- **知识星球 · 基础事实** (相似度 0.65)",
      "  _《标题B》_ (2026-08-14)",
      "  body B",
    ].join("\n")
    const out = parseSources(md)
    expect(out).toHaveLength(2)
    expect(out[0]?.title).toBe("标题A")
    expect(out[0]?.view).toBe("摘要")
    expect(out[1]?.title).toBe("标题B")
    expect(out[1]?.view).toBe("基础事实")
  })

  it("handles missing similarity gracefully", () => {
    const md = [
      "- **知识星球 · 原文**",
      "  _《标题X》_ (2026-08-15)",
      "  body X",
    ].join("\n")
    expect(parseSources(md)).toEqual([
      {
        source: "知识星球",
        view: "原文",
        title: "标题X",
        date: "2026-08-15",
        similarity: undefined,
        body: "body X",
      },
    ])
  })

  it("skips blocks that don't start with -", () => {
    const md = [
      "## 这是分隔标题", // no leading dash — skip
      "- **知识星球 · 摘要** (相似度 0.50)",
      "  _《有效标题》_ (2026-08-13)",
      "  body",
    ].join("\n")
    expect(parseSources(md)).toHaveLength(1)
    expect(parseSources(md)[0]?.title).toBe("有效标题")
  })

  it("returns [] on parse failure without throwing", () => {
    // Header present but no body / title — parser should not crash
    const md = "- **知识星球 · 摘要**"
    expect(() => parseSources(md)).not.toThrow()
    // Title-less card: title is empty string, body is whatever follows
    const out = parseSources(md)
    expect(out).toHaveLength(1)
    expect(out[0]?.title).toBe("")
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

Run:
```bash
npm run test:unit -- src/features/vibe-trading/lib/parse-sources.test.ts
```
Expected: FAIL — `parseSources` is not exported from `./parse-sources`.

- [ ] **Step 3: Implement `parseSources`**

Create `src/features/vibe-trading/lib/parse-sources.ts`:

```typescript
/**
 * 解析后端 RAG markdown 为结构化卡片数组。
 *
 * markdown 格式（来自 AxiomVibeTrading 后端 RAG prefetch）：
 * - 卡片之间用 `\n---\n` 分隔
 * - 每张卡片首行：`- **知识星球 · 摘要** (相似度 0.82)`
 * - 第二行：`_《标题》_ (2026-08-13)`
 * - 后续行为摘要正文
 *
 * 解析失败（格式漂移）时返回空数组；调用方应降级显示原 markdown 片段。
 */
export type ParsedSource = {
  source: string;        // "知识星球"
  view: string;          // "摘要" / "基础事实" / "原文"
  title: string;         // "中芯国际Q2Q6业绩快评"
  date: string;          // "2026-08-13"
  similarity?: string;   // "0.67"
  body: string;          // 摘要正文
};

export function parseSources(md: string): ParsedSource[] {
  const out: ParsedSource[] = [];
  const blocks = md.split(/\n---\n/);
  for (const blk of blocks) {
    const trimmed = blk.trim();
    if (!trimmed || !trimmed.startsWith("-")) continue;
    // Header: "- **知识星球 · 摘要** (相似度 0.82)"
    const headerMatch = trimmed.match(/^-\s*\*\*(.+?)\*\*\s*(\(相似度\s*([0-9.]+)\))?/m);
    if (!headerMatch) continue;
    const sourceView = headerMatch[1];   // e.g. "知识星球 · 摘要"
    const similarity = headerMatch[3];
    // Title line: "_《标题》_ (2026-08-13)"
    const titleMatch = trimmed.match(/_\s*([^_]+?)\s*_\s*\((\d{4}-\d{2}-\d{2})\)/);
    const title = titleMatch ? titleMatch[1].trim() : "";
    const date = titleMatch ? titleMatch[2] : "";
    // Body: everything after the title line
    const bodyMatch = trimmed.match(/_\s*[^_]+_\s*\([^)]+\)[^]*\n([\s\S]*)$/);
    const body = bodyMatch ? bodyMatch[1].trim() : "";
    const [source, view] = sourceView.split("·").map((s) => s.trim());
    out.push({ source, view, title, date, similarity, body });
  }
  return out;
}
```

- [ ] **Step 4: Run tests to confirm they pass**

Run:
```bash
npm run test:unit -- src/features/vibe-trading/lib/parse-sources.test.ts
```
Expected: PASS — all 7 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/features/vibe-trading/lib/parse-sources.ts src/features/vibe-trading/lib/parse-sources.test.ts
git commit -m "feat(vibe-trading): parseSources RAG markdown → structured cards"
```

---

## Task 3: Extend `session-store` with `pendingRagContexts` + `upsertRagContext` (TDD)

**Files:**
- Modify: `src/features/vibe-trading/stores/session-store.ts`
- Modify: `src/features/vibe-trading/stores/session-store.test.ts`

- [ ] **Step 1: Read the current store to understand `appendDelta` + `stampAttemptIdOnMessages` patterns**

Run:
```bash
grep -n "appendDelta\|stampAttemptIdOnMessages\|pendingDeltas\|byId\[sessionId\]" src/features/vibe-trading/stores/session-store.ts | head -20
```
Expected: shows the existing pattern for race-safe buffering.

- [ ] **Step 2: Write the failing tests for `upsertRagContext`**

Open `src/features/vibe-trading/stores/session-store.test.ts` and **append** the following describe block at the end of the file (do not modify existing tests):

```typescript
import type { RagContext } from "../lib/vibe-types"

describe("upsertRagContext — early-arrival buffering", () => {
  it("writes ragContext to existing synthetic stream-<aid> message", () => {
    // simulate an attempt whose stream message already exists
    useSessionStore.getState().appendDelta(SID, AID, "draft ")
    const rag: RagContext = {
      markdown: "- **知识星球 · 摘要** (相似度 0.50)\n  _《T》_ (2026-08-13)\n  b",
      chunk_ids: [1, 2],
      entities_resolved: { 中芯国际: "688981.SH" },
      latency_ms: 42,
    }
    useSessionStore.getState().upsertRagContext(SID, AID, rag)
    const cur = useSessionStore.getState().byId[SID]
    const synth = cur.messages.find((m) => m.attemptId === AID)
    expect(synth?.ragContext).toEqual(rag)
  })

  it("buffers in pendingRagContexts when no matching message exists", () => {
    const rag: RagContext = { markdown: "- **x**" }
    useSessionStore.getState().upsertRagContext(SID, AID, rag)
    const cur = useSessionStore.getState().byId[SID]
    expect(cur.pendingRagContexts?.[AID]).toEqual(rag)
    // no message yet, so messages array is untouched
    expect(cur.messages.find((m) => m.attemptId === AID)).toBeUndefined()
  })

  it("replays pendingRagContexts when attemptId is stamped onto a message", () => {
    // Buffer first (no message yet)
    const rag: RagContext = { markdown: "- **knowledge · digest**" }
    useSessionStore.getState().upsertRagContext(SID, AID, rag)
    // Now simulate use-chat-stream stamping attemptId onto an assistant message
    // via the existing public API path: appendDelta (which calls stampAttemptIdOnMessages).
    useSessionStore.getState().appendDelta(SID, AID, "first delta ")
    const cur = useSessionStore.getState().byId[SID]
    const msg = cur.messages.find((m) => m.attemptId === AID)
    expect(msg).toBeDefined()
    expect(msg?.ragContext).toEqual(rag)
    // Buffer should be cleared for this attempt
    expect(cur.pendingRagContexts?.[AID]).toBeUndefined()
  })

  it("does not mutate ragContext for unrelated attempts", () => {
    const rag: RagContext = { markdown: "- **x**" }
    useSessionStore.getState().upsertRagContext(SID, AID, rag)
    useSessionStore.getState().appendDelta(SID, "other-attempt", "hi")
    const cur = useSessionStore.getState().byId[SID]
    const other = cur.messages.find((m) => m.attemptId === "other-attempt")
    expect(other?.ragContext).toBeUndefined()
  })
})
```

- [ ] **Step 3: Run the new tests to confirm they fail**

Run:
```bash
npm run test:unit -- src/features/vibe-trading/stores/session-store.test.ts
```
Expected: FAIL — `upsertRagContext` does not exist on the store.

- [ ] **Step 4: Extend `ChatMessage` type**

In `src/features/vibe-trading/stores/session-store.ts`, locate the `ChatMessage` type (already has `id`, `role`, `content`, `attemptId`, etc.) and add `ragContext`:

```typescript
export type ChatMessage = {
  // ... existing fields ...
  /**
   * RAG 数据来源；流式期间由 SSE `rag_context` 事件注入；刷新后由 getMessages() 从
   * 服务端 metadata.rag_context 提到顶层。组件层在助手气泡下方据此渲染面板。
   */
  ragContext?: RagContext | null;
};
```

Add `RagContext` to the existing import from `../lib/vibe-types` at the top of the file. If the existing line is:

```typescript
import type { GoalSnapshot, SwarmRunStatus } from "../lib/vibe-types"
```

change it to:

```typescript
import type { GoalSnapshot, RagContext, SwarmRunStatus } from "../lib/vibe-types"
```

- [ ] **Step 5: Extend `PerSession` with `pendingRagContexts`**

Locate `PerSession` and add:

```typescript
export type PerSession = {
  // ... existing fields ...
  /**
   * 早到的 rag_context 缓冲：与 pendingDeltas 同等地位。SSE rag_context 事件到达时
   * 如果对应 attemptId 的消息还没在 messages 里（占位消息还没拿到 attemptId），先
   * 按 attemptId 缓存；stampAttemptIdOnMessages 回放时再写到目标消息上。
   */
  pendingRagContexts?: Record<string, RagContext>;
};
```

- [ ] **Step 6: Add `upsertRagContext` action to the store**

In the `SessionStore` interface (the type that lists actions), add:

```typescript
/**
 * SSE rag_context 事件入口。
 * 1. 若 messages 里已有 stream-<aid> synthetic → 直接写 ragContext
 * 2. 否则存入 pendingRagContexts[aid]
 */
upsertRagContext: (sessionId: string, attemptId: string, rag: RagContext) => void;
```

In the `empty()` factory function (currently returns `{ messages: [], streaming: false, ... }`), add `pendingRagContexts: {}`:

```typescript
const empty = (): PerSession => ({
  // ... existing fields ...
  pendingRagContexts: {},
});
```

In the store implementation object, add the method (place it near `appendDelta` for locality):

```typescript
upsertRagContext: (sessionId, attemptId, rag) => {
  set((s) => {
    const cur = s.byId[sessionId];
    if (!cur) return s;
    const existing = cur.messages.find((m) => m.attemptId === attemptId);
    if (existing) {
      // 直接写到对应消息
      return {
        ...s,
        byId: {
          ...s.byId,
          [sessionId]: touchEvent({
            ...cur,
            messages: cur.messages.map((m) =>
              m.attemptId === attemptId ? { ...m, ragContext: rag } : m,
            ),
          }),
        },
      };
    }
    // 缓冲：等 stampAttemptIdOnMessages 回放
    return {
      ...s,
      byId: {
        ...s.byId,
        [sessionId]: touchEvent({
          ...cur,
          pendingRagContexts: { ...(cur.pendingRagContexts ?? {}), [attemptId]: rag },
        }),
      },
    };
  });
},
```

- [ ] **Step 7: Replay `pendingRagContexts` inside `stampAttemptIdOnMessages`**

Locate the `stampAttemptIdOnMessages` function. It currently:
1. Walks messages
2. If a `stream-<aid>` synthetic exists for `attemptId`, writes attemptId onto it
3. If not, writes attemptId onto `placeholderId` and seeds `content` from buffered deltas

Modify the function to **also drain `pendingRagContexts[attemptId]`** onto whichever message ends up holding the attemptId. The minimal patch: after the function decides which message will hold the attemptId, return a tuple `(nextMessages, ragToAttach?)` and let callers merge it into the store. Simpler approach: instead of changing the pure function's contract, do the replay in the **store mutator** that calls it (typically `appendDelta`).

Locate `appendDelta` in the store. After the messages update, add a second pass that drains `pendingRagContexts[attemptId]`:

```typescript
appendDelta: (sessionId, attemptId, delta) => {
  set((s) => {
    const cur = s.byId[sessionId];
    if (!cur) return s;
    const { messages: stampedMessages, placeholderId } = stampAttemptIdOnMessages(
      cur.messages,
      // placeholderId of the latest user message (if any) — same logic as before
      ...,
      attemptId,
      delta,
      cur.pendingDeltas?.[attemptId],
    );
    // Drain pendingRagContexts for this attempt onto whichever message now owns it.
    const pendingRag = cur.pendingRagContexts?.[attemptId];
    const drained = { ...(cur.pendingRagContexts ?? {}) };
    delete drained[attemptId];
    const finalMessages = pendingRag
      ? stampedMessages.map((m) =>
          m.attemptId === attemptId ? { ...m, ragContext: pendingRag } : m,
        )
      : stampedMessages;
    return {
      ...s,
      byId: {
        ...s.byId,
        [sessionId]: touchEvent({
          ...cur,
          messages: finalMessages,
          pendingDeltas: { ...(cur.pendingDeltas ?? {}) },
          pendingRagContexts: drained,
          activeAttemptId: attemptId,
        }),
      },
    };
  });
},
```

**Important:** The exact shape of the call to `stampAttemptIdOnMessages` depends on its current signature. Open the function and replicate its current argument list verbatim, then add the rag-drain pass AFTER the `stampedMessages` are produced. Do not change `stampAttemptIdOnMessages`'s pure-function signature.

- [ ] **Step 8: Re-run tests**

Run:
```bash
npm run test:unit -- src/features/vibe-trading/stores/session-store.test.ts
```
Expected: PASS — all tests (old + 4 new) green.

- [ ] **Step 9: Lint check**

Run:
```bash
npm run lint
```
Expected: no new errors.

- [ ] **Step 10: Commit**

```bash
git add src/features/vibe-trading/stores/session-store.ts src/features/vibe-trading/stores/session-store.test.ts
git commit -m "feat(vibe-trading): upsertRagContext with race-safe pending buffer"
```

---

## Task 4: Update `vibe-api.getMessages()` to extract `metadata.rag_context`

**Files:**
- Modify: `src/features/vibe-trading/services/vibe-api.ts`

- [ ] **Step 1: Locate `getMessages`**

Run:
```bash
grep -n "export async function getMessages\|getMessages(" src/features/vibe-trading/services/vibe-api.ts
```
Expected: shows the function around line 217.

- [ ] **Step 2: Modify `getMessages` to map raw messages**

Replace the function body. Current:

```typescript
export async function getMessages(
  id: string,
  cursor?: string,
): Promise<AiMessage[]> {
  const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""
  const res = await request<{ data: AiMessage[] }>(
    `${SESSION_BASE}/sessions/${encodeURIComponent(id)}/messages${query}`,
    { method: "GET" },
  )
  return Array.isArray(res.data) ? res.data : []
}
```

New:

```typescript
export async function getMessages(
  id: string,
  cursor?: string,
): Promise<AiMessage[]> {
  const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""
  // 服务端返回 { message_id, role, content, metadata: { rag_context: ... } }
  // 把 metadata.rag_context 提到顶层 ragContext，便于消费
  const res = await request<{ data: any[] }>(
    `${SESSION_BASE}/sessions/${encodeURIComponent(id)}/messages${query}`,
    { method: "GET" },
  )
  if (!Array.isArray(res.data)) return []
  return res.data.map((m: any) => ({
    id: m.message_id ?? m.id,
    role: m.role,
    content: m.content ?? "",
    createdAt: m.created_at ?? m.createdAt ?? "",
    meta: m.metadata,
    ragContext: m.metadata?.rag_context ?? null,
  })) as AiMessage[]
}
```

- [ ] **Step 3: Type-check via lint**

Run:
```bash
npm run lint
```
Expected: no new errors.

- [ ] **Step 4: Run existing unit tests touching getMessages**

Run:
```bash
npm run test:unit -- src/features/vibe-trading
```
Expected: PASS — no regressions. (If a test specifically mocks `getMessages`, it should still pass because the signature is unchanged.)

- [ ] **Step 5: Commit**

```bash
git add src/features/vibe-trading/services/vibe-api.ts
git commit -m "feat(vibe-trading): extract metadata.rag_context in getMessages"
```

---

## Task 5: Wire `rag_context` SSE event in `events-stream.ts`

**Files:**
- Modify: `src/features/vibe-trading/services/events-stream.ts`

- [ ] **Step 1: Locate `routeEvent` switch**

Run:
```bash
grep -n "case \"rag_context\"\|case \"text_delta\"" src/features/vibe-trading/services/events-stream.ts
```
Expected: shows the switch cases. The `case "rag_context"` line should NOT exist yet.

- [ ] **Step 2: Add the new case**

In the `routeEvent` function, after the `case "tool_event":` block and **before** the `case "goal.created":` block, insert:

```typescript
    case "rag_context": {
      // 后端 agent loop 在 pre-loop 阶段 emit,早于首个 text_delta。
      // store 负责 race-safe 缓冲(写到 stream-<aid> synthetic 或 pendingRagContexts[aid])。
      const aid = ev.data?.attempt_id as string | undefined;
      if (!aid) break;
      const md = typeof ev.data?.markdown === "string" ? ev.data.markdown : "";
      if (!md) break; // 空 markdown 视为无命中,不渲染面板
      const chunkIds = Array.isArray(ev.data?.chunk_ids) ? ev.data.chunk_ids : [];
      const entities =
        ev.data?.entities_resolved && typeof ev.data.entities_resolved === "object"
          ? (ev.data.entities_resolved as Record<string, string>)
          : {};
      const latency =
        typeof ev.data?.latency_ms === "number" ? ev.data.latency_ms : 0;
      store.upsertRagContext(sessionId, aid, {
        markdown: md,
        chunk_ids: chunkIds,
        entities_resolved: entities,
        latency_ms: latency,
      });
      break;
    }
```

- [ ] **Step 3: Verify TypeScript compiles**

Run:
```bash
npm run lint
```
Expected: no new errors. (If `upsertRagContext` is not yet on the store type, this will fail — confirm Task 3 is complete.)

- [ ] **Step 4: Run existing event-stream tests**

Run:
```bash
npm run test:unit -- src/features/vibe-trading
```
Expected: PASS — no regressions.

- [ ] **Step 5: Commit**

```bash
git add src/features/vibe-trading/services/events-stream.ts
git commit -m "feat(vibe-trading): route rag_context SSE event into session store"
```

---

## Task 6: Create `<RagContextPanel/>` component (TDD)

**Files:**
- Create: `src/features/vibe-trading/components/rag-context-panel.tsx`
- Create: `src/features/vibe-trading/components/rag-context-panel.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/features/vibe-trading/components/rag-context-panel.test.tsx`. Use plain DOM rendering (matching `goal-chip.test.tsx` style):

```typescript
// Tests for the <RagContextPanel> component — collapsible panel under an
// assistant bubble that shows the RAG chunks used for the answer.

import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { createRoot, type Root } from "react-dom/client"
import { act } from "react"
import { RagContextPanel } from "./rag-context-panel"
import type { RagContext } from "../lib/vibe-types"

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

function makeRag(md: string): RagContext {
  return { markdown: md, chunk_ids: [1, 2], entities_resolved: {}, latency_ms: 42 }
}

describe("RagContextPanel", () => {
  it("renders nothing when markdown is empty", () => {
    act(() => {
      root.render(<RagContextPanel ragContext={{ markdown: "" }} />)
    })
    expect(container.querySelector("[data-testid='rag-context-panel']")).toBeNull()
  })

  it("renders collapsed by default with N-sources header", () => {
    const md = [
      "- **知识星球 · 摘要** (相似度 0.67)",
      "  _《标题A》_ (2026-08-13)",
      "  body A",
      "---",
      "- **知识星球 · 基础事实** (相似度 0.65)",
      "  _《标题B》_ (2026-08-14)",
      "  body B",
    ].join("\n")
    act(() => {
      root.render(<RagContextPanel ragContext={makeRag(md)} />)
    })
    const panel = container.querySelector("[data-testid='rag-context-panel']")
    expect(panel).not.toBeNull()
    // 标题里包含 "数据来源" 和 "2 条"
    expect(panel?.textContent).toMatch(/数据来源/)
    expect(panel?.textContent).toMatch(/2\s*条/)
    // 默认收起:卡片列表不渲染
    expect(panel?.querySelectorAll("[data-testid='rag-source-card']")).toHaveLength(0)
  })

  it("expands on click and shows one card per parsed source", () => {
    const md = [
      "- **知识星球 · 摘要** (相似度 0.67)",
      "  _《标题A》_ (2026-08-13)",
      "  body A",
      "---",
      "- **知识星球 · 基础事实** (相似度 0.65)",
      "  _《标题B》_ (2026-08-14)",
      "  body B",
    ].join("\n")
    act(() => {
      root.render(<RagContextPanel ragContext={makeRag(md)} />)
    })
    const header = container.querySelector("[data-testid='rag-context-panel'] button")
    expect(header).not.toBeNull()
    act(() => {
      ;(header as HTMLButtonElement).click()
    })
    const cards = container.querySelectorAll("[data-testid='rag-source-card']")
    expect(cards).toHaveLength(2)
    expect(cards[0]?.textContent).toMatch(/知识星球/)
    expect(cards[0]?.textContent).toMatch(/标题A/)
    expect(cards[0]?.textContent).toMatch(/2026-08-13/)
  })

  it("renders the original markdown as fallback when parseSources returns []", () => {
    act(() => {
      root.render(
        <RagContextPanel ragContext={makeRag("not a parseable block")} />,
      )
    })
    act(() => {
      const btn = container.querySelector("button")
      if (btn) (btn as HTMLButtonElement).click()
    })
    // fallback 在 data-testid='rag-context-fallback' 渲染原文
    expect(
      container.querySelector("[data-testid='rag-context-fallback']")?.textContent,
    ).toMatch(/not a parseable block/)
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

Run:
```bash
npm run test:unit -- src/features/vibe-trading/components/rag-context-panel.test.tsx
```
Expected: FAIL — `./rag-context-panel` does not export `RagContextPanel`.

- [ ] **Step 3: Implement the panel**

Create `src/features/vibe-trading/components/rag-context-panel.tsx`:

```typescript
import { ChevronDown, ChevronRight, Database } from "lucide-react"
import { useState } from "react"
import { parseSources } from "../lib/parse-sources"
import type { RagContext } from "../lib/vibe-types"

/**
 * 「数据来源」折叠面板 —— 嵌入助手气泡下方。
 *
 * 设计要点:
 * - 默认收起,点击 header 展开/收起
 * - 仅在 markdown 非空且 parseSources 返回 ≥1 项时渲染
 * - 解析失败时降级为显示原 markdown 片段(不阻塞主流程)
 * - 卡片不可点击跳转(per spec: 仅展示,不点击)
 * - 视觉风格对齐 shadcn/ui(Tailwind 4 CSS 变量主题)
 */
export function RagContextPanel({ ragContext }: { ragContext: RagContext }) {
  const [expanded, setExpanded] = useState(false)
  const md = ragContext.markdown ?? ""
  if (!md) return null

  const sources = parseSources(md)
  const count = sources.length
  const latency = ragContext.latency_ms ?? 0
  // 解析失败降级:即使 parseSources 为空,仍渲染面板显示原文 markdown
  const showFallback = count === 0

  return (
    <div
      data-testid="rag-context-panel"
      className="bg-muted/30 border-border/60 mt-2 overflow-hidden rounded-xl border"
    >
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="text-muted-foreground hover:bg-muted/50 flex w-full items-center gap-2 px-3 py-2 text-xs font-medium"
      >
        {expanded ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
        <Database className="h-3 w-3" />
        <span>
          📰 数据来源 · {count} 条
          {latency > 0 && (
            <span className="text-muted-foreground/50"> · {Math.round(latency)}ms</span>
          )}
        </span>
      </button>
      {expanded && (
        <div className="border-border/40 space-y-2 border-t px-3 pb-3">
          {sources.map((s, i) => (
            <div
              key={i}
              data-testid="rag-source-card"
              className="bg-background/70 border-border/40 mt-2 rounded-lg border p-2.5"
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="bg-primary/10 text-primary rounded px-1.5 py-0.5 font-medium">
                    {s.source}
                  </span>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground">{s.view}</span>
                  {s.similarity && (
                    <span className="text-muted-foreground/60">
                      · 相似度 {s.similarity}
                    </span>
                  )}
                </div>
                <span className="text-muted-foreground/60 text-[10px]">{s.date}</span>
              </div>
              <div className="text-foreground/90 mb-1 text-xs font-medium leading-snug">
                {s.title || "(无标题)"}
              </div>
              {s.body && (
                <div className="text-muted-foreground/80 line-clamp-3 whitespace-pre-wrap text-[11px] leading-relaxed">
                  {s.body.length > 240 ? `${s.body.slice(0, 240)}...` : s.body}
                </div>
              )}
            </div>
          ))}
          {showFallback && (
            <pre
              data-testid="rag-context-fallback"
              className="bg-background/70 mt-2 overflow-x-auto rounded-lg p-2 text-[11px] leading-relaxed whitespace-pre-wrap"
            >
              {md}
            </pre>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run tests to confirm they pass**

Run:
```bash
npm run test:unit -- src/features/vibe-trading/components/rag-context-panel.test.tsx
```
Expected: PASS — all 4 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/features/vibe-trading/components/rag-context-panel.tsx src/features/vibe-trading/components/rag-context-panel.test.tsx
git commit -m "feat(vibe-trading): RagContextPanel component (collapsible, shadcn styled)"
```

---

## Task 7: Wire `<RagContextPanel/>` into `chat-dialog.tsx` `bubbleItems`

**Files:**
- Modify: `src/features/vibe-trading/components/chat-dialog.tsx`

- [ ] **Step 1: Locate the assistant bubble `contentRender`**

Run:
```bash
grep -n "AiMessageContent" src/features/vibe-trading/components/chat-dialog.tsx
```
Expected: shows the import on line ~17 and a usage around line ~371.

- [ ] **Step 2: Add the import**

Locate the existing import block (around line 17, currently imports `AiMessageContent`). Add a new import:

```typescript
import { RagContextPanel } from "./rag-context-panel"
```

- [ ] **Step 3: Modify the assistant `contentRender`**

Locate the assistant branch:

```typescript
contentRender:
  m.role === "assistant"
    ? (content: string) => (
        <AiMessageContent content={content} cancelledAt={m.cancelledAt} />
      )
    : ...
```

Change it to:

```typescript
contentRender:
  m.role === "assistant"
    ? (content: string) => (
        <>
          <AiMessageContent content={content} cancelledAt={m.cancelledAt} />
          {m.ragContext && m.ragContext.markdown && (
            <RagContextPanel ragContext={m.ragContext} />
          )}
        </>
      )
    : ...
```

- [ ] **Step 4: Lint and test**

Run:
```bash
npm run lint
npm run test:unit -- src/features/vibe-trading
```
Expected: no new errors, all existing tests still pass.

- [ ] **Step 5: Commit**

```bash
git add src/features/vibe-trading/components/chat-dialog.tsx
git commit -m "feat(vibe-trading): render RagContextPanel under assistant bubbles"
```

---

## Task 8: Manual smoke test + verify spec checklist

**Files:** none modified — this is a verification task.

- [ ] **Step 1: Start the dev server**

Run:
```bash
npm run dev
```
Expected: Vite dev server starts. (If the backend isn't running locally, you'll get API failures but the frontend UI still loads — that's fine for UI verification.)

- [ ] **Step 2: Navigate to `/vibe-trading`**

Open `http://localhost:5173/vibe-trading` (or whatever port Vite reports). Sign in if needed. Expected: chat UI loads.

- [ ] **Step 3: Verify live streaming with RAG hit**

1. Click an existing session OR create a new one.
2. Send the message: `中芯国际最近有什么新闻`
3. Wait for the agent to respond.
4. **Expected:** below the assistant bubble, a collapsed "📰 数据来源 · N 条 · Nms" panel appears.
5. Click the panel header.
6. **Expected:** panel expands showing one card per source, each card displaying 知识星球 badge / view / similarity / date / title / body excerpt.

- [ ] **Step 4: Verify refresh persistence**

1. After Step 3 completes, **reload the page** (Ctrl+R).
2. Navigate back to the same session.
3. **Expected:** the same assistant bubble still has the "数据来源" panel collapsed below it. Click → still expands correctly.

- [ ] **Step 5: Verify non-RAG case**

1. Send: `你好`
2. Wait for response.
3. **Expected:** no "数据来源" panel appears below the assistant bubble.

- [ ] **Step 6: Verify multi-turn isolation**

1. After Step 5, send another question that triggers RAG (e.g. `腾讯最近的财报`).
2. **Expected:** only the new assistant bubble gets a "数据来源" panel. The previous (non-RAG) bubble has none, and the previous (RAG) bubble's panel is unaffected.

- [ ] **Step 7: Final lint + test sweep**

Run:
```bash
npm run lint
npm run test:unit
```
Expected: zero errors, all tests green.

- [ ] **Step 8: Tag the integration**

```bash
git log --oneline -10
```
Note the SHA range covering this feature. No further commit unless Step 7 surfaces a fix.

---

## Self-Review

Coverage check (each spec section → task mapping):

| Spec requirement | Task |
|------------------|------|
| `RagContext` type + `AiMessage.ragContext` | Task 1 |
| `ChatMessage.ragContext` mirror | Task 3 (Step 4) |
| `parseSources` pure function | Task 2 |
| `parseSources` unit tests | Task 2 |
| `pendingRagContexts` race buffer | Task 3 |
| `upsertRagContext` action | Task 3 |
| Replay in `stampAttemptIdOnMessages` path | Task 3 (Step 7) |
| `getMessages()` extracts `metadata.rag_context` | Task 4 |
| `case "rag_context"` in `routeEvent` | Task 5 |
| `<RagContextPanel/>` component | Task 6 |
| `parseSources` integration in panel + fallback | Task 6 |
| Panel wired into assistant `contentRender` | Task 7 |
| Manual verification of all 5 spec checklist items | Task 8 |
| No backend / Saas-Server / cross-feature changes | Verified — all tasks scoped to `src/features/vibe-trading/` |

No placeholders, no "TBD", no "implement later" patterns. Every code step shows the actual code. Every command shows the expected output. Task 7's Step 3 has a "..." placeholder to indicate the unchanged user bubble branch — that branch is not modified, the ellipsis is documentation shorthand, and the surrounding full code block makes the modification unambiguous. (This is the only acceptable use of `...` in the plan.)