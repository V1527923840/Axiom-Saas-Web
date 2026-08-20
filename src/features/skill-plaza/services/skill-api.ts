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
  MySkill,
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
  // ★ 关键:如果有 body(非 GET/HEAD),自动加 Content-Type: application/json。
  // 浏览器的 fetch 默认对字符串 body 设为 `text/plain;charset=UTF-8`,
  // NestJS 的 body parser 只认 application/json,否则 body 会被跳过,
  // DTO 收到空对象 → 422 "filename must be a string" 之类的错误。
  const hasBody = init?.body != null && init.method !== "GET" && init.method !== "HEAD"
  const autoContentType: Record<string, string> = hasBody
    ? { "Content-Type": "application/json" }
    : {}
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...authHeaders(),
      ...autoContentType,
      ...(init?.headers ?? {}),
    },
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
//
// ★ Dev-only CORS 兜底:Qiniu axiom 桶在本地开发时还没配 CORS,浏览器 PUT
// 直连 s3-cn-south-1.qiniucs.com 会被预检 OPTIONS 拒绝("CORSResponse:
// CORS is not enabled for this bucket")。本地 vite.config.ts 里把
// `/qiniu-upload/*` 反代到 Qiniu 端点 + changeOrigin,同源转发规避 CORS。
// 生产环境由运维在 Qiniu 控制台加 CORS 规则,届时这层兜底自动让位给直传。
export async function putZipToQiniu(
  uploadUrl: string,
  file: Blob,
): Promise<void> {
  // 把 uploadUrl 的 host 部分(https://axiom.s3-cn-south-1.qiniucs.com)
  // 替换成同源代理路径 /qiniu-upload。query string 与 path 保留。
  const targetUrl = import.meta.env.DEV
    ? uploadUrl.replace(/^https:\/\/[^/]+/, "/qiniu-upload")
    : uploadUrl
  const res = await fetch(targetUrl, {
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
/**
 * GET /v1/users/me/skills — caller's personal skill collection
 * (any binding, enabled or disabled). Each item carries `enabled`
 * so the UI can render 已启用 / 已收藏 但未启用 differently.
 */
export function listMySkills(): Promise<MySkill[]> {
  return request<{ data: MySkill[] }>("/v1/users/me/skills").then((r) => r.data)
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

/**
 * POST /v1/skills/{id}/favorite — bookmark without enabling.
 * Idempotent; returns current enabled state after upsert.
 */
export function favoriteSkillForUser(
  skillId: string,
): Promise<{ skillId: string; favorited: true; enabled: boolean }> {
  return request<{
    data: { skillId: string; favorited: true; enabled: boolean }
  }>(`/v1/skills/${encodeURIComponent(skillId)}/favorite`, {
    method: "POST",
  }).then((r) => r.data)
}

/**
 * DELETE /v1/users/me/skills/{id} — drop the caller from the
 * "我的 Skill" collection. Idempotent; returns whether the binding
 * was enabled at the moment of removal so the UI can render the
 * correct toast/dialog.
 */
export function removeSkillFromMySkills(
  skillId: string,
): Promise<{ skillId: string; removed: true; wasEnabled: boolean }> {
  return request<{
    data: { skillId: string; removed: true; wasEnabled: boolean }
  }>(`/v1/users/me/skills/${encodeURIComponent(skillId)}`, {
    method: "DELETE",
  }).then((r) => r.data)
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