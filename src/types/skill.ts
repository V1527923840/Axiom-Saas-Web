/**
 * Skill Plaza — shared types (used by skill-plaza feature + vibe-trading integration).
 *
 * Mirrors the backend response shape from
 * Axiom-Saas-Server/src/skills/dto/skill-response.dto.ts (★ 2026-08-18 unversioned).
 */

// -------- 公开 Skill (DRAFT/PUBLISHED/ARCHIVED) --------
export type SkillStatus = "draft" | "published" | "archived"

export type UploaderType = "platform" | "user_self" | "third_party"

export type MarketplaceStatus = "private" | "pending" | "listed"

export interface Skill {
  id: string
  code: string
  name: string
  description: string
  category: string | null
  tags: string[] | null
  thumbnailUrl: string | null
  uploaderType: UploaderType
  uploaderId: number | null  // ★ NEW: nullable for platform / third_party
  marketplaceStatus: MarketplaceStatus
  status: SkillStatus
  contentHash: string | null
  publishedAt: string | null
  changelog: string | null
  // ★ tools 字段是 jsonb,后端直接吐 SkillToolSchema[]
  tools: SkillToolSchema[]
  createdAt: string
  updatedAt: string
}

export interface SkillToolSchema {
  name: string
  description?: string | null
  parameters?: Record<string, unknown> | null
  tokenEstimate?: number | null
}

// -------- 文件清单 --------
export interface SkillFile {
  relativePath: string
  description: string | null
  tokenEstimate: number | null
}

// -------- 用户绑定 (user_skill_binding) --------
export type BindingSource = "plan" | "admin_assigned" | "user_self"
export type BindingStatus = "enabled" | "disabled"

export interface UserSkillBinding {
  id: string
  skillId: string
  source: BindingSource
  sourceRefId: string | null
  status: BindingStatus
  enabledAt: string
}

// -------- 会话挂载 (session_skill_mount) --------
export type MountOp = "add" | "remove"
export type MountSource = "manual" | "auto_matched"

export interface SessionSkillMountItem {
  skillId: string
  op: MountOp
  source: MountSource
  mountedAt: string
}

// -------- 上传 (Phase 1/2) --------
export type UploadSourceFormat = "md" | "zip"

export interface CreateUploadUrlInput {
  filename: string
  size: number
  sourceFormat: UploadSourceFormat
  hash: string
}

export interface CreateUploadUrlOutput {
  uploadUrl: string
  key: string
  skillId: string
  cdnUrl: string
  expiresAt: number
}

export interface ConfirmSkillContentInput {
  ossKey: string
  hash: string
  sourceFormat: UploadSourceFormat
  // ★ code 现在由后端从 name 自动生成(slug + hash fallback),客户端不传即可。
  // 仍允许显式 override(向后兼容 / 高级用户场景)。
  code?: string
  name: string
  description: string
  changelog?: string
  category?: string
  expectedUpdatedAt?: string  // ★ NEW: ISO 8601
}

export interface ConfirmSkillContentOutput {
  version: number
  skillId: string
  filesCount: number
  toolsCount: number
}

// -------- 个人 Skill 列表 (GET /users/me/skills) --------
// 后端返回 MySkillDto[] — Skill + enabled 字段
export interface MySkill extends Skill {
  enabled: boolean
  /**
   * 仅当 status='archived' 时由后端填充:最近一次 archive 事件的
   * changelog(管理员停用原因)。null 表示 skill 未停用,或停用时
   * 没有填 reason。
   */
  archivedReason?: string | null
}

// -------- 更新审计事件 (GET /skills/:id/updates) --------
export type SkillUpdateEventAction = "update" | "archive" | "restore"
export type SkillUpdateEventActorRole = "self" | "admin" | "super_admin"

export interface SkillUpdateEvent {
  id: string
  action: SkillUpdateEventAction
  actorUserId: number
  actorRole: SkillUpdateEventActorRole
  ossKey: string | null
  oldHash: string | null
  newHash: string | null
  sourceFormat: "md" | "zip" | null
  changelog: string | null
  createdAt: string
}

// -------- 更新场景的 upload-url 响应 (POST /skills/:id/upload-url) --------
export interface UpdateUploadUrlOutput extends CreateUploadUrlOutput {
  updatedAt: string
  actorRole: SkillUpdateEventActorRole
}