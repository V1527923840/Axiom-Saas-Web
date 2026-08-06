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
 */
export async function submitMessage(
  sessionId: string,
  content: string,
): Promise<{ messageId: string; attemptId: string }> {
  const response = await post<{ messageId: string; attemptId: string }>(
    `${BASE}/sessions/${encodeURIComponent(sessionId)}/messages`,
    { content },
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
