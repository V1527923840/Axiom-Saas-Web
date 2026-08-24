# 嵌入智能体「数据来源」面板 — 设计文档

| 字段 | 值 |
|------|---|
| 项目 | Axiom-Saas-Web / `features/vibe-trading/` |
| 关联项目 | AxiomVibeTrading（仅消费其 SSE 事件与持久化数据，无改动） |
| 日期 | 2026-08-24 |
| 状态 | 设计已批准，待 writing-plans |

## 背景

AxiomVibeTrading 智能体在回答与新闻、研报相关的问题时，会通过 PG 向量库做 RAG 检索，把命中的"知识星球"等 chunk 作为 LLM 的事实依据。后端 `agent/src/agent/loop.py:626-639` 已经把这些信息作为 `rag_context` SSE 事件推送，并通过 `agent/src/session/service.py:189-205` 持久化到 `Message.metadata.rag_context`。

Axiom-Saas-Web 的 `features/vibe-trading/` 已经接入了同一组 SSE 事件流（`text_delta` / `tool_event` / `goal.*` / `swarm.*`），但 `routeEvent` 的 switch 没有 `rag_context` 分支，事件被静默丢弃。因此 Web 端用户看到的 AI 回复缺少"这条答案引用了哪些来源"的视觉证据。

本设计的任务：**让 Saas-Web 的助手气泡下方出现一张与 standalone Vibe-Trading 一致的「数据来源」可折叠面板**。后端零改动。

## 目标与边界

- ✅ 显示 5 字段卡片（来源标签 / 相似度 / 日期 / 标题 / 摘要）
- ✅ 默认折叠、点击 chevron 切换
- ✅ 仅在 RAG 命中（`chunk_ids` 非空）时出现
- ✅ 仅展示、卡片不可点击跳转
- ✅ 流式期间实时出现；刷新/重新进入会话后仍可见
- ✅ 助手气泡下方（每个 assistant 消息级别）
- ❌ 不点击展开原文、不跳 PDF / 不打开外部链接
- ❌ 不为没有 RAG 命中的助手消息渲染空状态
- ❌ 后端无改动

## 架构与数据流

```
[用户问"中芯国际最近有什么新闻"]
   │
   ▼
[Saas-Web] use-chat-stream.send()
   │ POST /v1/ai-agent/sessions/:id/messages
   ▼
[VibeTrading FastAPI] session/service.py → AgentLoop.run()
   │
   │ ① pre-loop: prefetch_rag_context(user_message) → RagContext
   │ if not RagContext.skipped:
   │     emit SSE("rag_context", {markdown, chunk_ids, entities_resolved, latency_ms})
   ▼
[SSE /events] → events-stream.ts → routeEvent
   │
   │ case "rag_context":
   │   store.upsertRagContext(sessionId, attemptId, ragCtx)
   ▼
[bubbleItems] ChatMessage.ragContext 渲染 → <RagContextPanel/>
   │
   ▼
[attempt.completed] → session/service.py:205 把 rag_context 持久化到 Message.metadata
   │
   ▼
[下次打开会话] GET /v1/ai-agent/sessions/:id/messages
   → 客户端从 m.metadata.rag_context 提到顶层
   → 同样渲染 <RagContextPanel/>
```

### 关键事实

- 后端无改动（`loop.py:626-639` 推送事件；`session/service.py:189-205` 持久化）
- 持久化在 VibeTrading 自己的 session store（SQLite 之类），不在 Saas-Server 的 PostgreSQL
- 前端只做"接 SSE + 透传 metadata + 渲染"

## 类型与 API 客户端

### `lib/vibe-types.ts`

```typescript
export interface RagContext {
  /** 已格式化的 markdown 文本，按 `\n---\n` 分隔的多张来源卡片 */
  markdown: string;
  /** 命中的 PG 向量库 chunk id */
  chunk_ids?: number[];
  /** 实体解析映射，例如 { "中芯国际": "688981.SH" } */
  entities_resolved?: Record<string, string>;
  /** RAG 检索耗时（毫秒） */
  latency_ms?: number;
}

export interface AiMessage {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  createdAt: string;
  meta?: Record<string, unknown>;
  /** RAG 数据来源面板；服务端持久化在 message.metadata.rag_context */
  ragContext?: RagContext | null;
}
```

