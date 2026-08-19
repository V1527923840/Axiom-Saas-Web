// src/services/vibe-trading.ts
import { del, get, patch, post } from "@/lib/api"

const BASE = "/v1/ai-agent"

export type AiSessionStatus = "active" | "cancelled" | "error"

export interface AiSession {
  id: string
  agentType: string
  remoteSessionId: string | null
  title: string | null
  status: AiSessionStatus
  lastActiveAt: string
  expiresAt: string
  createdAt: string
}

export interface AiMessage {
  id: string
  role: "user" | "assistant" | "system" | "tool"
  content: string
  createdAt: string
  meta?: Record<string, unknown>
}

export interface SessionListResult {
  data: AiSession[]
  total: number
  page: number
  pageSize: number
}

export async function listAgents(): Promise<string[]> {
  const response = await get<string[]>(`${BASE}/agents`)
  return Array.isArray(response.data) ? response.data : []
}

export async function listSessions(
  agentType: string,
  page = 1,
  pageSize = 20,
): Promise<SessionListResult> {
  const response = await get<AiSession[]>(`${BASE}/sessions`, {
    params: { agentType, page, pageSize },
  })
  return {
    data: Array.isArray(response.data) ? response.data : [],
    total: response.meta?.total ?? 0,
    page: response.meta?.page ?? page,
    pageSize: response.meta?.pageSize ?? pageSize,
  }
}

export async function createSession(
  agentType: string,
  title?: string,
): Promise<AiSession> {
  const response = await post<AiSession>(`${BASE}/sessions`, { agentType, title })
  return response.data
}

export async function getSession(id: string): Promise<AiSession> {
  const response = await get<AiSession>(`${BASE}/sessions/${encodeURIComponent(id)}`)
  return response.data
}

export async function deleteSession(id: string): Promise<void> {
  await del(`${BASE}/sessions/${encodeURIComponent(id)}`)
}

export async function getMessages(id: string, cursor?: string): Promise<AiMessage[]> {
  const response = await get<AiMessage[]>(
    `${BASE}/sessions/${encodeURIComponent(id)}/messages`,
    { params: cursor ? { cursor } : undefined },
  )
  return Array.isArray(response.data) ? response.data : []
}

export async function cancelSession(id: string): Promise<void> {
  await post(`${BASE}/sessions/${encodeURIComponent(id)}/cancel`, {})
}

/**
 * 同步提交一条消息。流式输出走独立的 GET /events SSE（见 events-stream.ts）。
 *
 * `skills` 是 Skill Plaza 的 per-message 附加项 —— 用户在 ChatDialog 里通过
 * SkillAttachMenu 临时挑出本次想用的 skill 列表,随本条 message 一起下发;
 * 走 SaaS 的 `GET /internal/users/{uid}/skills` 在 vibe 端按 user_id 注入系统
 * prompt 的 `{skill_descriptions}`。空数组时省略 `skills` key,保持对 bundled-only
 * session 的向后兼容(老调用方不需要改)。
 */
export async function submitMessage(
  sessionId: string,
  content: string,
  skills?: { id: string }[],
): Promise<{ messageId: string; attemptId: string }> {
  const body: { content: string; skills?: { id: string }[] } = { content }
  if (skills && skills.length > 0) {
    body.skills = skills
  }
  const response = await post<{ messageId: string; attemptId: string }>(
    `${BASE}/sessions/${encodeURIComponent(sessionId)}/messages`,
    body,
  )
  return response.data
}

/**
 * 更新会话元数据（当前仅 title）。
 */
export async function patchSession(
  id: string,
  patchBody: { title?: string },
): Promise<AiSession> {
  const response = await patch<AiSession>(
    `${BASE}/sessions/${encodeURIComponent(id)}`,
    patchBody,
  )
  return response.data
}
