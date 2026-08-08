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