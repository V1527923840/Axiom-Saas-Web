// src/services/vibe-trading.ts
import { API_BASE_URL, ApiRequestError, UnauthorizedError, del, get, post } from "@/lib/api"

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

// The server forwards upstream chunk payloads verbatim (it only normalizes the
// event name), so every field below `type` is best-effort and must be
// null-checked by callers. `error` is the one shape the server itself emits,
// with codes SESSION_CANCELLED / UPSTREAM_ERROR / STREAM_ERROR.
export type SseChunk =
  | { type: "message"; data: { delta?: string; [k: string]: unknown } }
  | { type: "tool"; data: { name?: string; [k: string]: unknown } }
  | { type: "done"; data: Record<string, unknown> }
  | { type: "error"; data: { code?: string; message?: string; [k: string]: unknown } }

const SSE_CHUNK_TYPES = ["message", "tool", "done", "error"] as const

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

export interface SendMessageStreamOptions {
  /** Explicit auth token. Defaults to localStorage `auth_token`, as in `@/lib/api`. */
  token?: string
  /** Abort the underlying fetch to stop the stream early. */
  signal?: AbortSignal
}

/**
 * POST a message and yield parsed SSE chunks as the agent responds.
 *
 * This bypasses `@/lib/api` because that helper buffers the whole body via
 * `response.json()`. Auth-token injection and 401 handling are mirrored here so
 * an expired token behaves the same as on any other call.
 *
 * Pass `options.signal` to stop early; breaking out of the `for await` also
 * cancels the reader and closes the connection.
 */
export async function* sendMessageStream(
  sessionId: string,
  content: string,
  options: SendMessageStreamOptions = {},
): AsyncGenerator<SseChunk> {
  const url = `${API_BASE_URL}${BASE}/sessions/${encodeURIComponent(sessionId)}/messages`
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "text/event-stream",
  }
  const authToken =
    options.token ??
    (typeof window !== "undefined" ? localStorage.getItem("auth_token") : null)
  if (authToken) headers.Authorization = `Bearer ${authToken}`

  let response: Response
  try {
    response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ content }),
      signal: options.signal,
    })
  } catch {
    throw new ApiRequestError("Network error", 0, "NETWORK_ERROR")
  }

  if (response.status === 401) {
    localStorage.removeItem("auth_token")
    localStorage.removeItem("auth_refresh_token")
    window.location.href = "/auth/sign-in"
    throw new UnauthorizedError()
  }

  if (!response.ok || !response.body) {
    throw new ApiRequestError(
      `Stream request failed with status ${response.status}`,
      response.status,
      "STREAM_REQUEST_FAILED",
    )
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""

  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      // SSE frames are separated by a blank line; normalize CRLF first so the
      // split works regardless of how the server terminates lines.
      buffer = (buffer + decoder.decode(value, { stream: true })).replace(/\r\n/g, "\n")
      const frames = buffer.split("\n\n")
      buffer = frames.pop() ?? ""
      for (const frame of frames) {
        const chunk = parseSseEvent(frame)
        if (chunk) yield chunk
      }
    }
    // A final frame may arrive without its trailing blank line.
    const tail = parseSseEvent(buffer + decoder.decode())
    if (tail) yield tail
  } finally {
    await reader.cancel().catch(() => undefined)
  }
}

function parseSseEvent(raw: string): SseChunk | null {
  let event = "message"
  const dataLines: string[] = []

  for (const line of raw.split("\n")) {
    if (line.startsWith(":")) continue // comment / keep-alive
    if (line.startsWith("event:")) event = line.slice(6).trim()
    else if (line.startsWith("data:")) dataLines.push(line.slice(5).replace(/^ /, ""))
  }

  if (dataLines.length === 0) return null
  // Per the SSE spec multiple `data:` lines are joined with newlines.
  const data = dataLines.join("\n")
  if (!data) return null

  if (!isSseChunkType(event)) return null

  try {
    const parsed: unknown = JSON.parse(data)
    // The server writes `event: <type>` and `data: <JSON of the payload>`, so
    // the payload is the chunk data as-is — it is not re-wrapped in `.data`.
    return {
      type: event,
      data: parsed && typeof parsed === "object" ? parsed : { value: parsed },
    } as SseChunk
  } catch {
    return { type: event, data: { raw: data } } as SseChunk
  }
}

function isSseChunkType(value: string): value is SseChunk["type"] {
  return (SSE_CHUNK_TYPES as readonly string[]).includes(value)
}