### `stores/session-store.ts`

`ChatMessage` 同步加：

```typescript
import type { RagContext } from "../lib/vibe-types";

export type ChatMessage = {
  // ...现有字段...
  /** RAG 数据来源；流式期间由 SSE 注入；刷新后由 getMessages() 从 metadata.rag_context 提取 */
  ragContext?: RagContext | null;
};
```

### `services/vibe-api.ts` `getMessages()` 调整

服务端返回 `{ message_id, role, content, metadata: { rag_context: ... } }`，把 `metadata.rag_context` 提到顶层，便于消费：

```typescript
return res.data.map((m: any) => ({
  id: m.message_id ?? m.id,
  role: m.role,
  content: m.content,
  createdAt: m.created_at ?? m.createdAt,
  ragContext: m.metadata?.rag_context ?? null,
}));
```

## SSE 路由层

### `services/events-stream.ts` `routeEvent` 新增 case

```typescript
case "rag_context": {
  const aid = ev.data?.attempt_id as string | undefined;
  if (!aid) break;
  store.upsertRagContext(sessionId, aid, {
    markdown: String(ev.data?.markdown ?? ""),
    chunk_ids: Array.isArray(ev.data?.chunk_ids) ? ev.data.chunk_ids : [],
    entities_resolved: (ev.data?.entities_resolved ?? {}) as Record<string, string>,
    latency_ms: typeof ev.data?.latency_ms === "number" ? ev.data.latency_ms : 0,
  });
  break;
}
```

### race 处理：`rag_context` 早于 `text_delta`

后端 `loop.py` 在 pre-loop 阶段就 emit `rag_context`，早于首个 `text_delta`。前端发送消息到 `submitMessage()` 返回 `attemptId` 之间还有几帧间隔——`rag_context` 到达时 `ChatMessage.attemptId` 还没写。

参照现有 `pendingDeltas` 的缓冲模式：

### `stores/session-store.ts` 新增方法

```typescript
type SessionStore = {
  // ...现有字段...
  /**
   * 与 pendingDeltas 同等待遇：rag_context 事件到达时,如果对应 attemptId 的消息
   * 还没在 messages 里(占位消息还没拿到 attemptId),先按 attemptId 缓存;
   * stampAttemptIdOnMessages 回放时把 pendingRagContexts[aid] 写到目标消息上。
   */
  pendingRagContexts?: Record<string, RagContext>;

  /**
   * SSE rag_context 事件入口。
   * 1. 若 messages 里已有 stream-<aid> synthetic → 直接写 ragContext
   * 2. 否则存入 pendingRagContexts[aid]
   */
  upsertRagContext: (sessionId: string, attemptId: string, rag: RagContext) => void;
};
```

`stampAttemptIdOnMessages` 在合并占位/synthetic 时同步把 `pendingRagContexts[aid]` 回放到目标消息，确保 race-safe。

## UI 组件

### 新增 `lib/parse-sources.ts`（从 standalone 移植，纯函数便于单测）

```typescript
export type ParsedSource = {
  source: string;        // "知识星球"
  view: string;          // "摘要" / "基础事实" / "原文"
  title: string;         // "中芯国际Q2Q6业绩快评"
  date: string;          // "2026-08-13"
  similarity?: string;   // "0.67"
  body: string;          // 摘要正文（可能含换行）
};

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
export function parseSources(md: string): ParsedSource[];
```

### 新增 `components/rag-context-panel.tsx`

移植 standalone 的 `RagContextPanel.tsx`，把 className 改为 shadcn/ui 风格：

- 头部：`ChevronRight`（默认收起） + `Database` 图标 + "数据来源 · N 条 · Nms"
- 展开：调用 `parseSources(markdown)` 切卡片
- 每张卡片：
  - `知识星球` amber badge + `·` + view（摘要 / 基础事实 / 原文）+ 可选 `· 相似度 0.67`
  - 右对齐日期
  - 标题（无标题显示"(无标题)")
  - 摘要前 240 字符 + `...`，`whitespace-pre-wrap` 保留换行

行为细节：
- 仅当 `markdown` 非空且 `parseSources()` 返回 ≥1 个 source 才渲染
- 解析失败显示原始 markdown 片段（不阻塞主流程）
- 单击 header 切换 `expanded` 状态

