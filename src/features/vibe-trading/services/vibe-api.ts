// src/features/vibe-trading/services/vibe-api.ts
//
// REST 客户端 —— 覆盖三组功能:
//   - PDF 上传: POST /v1/ai-agent/upload (multipart)
//   - 研究目标: GET/POST/PATCH /v1/ai-agent/sessions/:id/goal[/*]
//   - 智能体蜂群: GET /swarm/presets (公开) + POST/GET /swarm/runs[/:id[/cancel|retry]]
//
// 选 raw fetch 而非 `@/lib/api` 包装,理由:
//   1. 上传必须是 multipart,而 `lib/api.ts` 强制 `Content-Type: application/json` 并 JSON.stringify(body)。
//   2. 部分 controller 原样透传 vibe 响应(`createGoal`/`updateGoal`/`addGoalEvidence`/...),
//      而 `lib/api.ts` 的自动解包只对 `{ success, data }` 生效,但 `lib/api.ts` 还固定包装为
//      `ApiResponse<T>`,调用方拿到的 `response.data` 还要再次 unwrap 一层,反而更乱。
//   3. `lib/api.ts` 在 401 时会强制 window.location.href 跳转,与 `events-stream.ts`
//      同一模块的 SSE 长连接策略保持一致的副作用控制。
//
// 与 `events-stream.ts` 风格一致:同一份 `authHeaders` 工具函数模式。

import type { GoalSnapshot, UploadResult } from "../lib/vibe-types"

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ?? "/api"
).replace(/\/$/, "")

function authHeaders(
  extra: Record<string, string> = {},
): Record<string, string> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("auth_token") : null
  return token ? { Authorization: `Bearer ${token}`, ...extra } : extra
}

async function request<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { ...authHeaders(), ...(init?.headers ?? {}) },
  })
  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(`API ${res.status}: ${body || res.statusText}`)
  }
  return res.json() as Promise<T>
}

export const vibeApi = {
  uploadFile(file: File): Promise<UploadResult> {
    const form = new FormData()
    form.append("file", file)
    // 服务器全局 TransformResponseInterceptor 把所有响应包成 { data: ... }
    // (见 Axiom-Saas-Server src/utils/interceptors/transform-response.interceptor.ts),
    // 必须 unwrap .data,否则 result.filename / result.file_path 全是 undefined,
    // 上传到下一步 use-chat-stream.send 注入的 prefix 会变成
    // "[Uploaded file: undefined, path: undefined]"(回归:前端没解包时)。
    return request<{ data: UploadResult }>("/v1/ai-agent/upload", {
      method: "POST",
      body: form,
    }).then((r) => r.data)
  },

  getGoal(sid: string): Promise<GoalSnapshot | null> {
    return request<{ data: GoalSnapshot | null }>(
      `/v1/ai-agent/sessions/${encodeURIComponent(sid)}/goal`,
      { method: "GET" },
    ).then((r) => r.data)
  },

  createGoal(
    sid: string,
    body: {
      objective: string
      criteria?: string[]
      ui_summary?: string
      protocol?: string
      risk_tier?: string
      token_budget?: number
      turn_budget?: number
      time_budget_seconds?: number
    },
  ): Promise<GoalSnapshot> {
    // 服务器 controller 是 vibe 的 pass-through,NestJS 的 TransformResponseInterceptor
    // 把响应包成 { data: <vibe 返回> }。这里把 .data 解包,否则调用方拿到的
    // 是 { data: GoalSnapshot },UI 渲染时访问 snapshot.goal.* 会因 undefined 抛错。
    return request<{ data: GoalSnapshot }>(
      `/v1/ai-agent/sessions/${encodeURIComponent(sid)}/goal`,
      {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
      },
    ).then((r) => r.data)
  },

  updateGoal(
    sid: string,
    body: {
      goal_id: string
      expected_goal_id: string
      objective?: string
      ui_summary?: string
    },
  ): Promise<{ goal: unknown; snapshot: GoalSnapshot }> {
    return request<{ data: { goal: unknown; snapshot: GoalSnapshot } }>(
      `/v1/ai-agent/sessions/${encodeURIComponent(sid)}/goal`,
      {
        method: "PATCH",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
      },
    ).then((r) => r.data)
  },

  updateGoalStatus(
    sid: string,
    body: {
      goal_id: string
      expected_goal_id: string
      status: string
      audit?: unknown[]
      recap?: string
    },
  ): Promise<{ goal: unknown; snapshot: GoalSnapshot }> {
    return request<{ data: { goal: unknown; snapshot: GoalSnapshot } }>(
      `/v1/ai-agent/sessions/${encodeURIComponent(sid)}/goal/status`,
      {
        method: "PATCH",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
      },
    ).then((r) => r.data)
  },

  listSwarmRuns(limit = 20): Promise<unknown[]> {
    return request(`/v1/ai-agent/swarm/runs?limit=${limit}`)
  },

  getSwarmRun(id: string): Promise<unknown> {
    return request(
      `/v1/ai-agent/swarm/runs/${encodeURIComponent(id)}`,
      { method: "GET" },
    )
  },
}