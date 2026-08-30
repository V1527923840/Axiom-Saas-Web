// Domain types for vibe-trading — ported from AxiomVibeTrading `frontend/src/lib/api.ts`
// (lines 540-700) and `frontend/src/types/agent.ts` (SwarmAgentStatus / SwarmRunStatus).
// Kept loose in places (`[k: string]: unknown`) to mirror the upstream wire format.

export type GoalStatus =
  | "active"
  | "paused"
  | "waiting_user"
  | "needs_refresh"
  | "insufficient_evidence"
  | "compliance_blocked"
  | "blocked"
  | "budget_limited"
  | "usage_limited"
  | "complete"
  | "cancelled"
  | "superseded";

export type GoalRiskTier =
  | "research_general"
  | "market_specific_short_term"
  | "personalized_advice_or_position_sizing"
  | "live_trading_or_execution";

export interface GoalRecord {
  goal_id: string;
  session_id: string;
  status: GoalStatus;
  objective: string;
  ui_summary: string;
  source: string;
  protocol: string;
  risk_tier: GoalRiskTier;
  token_budget?: number | null;
  tokens_used: number;
  turn_budget?: number | null;
  turns_used: number;
  time_budget_seconds?: number | null;
  time_used_seconds: number;
  budget_wrapup_sent: boolean;
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
  recap?: string | null;
}

export interface GoalCriterion {
  criterion_id: string;
  goal_id: string;
  text: string;
  required: boolean;
  status: string;
  freshness_requirement?: string | null;
  protocol_step?: string | null;
  created_at: string;
  updated_at: string;
}

export interface GoalEvidence {
  evidence_id: string;
  goal_id: string;
  text: string;
  criterion_id?: string | null;
  claim_id?: string | null;
  evidence_type: string;
  verification_status: string;
  confidence?: string | null;
  source_provider?: string | null;
  created_at: string;
}

export interface GoalSnapshot {
  goal: GoalRecord;
  claims: unknown[];
  criteria: GoalCriterion[];
  evidence: GoalEvidence[];
  evidence_count: number;
}

export type SwarmAgentDisplayStatus =
  | "waiting"
  | "running"
  | "done"
  | "failed"
  | "blocked"
  | "retry"
  | "cancelled";

export interface SwarmAgentStatus {
  agentId: string;
  taskId?: string;
  role?: string;
  status: SwarmAgentDisplayStatus;
  tool?: string;
  elapsed_s?: number;
  iterations?: number;
  startedAt?: number;
  lastText?: string;
  error?: string;
}

export type SwarmRunPhase =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled"
  | "unknown";

export interface SwarmRunStatus {
  runId: string;
  preset: string;
  status: SwarmRunPhase;
  currentLayer: number;
  totalLayers: number;
  startedAt: number;
  completedAt?: number;
  agents: SwarmAgentStatus[];
}

export interface SwarmPreset {
  name: string;
  title: string;
  description: string;
  agent_count: number;
  variables: { name: string; description: string; required: boolean }[];
}

export interface UploadResult {
  status: string;
  file_path: string;
  filename: string;
}

// ---- Session / message types (ported from src/services/vibe-trading.ts) ----

export type AiSessionStatus = "active" | "cancelled" | "error"

export interface AiSession {
  id: string;
  agentType: string;
  remoteSessionId: string | null;
  title: string | null;
  status: AiSessionStatus;
  lastActiveAt: string;
  expiresAt: string;
  createdAt: string;
}

/**
 * RAG 数据来源面板的载荷。
 *
 * 历史（pre-2026-08-30）由 VibeTrading 后端 `agent/src/agent/loop.py:626-639`
 * 推 SSE `rag_context` 事件携带，载荷是已格式化的 markdown 文本（多卡片
 * 用 `\n---\n` 分隔）；同时 `agent/src/session/service.py:189-205` 把它
 * 持久化到 `Message.metadata.rag_context`。前端把这部分提到顶层
 * `AiMessage.ragContext` 便于消费。
 *
 * 2026-08-30 起后端把 prefetch chunks 与 corpus_search_* 工具结果统一收口到
 * `corpus_sources` SSE 事件 + `metadata.corpus_sources`（Array of
 * CorpusSourceItem），不再单独发 `rag_context`。前端保留 `markdown` 字段
 * 作为旧数据回放兜底，新增 `sources` 字段走新数据通路；`parseSources(md)`
 * 把 markdown 解析成与 `sources[i]` 同构的卡片数据，两条路径渲染同一组件。
 */
export interface CorpusSourceItem {
  /** 触发此 source 的工具名：prefetch / corpus_search_zhishi / corpus_search_research */
  tool: string;
  /** 语料库表名：zsxq_posts / research_analysis */
  source: string;
  /** PG 向量库 chunk id；prefetch 路径为 0（chunks 由 ID 直接定位）。 */
  chunk_id?: number | null;
  /** 视图类型：summary / base_view / mid_view / core_view / original_text */
  view_type?: string | null;
  /** 发布日期，YYYY-MM-DD */
  publish_date?: string;
  /** 文档标题 */
  title?: string;
  /** 关联股票名 */
  stock_names?: string[];
  /** cosine similarity, 0~1 */
  similarity?: number;
  /** 文档正文片段 */
  content_text?: string;
}

export interface RagContext {
  /**
   * 已格式化的 markdown 文本，多卡片之间用 `\n---\n` 分隔。
   * 仅在 legacy `rag_context` SSE / `metadata.rag_context` 路径下被填充；
   * 新数据通路 (`corpus_sources`) 走 `sources` 字段，本字段为 undefined。
   */
  markdown?: string;
  /**
   * 结构化 source 列表（来自 `corpus_sources` SSE / `metadata.corpus_sources`）。
   * 新数据通路的权威字段。组件优先消费此字段；缺省时回退到 `markdown` 解析。
   */
  sources?: CorpusSourceItem[];
  /** 命中的 PG 向量库 chunk id（legacy 字段，sources 通路下由 sources[i].chunk_id 承载） */
  chunk_ids?: number[];
  /** 实体解析映射：key = 归一化实体名（如 "中芯国际"），value = 标的代码（目前为 exchange.ticker 格式，如 "688981.SH"） */
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

export interface SessionListResult {
  data: AiSession[];
  total: number;
  page: number;
  pageSize: number;
}