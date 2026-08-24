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
 * 由 VibeTrading 后端 `agent/src/agent/loop.py:626-639` 推 SSE `rag_context` 事件
 * 携带，并由 `agent/src/session/service.py:189-205` 持久化到
 * `Message.metadata.rag_context`。本类型用于前端把这段 metadata 提到顶层
 * `AiMessage.ragContext`，便于组件层直接消费。
 *
 * `markdown` 是已格式化的多卡片 markdown（卡片之间用 `\n---\n` 分隔），
 * 后续 task 会用 `parseSources(...)` 解析为结构化卡片。
 */
export interface RagContext {
  /** 已格式化的 markdown 文本，多卡片之间用 `\n---\n` 分隔 */
  markdown: string;
  /** 命中的 PG 向量库 chunk id */
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