### `components/chat-dialog.tsx` `bubbleItems` 调整

```typescript
contentRender:
  m.role === "assistant"
    ? (content: string) => (
        <>
          <AiMessageContent content={content} cancelledAt={m.cancelledAt} />
          {m.ragContext && <RagContextPanel ragContext={m.ragContext} />}
        </>
      )
    : m.role === "user"
      ? /* 现有逻辑不变 */
      : undefined,
```

只动助手气泡的 `contentRender`，不改动 user / swarm_status 分支。

## 测试

### 单元测试（vitest）

- `lib/parse-sources.test.ts`
  - 空字符串 → `[]`
  - 单个卡片 → 1 项，字段正确
  - 多个卡片（`\n---\n` 分隔）→ 多项，顺序保持
  - 相似度缺失 → `similarity === undefined`
  - 标题缺失 → `title === ""`，body 仍可解析
  - 非 `-` 起头的块 → 跳过
  - 解析失败的 fallback → 返回空数组（不抛错）
- `components/rag-context-panel.test.tsx`
  - `ragContext.markdown` 为空 → 渲染 `null`
  - 单卡片 → 渲染折叠面板 + 切换展开
  - 展开后显示卡片字段

### E2E（cypress，可选）

若开发时间允许，添加一条脚本：
- 登录 → 进入 `/vibe-trading` → 新建会话 → 发送"中芯国际最近有什么新闻"
- 等待助手回复完成
- 断言助手气泡下方出现"数据来源"折叠面板
- 点击展开 → 断言至少一张卡片渲染

### 手工验证清单（开发环境）

- [ ] 发送"中芯国际最近有什么新闻" → 助手回复下方出现「数据来源」折叠面板
- [ ] 展开面板 → 看到知识星球卡片列表（5 字段齐全）
- [ ] 刷新页面 → 重新进入该会话 → 历史助手气泡下方仍然有「数据来源」面板
- [ ] 发送不带实体的问题（如"你好"）→ 不出现面板
- [ ] 发送新问题触发新一轮 RAG → 上一轮的 ragContext 不污染新轮

## 风险与回滚

### 风险

| 风险 | 缓解 |
|------|------|
| `rag_context` 事件早于 `text_delta` / `submitMessage` 返回 | 走 `pendingRagContexts` 缓冲，`stampAttemptIdOnMessages` 回放 |
| `RagContext.skipped=True` 时不发事件 | 天然跳过——UI 不渲染空卡片 |
| 后端 markdown 格式漂移 | `parseSources` 失败降级显示原文片段，不阻塞主流程 |
| 助手消息没有 `attemptId`（历史 assistant 消息但 `linked_attempt_id` 缺失） | `getMessages()` 直接从 metadata.rag_context 提取，不依赖 attemptId |
| 新组件与 ant-design/x 的 Bubble 主题冲突 | 仅本组件用 Tailwind/shadcn 风格；Bubble 容器内已有 `XThemeProvider` 桥接 |

### 回滚路径

本次改动集中在 `features/vibe-trading/` 子模块（`lib/vibe-types.ts`、`lib/parse-sources.ts`、`stores/session-store.ts`、`services/vibe-api.ts`、`services/events-stream.ts`、`components/chat-dialog.tsx`、`components/rag-context-panel.tsx`）。`git revert` 对应 commit 即可完全回滚，不影响其他模块。

## 实施清单（用于后续 writing-plans）

1. 新增 `lib/parse-sources.ts` 与单元测试
2. `lib/vibe-types.ts` 增加 `RagContext` 类型与 `AiMessage.ragContext` 字段
3. `stores/session-store.ts` 增加 `pendingRagContexts`、`upsertRagContext`，扩展 `stampAttemptIdOnMessages` 回放
4. `services/vibe-api.ts` `getMessages()` 提取 metadata.rag_context
5. `services/events-stream.ts` `routeEvent` 新增 `case "rag_context"`
6. 新增 `components/rag-context-panel.tsx` 与单元测试
7. `components/chat-dialog.tsx` 助手气泡 contentRender 接入 `<RagContextPanel/>`
8. 手工验证清单逐条勾选