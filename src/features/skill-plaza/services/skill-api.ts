/**
 * Skill Plaza — REST client (Phase 1/2 + reads + bindings).
 *
 * 选 raw fetch 而非 `@/lib/api`,理由与 vibe-api 一致:
 *   1. PUT /skills/{id}/content 与 GET /skills 都返回 `{ data, meta? }`,
 *      `lib/api.ts` 的自动 unwrap 在嵌套响应上不够灵活。
 *   2. 这里不需要 401 → window.location.href 强制跳转,
 *      Skill Plaza 表单显示错误由调用方决定。
 *
 * 与 vibe-api.ts 风格一致:同一份 `authHeaders` + `request` 工具函数。
 */

import type {
  ConfirmSkillContentInput,
  ConfirmSkillContentOutput,
  CreateUploadUrlInput,
  CreateUploadUrlOutput,
  MountOp,
  MountSource,
  SessionSkillMountItem,
  Skill,
  SkillFile,
} from "@/types/skill"

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
    // 后端包了 { statusCode, message, code, timestamp, path }
    // 解析后抛 ApiError,UI 上可以拿 message 显示
    let parsed: { message?: string } = {}
    try {
      parsed = JSON.parse(body)
    } catch {
      /* ignore */
    }
    const err = new Error(parsed.message ?? `API ${res.status}: ${body || res.statusText}`)
    ;(err as Error & { statusCode: number }).statusCode = res.status
    throw err
  }
  return res.json() as Promise<T>
}

// 解包后端的 `{ data, meta? }` 响应
function unwrap<T>(r: { data: T; meta?: { total?: number } }): T {
  return r.data
}

// ==============================
// Phase 1 — 申请 presigned URL
// ==============================
export function createUploadUrl(
  body: CreateUploadUrlInput,
): Promise<CreateUploadUrlOutput> {
  return request<{ data: CreateUploadUrlOutput }>("/v1/skills/upload-url", {
    method: "POST",
    body: JSON.stringify(body),
  }).then((r) => r.data)
}

// 直接 PUT zip bytes 到 Qiniu(不经 saas-server)。
// 后端给的 uploadUrl 是预签名 PUT URL,客户端用 fetch PUT 即可。
export async function putZipToQiniu(
  uploadUrl: string,
  file: Blob,
): Promise<void> {
  const res = await fetch(uploadUrl, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": "application/zip" },
  })
  if (!res.ok) {
    throw new Error(`OSS PUT failed: ${res.status} ${await res.text()}`)
  }
}

// =================================
// Phase 2 — 确认上传 (覆盖 content)
// =================================
export function confirmSkillContent(
  skillId: string,
  body: ConfirmSkillContentInput,
): Promise<ConfirmSkillContentOutput> {
  return request<{ data: ConfirmSkillContentOutput }>(
    `/v1/skills/${encodeURIComponent(skillId)}/content`,
    {
      method: "PUT",
      body: JSON.stringify(body),
    },
  ).then((r) => r.data)
}

// ===== 读取 =====
export interface ListSkillsParams {
  page?: number
  pageSize?: number
  status?: "draft" | "published" | "archived"
  category?: string
  sortBy?: "createdAt" | "updatedAt" | "name"
  sortOrder?: "ASC" | "DESC"
}

export interface PaginatedSkills {
  items: Skill[]
  total: number
  page: number
  pageSize: number
}

export async function listSkills(
  params: ListSkillsParams = {},
): Promise<PaginatedSkills> {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) search.append(k, String(v))
  })
  const q = search.toString()
  const r = await request<{
    data: Skill[]
    meta?: { total?: number; page?: number; pageSize?: number }
  }>(`/v1/skills${q ? `?${q}` : ""}`)
  return {
    items: r.data,
    total: r.meta?.total ?? r.data.length,
    page: r.meta?.page ?? 1,
    pageSize: r.meta?.pageSize ?? 20,
  }
}

export function getSkill(id: string): Promise<Skill> {
  return request<{ data: Skill }>(`/v1/skills/${encodeURIComponent(id)}`).then(
    (r) => r.data,
  )
}

export function listSkillFiles(
  id: string,
  contentHash?: string,
): Promise<SkillFile[]> {
  const q = contentHash ? `?contentHash=${encodeURIComponent(contentHash)}` : ""
  return request<{ data: SkillFile[] }>(
    `/v1/skills/${encodeURIComponent(id)}/files${q}`,
  ).then((r) => r.data)
}

// ===== 用户绑定 =====
export function listMyEnabledSkills(): Promise<Skill[]> {
  return request<{ data: Skill[] }>("/v1/users/me/skills").then((r) => r.data)
}

export function enableSkillForUser(
  skillId: string,
): Promise<{ skillId: string; enabled: true }> {
  return request<{ data: { skillId: string; enabled: true } }>(
    `/v1/skills/${encodeURIComponent(skillId)}/enable`,
    { method: "POST" },
  ).then((r) => r.data)
}

export function disableSkillForUser(
  skillId: string,
): Promise<{ skillId: string; enabled: false }> {
  return request<{ data: { skillId: string; enabled: false } }>(
    `/v1/skills/${encodeURIComponent(skillId)}/disable`,
    { method: "POST" },
  ).then((r) => r.data)
}

// ===== 会话挂载 =====
export function listSessionMounts(
  sessionId: string,
): Promise<SessionSkillMountItem[]> {
  return request<{ data: SessionSkillMountItem[] }>(
    `/v1/sessions/${encodeURIComponent(sessionId)}/skills`,
  ).then((r) => r.data)
}

export function setSessionMount(
  sessionId: string,
  skillId: string,
  op: MountOp,
  source: MountSource = "manual",
): Promise<{ sessionId: string; skillId: string; op: MountOp }> {
  return request<{ data: { sessionId: string; skillId: string; op: MountOp } }>(
    `/v1/sessions/${encodeURIComponent(sessionId)}/skills/${encodeURIComponent(skillId)}`,
    {
      method: "PUT",
      body: JSON.stringify({ op, source }),
    },
  ).then((r) => r.data)
}

// ===== 一个 useUserSkills 用的接口(支持乐观更新) =====
export interface SkillBindingsState {
  // skillId → 是否已启用
  enabled: Record<string, boolean>
}

export { unwrap }